import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AgregadoParlamentar, RankingBuildRow } from "./types.js";

export function criarCliente(url: string, key: string): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Agrega emendas_financeiro por (parlamentar_id, ano) via cursor de lotes. */
export async function agregarPorParlamentar(
  sb: SupabaseClient,
  ano: number
): Promise<AgregadoParlamentar[]> {
  const mapa = new Map<string, AgregadoParlamentar>();
  const LOTE = 500;
  let offset = 0;

  while (true) {
    const { data, error } = await sb
      .from("emendas_financeiro")
      .select("parlamentar_id, valor_empenhado, valor_liquidado, valor_pago")
      .eq("ano", ano)
      .not("parlamentar_id", "is", null)
      .range(offset, offset + LOTE - 1);

    if (error) throw new Error(`Erro ao agregar ${ano}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      const pid = row.parlamentar_id as string;
      const existing = mapa.get(pid) ?? {
        parlamentar_id: pid,
        ano,
        total_emendas: 0,
        valor_empenhado: 0,
        valor_liquidado: 0,
        valor_pago: 0,
      };
      existing.total_emendas += 1;
      existing.valor_empenhado += Number(row.valor_empenhado ?? 0);
      existing.valor_liquidado += Number(row.valor_liquidado ?? 0);
      existing.valor_pago += Number(row.valor_pago ?? 0);
      mapa.set(pid, existing);
    }

    if (data.length < LOTE) break;
    offset += LOTE;
  }

  return [...mapa.values()];
}

export async function inserirRankingBuild(
  sb: SupabaseClient,
  rows: RankingBuildRow[]
): Promise<void> {
  const LOTE = 200;
  for (let i = 0; i < rows.length; i += LOTE) {
    const { error } = await sb
      .from("ranking_parlamentar_build")
      .insert(rows.slice(i, i + LOTE));
    if (error) throw new Error(`Erro ao inserir ranking_build: ${error.message}`);
  }
}

export async function inserirSnapshot(
  sb: SupabaseClient,
  buildId: string,
  ano: number,
  dados: unknown
): Promise<void> {
  const { error } = await sb
    .from("snapshots_ranking")
    .insert({ build_em: new Date().toISOString(), ano, dados });
  if (error) throw new Error(`Erro ao inserir snapshot: ${error.message}`);
}

export async function registrarExecucao(
  sb: SupabaseClient,
  status: string,
  detalhes: Record<string, unknown> | object
): Promise<string> {
  const { data, error } = await sb
    .from("execucoes_pipeline")
    .insert({ job_nome: "job_ranking_build", status, detalhes })
    .select("id")
    .single();
  if (error) throw new Error(`Erro ao registrar execução: ${error.message}`);
  return data.id;
}

export async function finalizarExecucao(
  sb: SupabaseClient,
  id: string,
  status: string,
  detalhes: Record<string, unknown> | object
): Promise<void> {
  await sb
    .from("execucoes_pipeline")
    .update({ status, detalhes, finalizado_em: new Date().toISOString() })
    .eq("id", id);
}
