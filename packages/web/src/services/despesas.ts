import { getSupabase } from "../lib/supabase-server";

export interface DespesaRankingEntry {
  posicao: number;
  total_liquido: number;
  total_documentos: number;
  por_categoria: Record<string, number>;
  ano: number;
  deputados_brutas: {
    nome: string;
    sigla_partido: string | null;
    sigla_uf: string | null;
  };
  deputado_id_externo: string;
}

export interface DespesaDeputadoDetalhe {
  deputado_id_externo: string;
  nome: string;
  sigla_partido: string | null;
  sigla_uf: string | null;
  historico: {
    ano: number;
    posicao: number;
    total_liquido: number;
    total_documentos: number;
    por_categoria: Record<string, number>;
  }[];
}

const ANOS_VALIDOS = [2023, 2024, 2025];

export async function getDespesasRanking(
  ano: number,
  page: number,
  perPage = 50
): Promise<{ data: DespesaRankingEntry[]; total: number }> {
  if (!ANOS_VALIDOS.includes(ano)) return { data: [], total: 0 };

  const sb = getSupabase();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await sb
    .from("ceaps_ranking")
    .select(
      `posicao, total_liquido, total_documentos, por_categoria, ano, deputado_id_externo,
       deputados_brutas!inner(nome, sigla_partido, sigla_uf)`,
      { count: "exact" }
    )
    .eq("ano", ano)
    .order("posicao")
    .range(from, to);

  if (error) throw error;
  return { data: (data ?? []) as unknown as DespesaRankingEntry[], total: count ?? 0 };
}

export async function getDespesaDeputado(
  id: string
): Promise<DespesaDeputadoDetalhe | null> {
  const sb = getSupabase();

  const [{ data: dep, error: e1 }, { data: hist, error: e2 }] = await Promise.all([
    sb
      .from("deputados_brutas")
      .select("id_externo, nome, sigla_partido, sigla_uf")
      .eq("id_externo", id)
      .single(),
    sb
      .from("ceaps_ranking")
      .select("ano, posicao, total_liquido, total_documentos, por_categoria")
      .eq("deputado_id_externo", id)
      .order("ano", { ascending: false }),
  ]);

  if (e1?.code === "PGRST116") return null;
  if (e1) throw e1;
  if (e2) throw e2;
  if (!dep) return null;

  return {
    deputado_id_externo: dep.id_externo,
    nome: dep.nome,
    sigla_partido: dep.sigla_partido,
    sigla_uf: dep.sigla_uf,
    historico: (hist ?? []) as DespesaDeputadoDetalhe["historico"],
  };
}
