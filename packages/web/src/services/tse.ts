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
