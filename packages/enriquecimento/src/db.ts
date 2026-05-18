import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { EmendaBruta, EmendaFinanceiroInsert, ParlamentarLookup } from "./types.js";
import { normalizarNome } from "./normalizers.js";

export function criarCliente(url: string, key: string): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function carregarParlamentares(sb: SupabaseClient): Promise<ParlamentarLookup[]> {
  const { data, error } = await sb
    .from("parlamentares")
    .select("id, nome, nome_parlamentar");
  if (error) throw new Error(`Erro ao carregar parlamentares: ${error.message}`);
  return (data ?? []).map((p: any) => ({
    id: p.id,
    nome_normalizado: normalizarNome(p.nome_parlamentar ?? p.nome),
  }));
}

export async function buscarEmendasBrutas(
  sb: SupabaseClient,
  ano: number,
  offset: number,
  limit: number
): Promise<EmendaBruta[]> {
  const { data, error } = await sb
    .from("emendas_brutas")
    .select("id, ano, id_externo, dados")
    .eq("ano", ano)
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`Erro ao buscar emendas_brutas: ${error.message}`);
  return (data ?? []) as EmendaBruta[];
}

export async function upsertEmendaFinanceiro(
  sb: SupabaseClient,
  lote: EmendaFinanceiroInsert[]
): Promise<void> {
  if (!lote.length) return;
  const { error } = await sb
    .from("emendas_financeiro")
    .upsert(lote, { onConflict: "ano,id_externo" });
  if (error) throw new Error(`Erro no upsert emendas_financeiro: ${error.message}`);
}

export async function registrarExecucao(
  sb: SupabaseClient,
  jobNome: string,
  status: string,
  detalhes: Record<string, unknown>
): Promise<string> {
  const { data, error } = await sb
    .from("execucoes_pipeline")
    .insert({ job_nome: jobNome, status, detalhes })
    .select("id")
    .single();
  if (error) throw new Error(`Erro ao registrar execução: ${error.message}`);
  return data.id;
}

export async function finalizarExecucao(
  sb: SupabaseClient,
  id: string,
  status: string,
  detalhes: Record<string, unknown>
): Promise<void> {
  await sb
    .from("execucoes_pipeline")
    .update({ status, detalhes, finalizado_em: new Date().toISOString() })
    .eq("id", id);
}
