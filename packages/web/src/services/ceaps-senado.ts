import { getSupabase } from "../lib/supabase-server";

export const ANOS_CEAPS_SENADO = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019];

export interface SenadorRanking {
  senador: string;
  senador_normalizado: string;
  ano: number;
  total_reembolsado: number;
  total_documentos: number;
  posicao: number | null;
  por_tipo: Record<string, number> | null;
  top_fornecedores: TopFornecedor[] | null;
}

export interface TopFornecedor {
  cnpj_cpf: string;
  nome: string;
  total: number;
}

export interface CeapsSenadorPage {
  data: SenadorRanking[];
  total: number;
}

export async function getCeapsSenadorListing(
  ano: number,
  page: number,
  perPage: number
): Promise<CeapsSenadorPage> {
  const sb = getSupabase();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await sb
    .from("ceaps_senado_ranking")
    .select("senador,senador_normalizado,ano,total_reembolsado,total_documentos,posicao", { count: "exact" })
    .eq("ano", ano)
    .order("total_reembolsado", { ascending: false })
    .range(from, to);

  if (error) throw new Error(`getCeapsSenadorListing: ${error.message}`);
  return { data: (data ?? []) as SenadorRanking[], total: count ?? 0 };
}

export async function getCeapsSenador(
  senadorNormalizado: string,
  ano: number
): Promise<SenadorRanking | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ceaps_senado_ranking")
    .select("*")
    .eq("senador_normalizado", senadorNormalizado)
    .eq("ano", ano)
    .single();

  if (error) return null;
  return data as SenadorRanking;
}

export async function getCeapsSenadorHistorico(
  senadorNormalizado: string
): Promise<SenadorRanking[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ceaps_senado_ranking")
    .select("*")
    .eq("senador_normalizado", senadorNormalizado)
    .order("ano", { ascending: false });

  if (error) return [];
  return (data ?? []) as SenadorRanking[];
}

export async function getCeapsSenadorStats(ano: number): Promise<{
  total_senadores: number;
  total_reembolsado: number;
  media_reembolsado: number;
  tipo_mais_comum: string;
} | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from("ceaps_senado_ranking")
    .select("total_reembolsado,por_tipo")
    .eq("ano", ano);

  if (!data || data.length === 0) return null;

  type Row = { total_reembolsado: number; por_tipo: Record<string, number> | null };
  const rows = data as Row[];
  const total_reembolsado = rows.reduce((s, r) => s + Number(r.total_reembolsado), 0);
  const total_senadores = rows.length;
  const media_reembolsado = total_reembolsado / total_senadores;

  const porTipo: Record<string, number> = {};
  rows.forEach(r => {
    Object.entries(r.por_tipo ?? {}).forEach(([tipo, val]) => {
      porTipo[tipo] = (porTipo[tipo] ?? 0) + Number(val);
    });
  });
  const tipo_mais_comum = Object.entries(porTipo).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "";

  return { total_senadores, total_reembolsado, media_reembolsado, tipo_mais_comum };
}
