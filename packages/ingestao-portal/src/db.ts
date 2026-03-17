/**
 * Acesso ao banco (Supabase) para a camada de ingestão.
 * Tabelas: execucoes_pipeline, execucoes_pipeline_etapas, emendas_brutas, cobertura_dados.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { EmendaBrutaInsert } from "./types.js";
import type { StatusCobertura, StatusExecucao } from "./types.js";

export function createSupabaseClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export interface InserirExecucaoParams {
  job_nome: string;
  status: StatusExecucao;
  detalhes?: Record<string, unknown>;
}

export async function inserirExecucao(
  supabase: SupabaseClient,
  params: InserirExecucaoParams
): Promise<string> {
  const { data, error } = await supabase
    .from("execucoes_pipeline")
    .insert({
      job_nome: params.job_nome,
      status: params.status,
      detalhes: params.detalhes ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Inserir execucoes_pipeline: ${error.message}`);
  return data.id as string;
}

export async function atualizarExecucao(
  supabase: SupabaseClient,
  id: string,
  params: { finalizado_em: string; status: StatusExecucao; detalhes?: Record<string, unknown> }
): Promise<void> {
  const { error } = await supabase
    .from("execucoes_pipeline")
    .update({
      finalizado_em: params.finalizado_em,
      status: params.status,
      ...(params.detalhes != null && { detalhes: params.detalhes }),
    })
    .eq("id", id);

  if (error) throw new Error(`Atualizar execucoes_pipeline: ${error.message}`);
}

export interface InserirEtapaParams {
  execucao_id: string;
  etapa_nome: string;
  status: StatusExecucao;
  detalhes?: Record<string, unknown>;
}

export async function inserirEtapa(
  supabase: SupabaseClient,
  params: InserirEtapaParams
): Promise<string> {
  const { data, error } = await supabase
    .from("execucoes_pipeline_etapas")
    .insert({
      execucao_id: params.execucao_id,
      etapa_nome: params.etapa_nome,
      status: params.status,
      detalhes: params.detalhes ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Inserir execucoes_pipeline_etapas: ${error.message}`);
  return data.id as string;
}

export async function atualizarEtapa(
  supabase: SupabaseClient,
  id: string,
  params: { finalizado_em: string; status: StatusExecucao; detalhes?: Record<string, unknown> }
): Promise<void> {
  const { error } = await supabase
    .from("execucoes_pipeline_etapas")
    .update({
      finalizado_em: params.finalizado_em,
      status: params.status,
      ...(params.detalhes != null && { detalhes: params.detalhes }),
    })
    .eq("id", id);

  if (error) throw new Error(`Atualizar execucoes_pipeline_etapas: ${error.message}`);
}

/** Upsert em emendas_brutas por (ano, id_externo). Evita duplicidade. */
export async function upsertEmendasBrutas(
  supabase: SupabaseClient,
  ano: number,
  registros: EmendaBrutaInsert[]
): Promise<{ inseridos: number; erros: number }> {
  if (registros.length === 0) return { inseridos: 0, erros: 0 };

  const rows = registros.map((r) => ({
    ano: r.ano,
    id_externo: r.id_externo,
    dados: r.dados as unknown as Record<string, unknown>,
  }));

  const { data, error } = await supabase
    .from("emendas_brutas")
    .upsert(rows, {
      onConflict: "ano,id_externo",
      ignoreDuplicates: false,
    })
    .select("id");

  if (error) {
    throw new Error(`Upsert emendas_brutas (ano=${ano}): ${error.message}`);
  }

  const inseridos = Array.isArray(data) ? data.length : 0;
  return { inseridos, erros: registros.length - inseridos };
}

/** Atualiza cobertura_dados para um ano. */
export async function atualizarCobertura(
  supabase: SupabaseClient,
  params: {
    ano: number;
    status: StatusCobertura;
    total_registros: number;
    ultima_ingestao_em: string;
  }
): Promise<void> {
  const { error } = await supabase.from("cobertura_dados").upsert(
    {
      ano: params.ano,
      status: params.status,
      total_registros: params.total_registros,
      ultima_ingestao_em: params.ultima_ingestao_em,
      updated_at: params.ultima_ingestao_em,
    },
    { onConflict: "ano" }
  );

  if (error) throw new Error(`Atualizar cobertura_dados (ano=${params.ano}): ${error.message}`);
}
