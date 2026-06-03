/**
 * Data Access Layer (DAL) — ponto ÚNICO de imposição do paywall.
 *
 * Princípio (Passo 0): o público recebe a conclusão/agregado (isca SEO); o pago
 * recebe a evidência granular (linha-a-linha, nomes, cruzamentos). Toda leitura
 * de dado sensível deve passar por uma função daqui, que recebe o `Viewer` e
 * aplica o corte ANTES de devolver — assim "esquecer de gatear" numa página vira
 * impossível: a página não consegue obter a evidência sem informar o plano.
 *
 * `server-only` garante erro de build se algo aqui for importado num client.
 */
import "server-only";
import { getUser, hasPaidAccess, getPlano } from "./supabase-auth";
import { getSupabase } from "./supabase-server";

export type Plano = "free" | "individual" | "institucional";

export interface Viewer {
  userId: string | null;
  /** logado em qualquer plano — libera conteúdo de cadastro grátis */
  liberado: boolean;
  /** plano pago (individual|institucional) — libera evidência granular */
  pago: boolean;
}

/**
 * Identidade + nível de acesso do visitante. Nunca relança erro (degrada para
 * anônimo) — uma falha de auth não deve derrubar uma página pública.
 */
export async function getViewer(): Promise<Viewer> {
  const user = await getUser().catch(() => null);
  const pago = user ? await hasPaidAccess(user.id).catch(() => false) : false;
  return { userId: user?.id ?? null, liberado: user != null, pago };
}

// ── TSE: receitas e bens (dossiê / perfil) ─────────────────────────────────
// Agregado por ano é público (isca); a lista de doadores e o detalhe de bens
// são evidência paga.

export interface DoadorTop {
  nome: string;
  cpf_cnpj: string;
  total: number;
}

export interface ReceitaDossie {
  ano_eleicao: number;
  sq_candidato: string;
  sg_partido: string;
  sg_uf: string;
  ds_cargo: string;
  total_receitas: number;
  posicao: number | null;
  posicao_cargo: number | null;
  /** quantos top-doadores existem — sempre presente (teaser/contagem) */
  n_doadores: number;
  /** nomes e valores dos doadores — só com plano pago; null caso contrário */
  top_doadores: DoadorTop[] | null;
}

export async function getReceitasDossie(
  cpf: string | null,
  viewer: Viewer,
): Promise<ReceitaDossie[]> {
  if (!cpf) return [];
  const sb = getSupabase();
  const { data, error } = await sb
    .from("tse_candidatos_receitas_agg")
    .select(
      "ano_eleicao,sq_candidato,sg_partido,sg_uf,ds_cargo,total_receitas,posicao,posicao_cargo,top_doadores",
    )
    .eq("nr_cpf_candidato", cpf.replace(/\D/g, ""))
    .order("ano_eleicao", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => {
    const doadores = (r.top_doadores ?? []) as DoadorTop[];
    return {
      ano_eleicao: r.ano_eleicao,
      sq_candidato: r.sq_candidato,
      sg_partido: r.sg_partido,
      sg_uf: r.sg_uf,
      ds_cargo: r.ds_cargo,
      total_receitas: r.total_receitas,
      posicao: r.posicao,
      posicao_cargo: r.posicao_cargo,
      n_doadores: doadores.length,
      // corte server-side: a lista só entra no payload quando há plano pago.
      top_doadores: viewer.pago ? doadores.slice(0, 5) : null,
    };
  });
}

export interface BensDossie {
  /** anos com bens declarados — teaser */
  anosComBens: number;
  /** maior patrimônio declarado entre os anos — teaser */
  maiorTotal: number;
  /** detalhe por ano — só com plano pago; null caso contrário */
  detalhe: { ano: number; quantidade: number; valor: number }[] | null;
}

export async function getBensDossie(cpf: string | null, viewer: Viewer): Promise<BensDossie> {
  const vazio: BensDossie = { anosComBens: 0, maiorTotal: 0, detalhe: viewer.pago ? [] : null };
  if (!cpf) return vazio;
  const sb = getSupabase();
  // sq_candidato em receitas tem cobertura igual à de bens
  const { data: recs } = await sb
    .from("tse_candidatos_receitas_agg")
    .select("sq_candidato,ano_eleicao")
    .eq("nr_cpf_candidato", cpf.replace(/\D/g, ""));
  const result: { ano: number; quantidade: number; valor: number }[] = [];
  for (const r of recs ?? []) {
    const { data: bens } = await sb
      .from("tse_bens_candidatos")
      .select("vr_bem")
      .eq("sq_candidato", r.sq_candidato);
    if (bens && bens.length > 0) {
      const total = bens.reduce((s, b: { vr_bem: number | null }) => s + (b.vr_bem ?? 0), 0);
      result.push({ ano: r.ano_eleicao, quantidade: bens.length, valor: total });
    }
  }
  result.sort((a, b) => b.ano - a.ano);
  return {
    anosComBens: result.length,
    maiorTotal: result.reduce((m, b) => Math.max(m, b.valor), 0),
    // corte server-side: o detalhe só entra no payload quando há plano pago.
    detalhe: viewer.pago ? result : null,
  };
}

// ── Quota de IA (/api/ask) ─────────────────────────────────────────────────

/** Quotas diárias por plano (-1 = ilimitado). */
export const ASK_QUOTA: Record<Plano, number> = {
  free: 5,
  individual: 50,
  institucional: -1,
};

export interface QuotaResult {
  allowed: boolean;
  count: number;
  limit: number;
  plano: Plano;
}

/**
 * Verifica e incrementa atomicamente a quota diária de IA do usuário.
 * Retorna `allowed: false` (com HTTP 429) se o limite foi atingido.
 * Para plano institucional (limit = -1) retorna always allowed sem tocar o DB.
 */
export async function checkAskQuota(userId: string): Promise<QuotaResult> {
  const plano = await getPlano(userId);
  const limit = ASK_QUOTA[plano];

  // Institucional: sem limite, não precisa tocar o banco.
  if (limit === -1) {
    return { allowed: true, count: 0, limit: -1, plano };
  }

  const sb = getSupabase();
  const { data, error } = await sb.rpc("ask_quota_check_increment", {
    p_user_id: userId,
    p_limit: limit,
  });

  if (error || !data) {
    // Falha silenciosa: deixa passar (não bloqueia por falha de contagem).
    return { allowed: true, count: 0, limit, plano };
  }

  const row = (data as { count: number; allowed: boolean }[])[0];
  return {
    allowed: row?.allowed ?? true,
    count: row?.count ?? 0,
    limit,
    plano,
  };
}
