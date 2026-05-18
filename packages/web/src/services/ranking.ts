import { getSupabase } from "../lib/supabase-server";

export interface RankingEntry {
  posicao: number;
  valor_total: number;
  ano: number;
  metricas: {
    total_emendas: number;
    valor_empenhado: number;
    valor_liquidado: number;
    valor_pago: number;
    taxa_execucao: number;
  };
  parlamentares: {
    id: string;
    nome: string;
    nome_parlamentar: string;
    partido: string;
    uf: string;
    foto_url: string | null;
    casa_legislativa: string;
  };
}

export interface Parlamentar {
  id: string;
  nome: string;
  nome_parlamentar: string;
  partido: string;
  uf: string;
  foto_url: string | null;
  casa_legislativa: string;
  ativo: boolean;
}

export interface HistoricoEntry {
  ano: number;
  posicao: number;
  valor_total: number;
  metricas: RankingEntry["metricas"];
}

export interface CoberturaStats {
  total_registros_financeiro: number;
  total_parlamentares: number;
  registros_vinculados: number;
  taxa_cobertura: number;
}

const ANOS_VALIDOS = [2023, 2024];

export async function getRanking(
  ano: number,
  page: number,
  perPage = 50
): Promise<{ data: RankingEntry[]; total: number }> {
  if (!ANOS_VALIDOS.includes(ano)) return { data: [], total: 0 };

  const sb = getSupabase();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await sb
    .from("ranking_parlamentar")
    .select(
      `posicao, valor_total, metricas, ano,
       parlamentares!inner(id, nome, nome_parlamentar, partido, uf, foto_url, casa_legislativa)`,
      { count: "exact" }
    )
    .eq("ano", ano)
    .order("posicao")
    .range(from, to);

  if (error) throw error;
  return { data: (data ?? []) as unknown as RankingEntry[], total: count ?? 0 };
}

export async function getParlamentar(id: string): Promise<{
  parlamentar: Parlamentar;
  historico: HistoricoEntry[];
} | null> {
  const sb = getSupabase();

  const [{ data: parl, error: e1 }, { data: hist, error: e2 }] =
    await Promise.all([
      sb
        .from("parlamentares")
        .select("id, nome, nome_parlamentar, partido, uf, foto_url, casa_legislativa, ativo")
        .eq("id", id)
        .single(),
      sb
        .from("ranking_parlamentar")
        .select("ano, posicao, valor_total, metricas")
        .eq("parlamentar_id", id)
        .order("ano", { ascending: false }),
    ]);

  if (e1?.code === "PGRST116") return null;
  if (e1) throw e1;
  if (e2) throw e2;

  return {
    parlamentar: parl as Parlamentar,
    historico: (hist ?? []) as HistoricoEntry[],
  };
}

export async function getCobertura(): Promise<CoberturaStats> {
  const sb = getSupabase();

  const [{ count: totalFin }, { count: totalParl }, { count: matchados }] =
    await Promise.all([
      sb.from("emendas_financeiro").select("*", { count: "exact", head: true }),
      sb.from("parlamentares").select("*", { count: "exact", head: true }),
      sb
        .from("emendas_financeiro")
        .select("*", { count: "exact", head: true })
        .not("parlamentar_id", "is", null),
    ]);

  return {
    total_registros_financeiro: totalFin ?? 0,
    total_parlamentares: totalParl ?? 0,
    registros_vinculados: matchados ?? 0,
    taxa_cobertura:
      totalFin && totalFin > 0
        ? Math.round(((matchados ?? 0) / totalFin) * 100)
        : 0,
  };
}
