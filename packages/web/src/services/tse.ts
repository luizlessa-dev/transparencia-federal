import { getSupabase } from "../lib/supabase-server";

export const ANOS_ELEITORAIS = [2022, 2018];

export interface CandidatoReceita {
  sq_candidato: string;
  ano_eleicao: number;
  nm_candidato: string;
  cd_cargo: number;
  ds_cargo: string;
  sg_uf: string;
  sg_partido: string | null;
  nm_partido: string | null;
  total_receitas: number;
  total_registros: number;
  fefc: number;
  fundo_partidario: number;
  recursos_proprios: number;
  outros_recursos: number;
  posicao: number | null;
  posicao_cargo: number | null;
  top_doadores: TopDoador[] | null;
  por_origem: Record<string, number> | null;
}

export interface TopDoador {
  cpf_cnpj: string;
  nome: string;
  total: number;
}

export interface TsePage {
  data: CandidatoReceita[];
  total: number;
}

export async function getTseCandidatosListing(
  ano: number,
  page: number,
  perPage: number,
  filters?: {
    cargo?: string; // "deputado" | "senador" | ""
    uf?: string;
    partido?: string;
  }
): Promise<TsePage> {
  const sb = getSupabase();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = sb
    .from("tse_candidatos_receitas_agg")
    .select(
      "sq_candidato,ano_eleicao,nm_candidato,cd_cargo,ds_cargo,sg_uf,sg_partido,nm_partido,total_receitas,total_registros,fefc,fundo_partidario,recursos_proprios,outros_recursos,posicao,posicao_cargo",
      { count: "exact" }
    )
    .eq("ano_eleicao", ano)
    .order("total_receitas", { ascending: false })
    .range(from, to);

  if (filters?.cargo === "deputado") query = query.eq("cd_cargo", 6);
  else if (filters?.cargo === "senador") query = query.eq("cd_cargo", 5);
  if (filters?.uf) query = query.eq("sg_uf", filters.uf);
  if (filters?.partido) query = query.ilike("sg_partido", filters.partido);

  const { data, error, count } = await query;
  if (error) throw new Error(`getTseCandidatosListing: ${error.message}`);

  return {
    data: (data ?? []) as CandidatoReceita[],
    total: count ?? 0,
  };
}

export async function getTseCandidato(sqCandidato: string, ano: number): Promise<CandidatoReceita | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("tse_candidatos_receitas_agg")
    .select("*")
    .eq("sq_candidato", sqCandidato)
    .eq("ano_eleicao", ano)
    .single();

  if (error) return null;
  return data as CandidatoReceita;
}

export async function getTseCandidatoHistorico(sqCandidato: string): Promise<CandidatoReceita[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("tse_candidatos_receitas_agg")
    .select("*")
    .eq("sq_candidato", sqCandidato)
    .order("ano_eleicao", { ascending: false });

  if (error) return [];
  return (data ?? []) as CandidatoReceita[];
}

