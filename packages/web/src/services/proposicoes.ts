import { getSupabase } from "../lib/supabase-server";

export interface ProposicaoAgg {
  deputado_id: number;
  nome: string;
  sigla_partido: string;
  sigla_uf: string;
  url_foto: string | null;
  total: number;
  total_substantivo: number;
  total_pl: number;
  total_pec: number;
  total_req: number;
  por_tipo: Record<string, number> | null;
  por_ano: Record<string, number> | null;
}

export interface ProposicaoItem {
  id: number;
  deputado_id: number;
  sigla_tipo: string;
  numero: number | null;
  ano: number | null;
  ementa: string | null;
  data_apresentacao: string | null;
}

export interface ProposicoesPage {
  data: ProposicaoAgg[];
  total: number;
}

export async function getProposicoesRanking(
  page: number,
  perPage: number,
  filters?: { partido?: string; uf?: string }
): Promise<ProposicoesPage> {
  const sb = getSupabase();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = sb
    .from("cam_proposicoes_agg")
    .select("deputado_id,nome,sigla_partido,sigla_uf,url_foto,total,total_substantivo,total_pl,total_pec,total_req,por_tipo,por_ano", { count: "exact" })
    .order("total_substantivo", { ascending: false })
    .range(from, to);

  if (filters?.partido) query = query.eq("sigla_partido", filters.partido);
  if (filters?.uf) query = query.eq("sigla_uf", filters.uf);

  const { data, error, count } = await query;
  if (error) throw new Error(`getProposicoesRanking: ${error.message}`);
  return { data: (data ?? []) as ProposicaoAgg[], total: count ?? 0 };
}

export async function getProposicoesDeputado(
  deputadoId: number,
  page: number,
  perPage: number,
  filters?: { tipo?: string; ano?: number }
): Promise<{ data: ProposicaoItem[]; total: number }> {
  const sb = getSupabase();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = sb
    .from("cam_proposicoes")
    .select("*", { count: "exact" })
    .eq("deputado_id", deputadoId)
    .order("ano", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (filters?.tipo) query = query.eq("sigla_tipo", filters.tipo);
  if (filters?.ano) query = query.eq("ano", filters.ano);

  const { data, error, count } = await query;
  if (error) throw new Error(`getProposicoesDeputado: ${error.message}`);
  return { data: (data ?? []) as ProposicaoItem[], total: count ?? 0 };
}

export interface ProposicaoDetalhe extends ProposicaoItem {
  autor: {
    deputado_id: number;
    nome: string;
    sigla_partido: string;
    sigla_uf: string;
    url_foto: string | null;
  } | null;
}

export async function getProposicao(id: number): Promise<ProposicaoDetalhe | null> {
  const sb = getSupabase();
  const { data: prop, error } = await sb
    .from("cam_proposicoes")
    .select("id, deputado_id, sigla_tipo, numero, ano, ementa, data_apresentacao")
    .eq("id", id)
    .maybeSingle();

  if (error || !prop) return null;

  const { data: autorRow } = await sb
    .from("cam_proposicoes_agg")
    .select("deputado_id, nome, sigla_partido, sigla_uf, url_foto")
    .eq("deputado_id", (prop as ProposicaoItem).deputado_id)
    .maybeSingle();

  return {
    ...(prop as ProposicaoItem),
    autor: autorRow ? (autorRow as ProposicaoDetalhe["autor"]) : null,
  };
}

export async function getDeputadoProposicaoAgg(deputadoId: number): Promise<ProposicaoAgg | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("cam_proposicoes_agg")
    .select("*")
    .eq("deputado_id", deputadoId)
    .single();
  if (error) return null;
  return data as ProposicaoAgg;
}

export async function getPartidosProposicoes(): Promise<string[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("cam_proposicoes_agg")
    .select("sigla_partido")
    .not("sigla_partido", "is", null)
    .order("sigla_partido");
  const set = new Set((data ?? []).map((r: { sigla_partido: string }) => r.sigla_partido));
  return Array.from(set).sort();
}

export async function getUfsProposicoes(): Promise<string[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("cam_proposicoes_agg")
    .select("sigla_uf")
    .not("sigla_uf", "is", null)
    .order("sigla_uf");
  const set = new Set((data ?? []).map((r: { sigla_uf: string }) => r.sigla_uf));
  return Array.from(set).sort();
}
