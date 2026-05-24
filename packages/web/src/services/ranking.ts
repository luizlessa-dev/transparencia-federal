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
  ano_min: number | null;
  ano_max: number | null;
}

const ANOS_VALIDOS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

/**
 * Lista todos os parlamentares ativos com dados básicos para listagem/busca.
 * Inclui paginação manual (Supabase tem limite de 1000 por query).
 */
export async function listarParlamentares(): Promise<Parlamentar[]> {
  const sb = getSupabase();
  const PAGE = 1000;
  const out: Parlamentar[] = [];

  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await sb
      .from("parlamentares")
      .select("id, nome, nome_parlamentar, partido, uf, foto_url, casa_legislativa, ativo")
      .eq("ativo", true)
      .order("nome_parlamentar", { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) throw error;
    const rows = (data ?? []) as Parlamentar[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

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

  const [
    { count: totalEmendas },
    { count: totalParl },
    { count: comAutor },
    { data: anoMinRow },
    { data: anoMaxRow },
  ] = await Promise.all([
    sb.from("emendas_completas").select("*", { count: "exact", head: true }),
    sb.from("parlamentares").select("*", { count: "exact", head: true }),
    sb
      .from("emendas_completas")
      .select("*", { count: "exact", head: true })
      .not("autor_nome", "is", null),
    sb.from("emendas_completas").select("ano").order("ano", { ascending: true }).limit(1).maybeSingle(),
    sb.from("emendas_completas").select("ano").order("ano", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return {
    total_registros_financeiro: totalEmendas ?? 0,
    total_parlamentares: totalParl ?? 0,
    registros_vinculados: comAutor ?? 0,
    taxa_cobertura:
      totalEmendas && totalEmendas > 0
        ? Math.round(((comAutor ?? 0) / totalEmendas) * 100)
        : 0,
    ano_min: (anoMinRow as { ano: number } | null)?.ano ?? null,
    ano_max: (anoMaxRow as { ano: number } | null)?.ano ?? null,
  };
}

/**
 * Estatísticas agregadas do ranking do ano (totais + máximo).
 * Lê toda a tabela do ano (594 linhas cabe em 1 query).
 */
export interface RankingTotais {
  total_empenhado: number;
  total_pago: number;
  total_emendas: number;
  parlamentares: number;
  media: number;
  top_empenhado: number;
}

export async function getRankingTotais(ano: number): Promise<RankingTotais | null> {
  if (!ANOS_VALIDOS.includes(ano)) return null;
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ranking_parlamentar")
    .select("valor_total, metricas")
    .eq("ano", ano)
    .order("valor_total", { ascending: false })
    .limit(1000);
  if (error || !data || data.length === 0) return null;

  let totalEmp = 0;
  let totalPago = 0;
  let totalEmendas = 0;
  for (const r of data as { valor_total: number; metricas: { valor_pago?: number; total_emendas?: number } }[]) {
    totalEmp += Number(r.valor_total) || 0;
    totalPago += Number(r.metricas?.valor_pago) || 0;
    totalEmendas += Number(r.metricas?.total_emendas) || 0;
  }
  const parlamentares = data.length;
  return {
    total_empenhado: totalEmp,
    total_pago: totalPago,
    total_emendas: totalEmendas,
    parlamentares,
    media: parlamentares > 0 ? totalEmp / parlamentares : 0,
    top_empenhado: Number((data[0] as { valor_total: number }).valor_total) || 0,
  };
}

/**
 * Pega top N parlamentares por valor empenhado no ano informado.
 * Tenta o ano pedido; se vier vazio, faz fallback para o ano anterior.
 */
export async function getTopParlamentares(
  ano: number,
  limit = 8
): Promise<{ ano: number; data: RankingEntry[] }> {
  const sb = getSupabase();

  async function fetchAno(a: number) {
    const { data } = await sb
      .from("ranking_parlamentar")
      .select(
        `posicao, valor_total, metricas, ano,
         parlamentares!inner(id, nome, nome_parlamentar, partido, uf, foto_url, casa_legislativa)`
      )
      .eq("ano", a)
      .order("posicao")
      .range(0, limit - 1);
    return (data ?? []) as unknown as RankingEntry[];
  }

  let dados = await fetchAno(ano);
  let anoFinal = ano;
  if (dados.length === 0 && ano > 2015) {
    anoFinal = ano - 1;
    dados = await fetchAno(anoFinal);
  }
  return { ano: anoFinal, data: dados };
}
