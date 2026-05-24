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

export interface CeapsSenadoNota {
  id: string;
  cod_documento: string;
  ano: number;
  mes: number | null;
  senador: string;
  tipo_despesa: string | null;
  cnpj_cpf: string | null;
  fornecedor: string | null;
  documento: string | null;
  data: string | null;
  detalhamento: string | null;
  valor_reembolsado: number;
}

/**
 * Lista todas as notas fiscais (CEAPS Senado) de um senador,
 * paginando internamente para passar do limite de 1000 do Supabase.
 */
export async function getCeapsSenadoNotas(
  senadorNormalizado: string,
  limit = 3000
): Promise<CeapsSenadoNota[]> {
  const sb = getSupabase();
  const PAGE = 1000;
  const out: CeapsSenadoNota[] = [];

  for (let offset = 0; offset < limit; offset += PAGE) {
    const to = Math.min(offset + PAGE - 1, limit - 1);
    const { data, error } = await sb
      .from("ceaps_senado_brutas")
      .select(
        "id, cod_documento, ano, mes, senador, tipo_despesa, cnpj_cpf, fornecedor, documento, data, detalhamento, valor_reembolsado"
      )
      .eq("senador_normalizado", senadorNormalizado)
      .order("data", { ascending: false, nullsFirst: false })
      .order("valor_reembolsado", { ascending: false })
      .range(offset, to);
    if (error) throw error;
    const rows = (data ?? []) as CeapsSenadoNota[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export interface SenadorRankingEnriquecido extends SenadorRanking {
  sigla_partido: string | null;
  sigla_uf: string | null;
  foto_url: string | null;
}

/**
 * Lista paginada de senadores ranqueados, enriquecida com partido/UF/foto
 * vindos da tabela `parlamentares` (casa_legislativa=senado) via JOIN
 * por nome_parlamentar normalizado.
 *
 * Filtros aplicados em memória (no máx 100 senadores por ano — barato).
 */
export async function getCeapsSenadorListing(
  ano: number,
  page: number,
  perPage: number,
  filters?: { search?: string; partido?: string; uf?: string }
): Promise<{ data: SenadorRankingEnriquecido[]; total: number }> {
  const sb = getSupabase();

  // 1. Pega TODOS os senadores ranqueados do ano (até 200 — cabe folgado).
  const { data: rankRows, error: e1 } = await sb
    .from("ceaps_senado_ranking")
    .select("senador,senador_normalizado,ano,total_reembolsado,total_documentos,posicao")
    .eq("ano", ano)
    .order("total_reembolsado", { ascending: false })
    .limit(200);
  if (e1) throw new Error(`getCeapsSenadorListing: ${e1.message}`);

  const ranking = (rankRows ?? []) as SenadorRanking[];
  if (ranking.length === 0) return { data: [], total: 0 };

  // 2. Pega todos os senadores ativos pra enriquecer com partido/UF/foto.
  const { data: parlRows } = await sb
    .from("parlamentares")
    .select("nome, nome_parlamentar, partido, uf, foto_url")
    .eq("casa_legislativa", "senado");

  type ParlRow = { nome: string | null; nome_parlamentar: string | null; partido: string | null; uf: string | null; foto_url: string | null };
  const parlamentares = (parlRows ?? []) as ParlRow[];

  // Mapa por nome_parlamentar normalizado (UPPER, sem acento) → dados
  function norm(s: string | null | undefined): string {
    return (s ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .trim();
  }
  const mapaPorNorm = new Map<string, ParlRow>();
  for (const p of parlamentares) {
    if (p.nome_parlamentar) mapaPorNorm.set(norm(p.nome_parlamentar), p);
    if (p.nome) mapaPorNorm.set(norm(p.nome), p);
  }

  // 3. Enriquece + filtra
  const enriquecido: SenadorRankingEnriquecido[] = ranking.map((r) => {
    const match = mapaPorNorm.get(norm(r.senador_normalizado)) ?? mapaPorNorm.get(norm(r.senador));
    return {
      ...r,
      sigla_partido: match?.partido ?? null,
      sigla_uf: match?.uf ?? null,
      foto_url: match?.foto_url ?? null,
    };
  });

  const qSearch = filters?.search?.trim().toUpperCase();
  const filtrado = enriquecido.filter((r) => {
    if (filters?.partido && r.sigla_partido !== filters.partido) return false;
    if (filters?.uf && r.sigla_uf !== filters.uf) return false;
    if (qSearch && !norm(r.senador).includes(norm(qSearch))) return false;
    return true;
  });

  const total = filtrado.length;
  const from = (page - 1) * perPage;
  return { data: filtrado.slice(from, from + perPage), total };
}

/**
 * Distinct de partidos/UFs presentes no Senado em geral
 * (lê de parlamentares onde casa_legislativa = senado).
 */
export async function getCeapsSenadoFiltros(): Promise<{ partidos: string[]; ufs: string[] }> {
  const sb = getSupabase();
  const { data } = await sb
    .from("parlamentares")
    .select("partido, uf")
    .eq("casa_legislativa", "senado");

  const partidos = new Set<string>();
  const ufs = new Set<string>();
  for (const r of (data ?? []) as Array<{ partido: string | null; uf: string | null }>) {
    if (r.partido) partidos.add(r.partido);
    if (r.uf) ufs.add(r.uf);
  }
  return {
    partidos: Array.from(partidos).sort(),
    ufs: Array.from(ufs).sort(),
  };
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