/** Top doadores da eleição mais recente do candidato, casado por CPF. */
export async function getTopDoadoresPorCpf(
  cpf: string | null | undefined
): Promise<{ ano: number; doadores: TopDoador[] } | null> {
  if (!cpf) return null;
  const sb = getSupabase();
  const { data, error } = await sb
    .from("tse_candidatos_receitas_agg")
    .select("ano_eleicao, top_doadores")
    .eq("nr_cpf_candidato", cpf.replace(/\D/g, ""))
    .order("ano_eleicao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const doadores = Array.isArray(data.top_doadores) ? (data.top_doadores as TopDoador[]) : [];
  return { ano: data.ano_eleicao as number, doadores };
}

// ─── G2: Declaração de Bens ──────────────────────────────────────────────────

export interface CandidatoBens {
  sq_candidato: string;
  ano_eleicao: number;
  nm_candidato: string;
  cd_cargo: number;
  ds_cargo: string;
  sg_uf: string;
  sg_partido: string | null;
  total_patrimonio: number;
  total_bens: number;
}

export interface BensPage {
  data: CandidatoBens[];
  total: number;
}

export async function getTseBensRanking(
  ano: number,
  page: number,
  perPage: number,
  filters?: { cargo?: string; uf?: string; partido?: string }
): Promise<BensPage> {
  const sb = getSupabase();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data: bens, error: errBens, count } = await sb
    .from("tse_bens_agg")
    .select("sq_candidato, ano_eleicao, total_patrimonio, total_bens", { count: "exact" })
    .eq("ano_eleicao", ano)
    .order("total_patrimonio", { ascending: false })
    .range(from, to);

  if (errBens) throw new Error(`getTseBensRanking: ${errBens.message}`);
  if (!bens || bens.length === 0) return { data: [], total: count ?? 0 };

  type BensRow = { sq_candidato: string; ano_eleicao: number; total_patrimonio: number; total_bens: number };
  const sqList = (bens as BensRow[]).map((b) => b.sq_candidato);

  const { data: cands } = await sb
    .from("tse_candidatos_receitas_agg")
    .select("sq_candidato, nm_candidato, cd_cargo, ds_cargo, sg_uf, sg_partido")
    .eq("ano_eleicao", ano)
    .in("sq_candidato", sqList);

  type CandRow = {
    sq_candidato: string;
    nm_candidato: string;
    cd_cargo: number;
    ds_cargo: string;
    sg_uf: string;
    sg_partido: string | null;
  };
  const candMap = new Map(
    (cands ?? []).map((c: CandRow) => [c.sq_candidato, c])
  );

  let result = (bens as BensRow[]).map((b) => {
    const c = candMap.get(b.sq_candidato);
    return {
      sq_candidato: b.sq_candidato,
      ano_eleicao: b.ano_eleicao,
      nm_candidato: c?.nm_candidato ?? b.sq_candidato,
      cd_cargo: c?.cd_cargo ?? 0,
      ds_cargo: c?.ds_cargo ?? "",
      sg_uf: c?.sg_uf ?? "",
      sg_partido: c?.sg_partido ?? null,
      total_patrimonio: Number(b.total_patrimonio),
      total_bens: b.total_bens,
    } as CandidatoBens;
  });

  if (filters?.cargo === "deputado") result = result.filter((r) => r.cd_cargo === 6);
  else if (filters?.cargo === "senador") result = result.filter((r) => r.cd_cargo === 5);
  if (filters?.uf) result = result.filter((r) => r.sg_uf === filters.uf);
  if (filters?.partido) result = result.filter((r) => r.sg_partido === filters.partido);

  return { data: result, total: count ?? 0 };
}

export async function getTseBensDetalhe(
  sqCandidato: string,
  ano: number
): Promise<Array<{ nr_ordem: number; ds_tipo: string; ds_bem: string; vr_bem: number }>> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("tse_bens_candidatos")
    .select("nr_ordem, ds_tipo, ds_bem, vr_bem")
    .eq("sq_candidato", sqCandidato)
    .eq("ano_eleicao", ano)
    .order("vr_bem", { ascending: false });
  if (error) return [];
  return (data ?? []) as Array<{ nr_ordem: number; ds_tipo: string; ds_bem: string; vr_bem: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function getTseStats(ano: number): Promise<{
  total_candidatos: number;
  total_arrecadado: number;
  media_arrecadado: number;
  top_partido: string;
  maior_arrecadador: string;
  maior_valor: number;
} | null> {
  const sb = getSupabase();

  // Totals
  const { data: tots } = await sb
    .from("tse_candidatos_receitas_agg")
    .select("total_receitas,sg_partido,nm_candidato")
    .eq("ano_eleicao", ano);

  if (!tots || tots.length === 0) return null;

  type TotRow = { total_receitas: number; sg_partido: string | null; nm_candidato: string };
  const rows = tots as TotRow[];
  const total_arrecadado = rows.reduce((s, r) => s + Number(r.total_receitas), 0);
  const total_candidatos = rows.length;
  const media_arrecadado = total_arrecadado / total_candidatos;

  // Top partido por arrecadação
  const porPartido: Record<string, number> = {};
  rows.forEach(r => {
    const p = r.sg_partido ?? "Sem partido";
    porPartido[p] = (porPartido[p] ?? 0) + Number(r.total_receitas);
  });
  const top_partido = Object.entries(porPartido).sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] ?? "";

  // Maior arrecadador
  const top = rows.sort((a, b) => Number(b.total_receitas) - Number(a.total_receitas))[0];

  return {
    total_candidatos,
    total_arrecadado,
    media_arrecadado,
    top_partido,
    maior_arrecadador: top?.nm_candidato ?? "",
    maior_valor: Number(top?.total_receitas ?? 0),
  };
}
