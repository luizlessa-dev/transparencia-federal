import { getSupabase } from "~/lib/supabase-server";
import { normalizarNome } from "~/lib/texto";

export interface FolhaResumo {
  total: number;
  comSalario: number;
  somaSalarios: number;
  maiorSalario: number;
  tipoSalario: "exato" | "estimado";
  topFuncionarios: { nome: string; cargo: string | null; valor: number | null }[];
}

/**
 * Resumo da folha de gabinete de um parlamentar.
 * Câmara: join limpo por parlamentar_id_externo = id_camara (salário estimado).
 * Senado: match por nome normalizado (salário exato).
 */
export async function getFolhaGabinete(opts: {
  idCamara?: number | null;
  senadorNome?: string | null;
}): Promise<FolhaResumo | null> {
  const sb = getSupabase();

  type Row = {
    parlamentar_nome: string | null;
    secretario_nome: string | null;
    cargo: string | null;
    valor_remuneracao: number | null;
  };

  let rows: Row[] = [];
  if (opts.idCamara) {
    const { data, error } = await sb
      .from("folha_gabinete_atual")
      .select("parlamentar_nome, secretario_nome, cargo, valor_remuneracao")
      .eq("casa", "camara")
      .eq("parlamentar_id_externo", String(opts.idCamara))
      .limit(200);
    if (error || !data) return null;
    rows = data as Row[];
  } else if (opts.senadorNome) {
    const { data, error } = await sb
      .from("folha_gabinete_atual")
      .select("parlamentar_nome, secretario_nome, cargo, valor_remuneracao")
      .eq("casa", "senado")
      .ilike("parlamentar_nome", opts.senadorNome)
      .limit(200);
    if (error || !data) return null;
    // confirma por nome normalizado (ilike é só case-insensitive)
    const alvo = normalizarNome(opts.senadorNome);
    rows = (data as Row[]).filter((r) => normalizarNome(r.parlamentar_nome) === alvo);
  } else {
    return null;
  }

  if (rows.length === 0) return null;

  const comValor = rows.filter((r) => r.valor_remuneracao != null);
  const soma = comValor.reduce((s, r) => s + (Number(r.valor_remuneracao) || 0), 0);
  const maior = comValor.reduce((m, r) => Math.max(m, Number(r.valor_remuneracao) || 0), 0);
  const top = [...rows]
    .sort((a, b) => (Number(b.valor_remuneracao) || 0) - (Number(a.valor_remuneracao) || 0))
    .slice(0, 5)
    .map((r) => ({ nome: r.secretario_nome ?? "", cargo: r.cargo, valor: r.valor_remuneracao }));

  return {
    total: rows.length,
    comSalario: comValor.length,
    somaSalarios: soma,
    maiorSalario: maior,
    tipoSalario: opts.idCamara ? "estimado" : "exato",
    topFuncionarios: top,
  };
}

export interface DoadorLead {
  secretario_nome: string;
  doador_nome: string;
  valor_doado: number | null;
  ano_eleicao: number | null;
}
export interface NepotismoLead {
  secretario_nome: string;
  sobrenome: string;
  parlamentar_homonimo_nome: string | null;
}

/** Leads de investigação do gabinete (Câmara). PAGO. */
export async function getFolhaLeads(idCamara: number | null | undefined): Promise<{
  doadores: DoadorLead[];
  nepotismo: NepotismoLead[];
} | null> {
  if (!idCamara) return null;
  const sb = getSupabase();
  const id = String(idCamara);

  const [{ data: dd }, { data: nn }] = await Promise.all([
    sb
      .from("folha_doador_leads")
      .select("secretario_nome, doador_nome, valor_doado, ano_eleicao")
      .eq("parlamentar_id_externo", id)
      .order("valor_doado", { ascending: false }),
    sb
      .from("folha_nepotismo_leads")
      .select("secretario_nome, sobrenome, parlamentar_homonimo_nome")
      .eq("gabinete_parlamentar_id", id)
      .limit(50),
  ]);

  const doadores = (dd ?? []) as DoadorLead[];
  const nepotismo = (nn ?? []) as NepotismoLead[];
  if (doadores.length === 0 && nepotismo.length === 0) return null;
  return { doadores, nepotismo };
}
