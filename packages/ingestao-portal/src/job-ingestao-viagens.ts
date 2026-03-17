/**
 * job_ingestao_viagens
 * Coleta viagens do Portal da Transparência.
 * TODO: Implementar integração com API do Portal da Transparência para viagens.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient, inserirExecucao, atualizarExecucao, inserirEtapa, atualizarEtapa } from "./db.js";

const JOB_NOME = "job_ingestao_viagens";
const ETAPA_NOME = "ingestao_viagens";

export interface JobIngestaoViagensConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  portalApiKey: string;
  portalBaseUrl?: string;
  anos?: number[];
}

export interface ResultadoAnoViagens {
  ano: number;
  total: number;
  inseridos: number;
}

export interface ResultadoJobViagens {
  execucao_id: string;
  status: "sucesso" | "erro";
  resultados_por_ano: ResultadoAnoViagens[];
  erro?: string;
}

function nowISO(): string {
  return new Date().toISOString();
}

export async function jobIngestaoViagens(
  config: JobIngestaoViagensConfig
): Promise<ResultadoJobViagens> {
  const supabase = createSupabaseClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  const anos = config.anos ?? [2023, 2024, 2025, 2026];
  const correlation_id = crypto.randomUUID();

  const execucao_id = await inserirExecucao(supabase, {
    job_nome: JOB_NOME,
    status: "em_andamento",
    detalhes: { correlation_id, anos },
  });

  const etapa_id = await inserirEtapa(supabase, {
    execucao_id,
    etapa_nome: ETAPA_NOME,
    status: "em_andamento",
    detalhes: { correlation_id },
  });

  try {
    // TODO: Implementar coleta de viagens por ano
    const resultados_por_ano: ResultadoAnoViagens[] = [];

    for (const ano of anos) {
      // TODO: Buscar viagens para o ano
      resultados_por_ano.push({ ano, total: 0, inseridos: 0 });
    }

    const finalizado_em = nowISO();
    await atualizarEtapa(supabase, etapa_id, { finalizado_em, status: "sucesso", detalhes: { resultados_por_ano } });
    await atualizarExecucao(supabase, execucao_id, { finalizado_em, status: "sucesso", detalhes: { resultados_por_ano } });

    return { execucao_id, status: "sucesso", resultados_por_ano };
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    const finalizado_em = nowISO();
    await atualizarEtapa(supabase, etapa_id, { finalizado_em, status: "erro", detalhes: { erro: mensagem } });
    await atualizarExecucao(supabase, execucao_id, { finalizado_em, status: "erro", detalhes: { erro: mensagem } });
    return { execucao_id, status: "erro", resultados_por_ano: [], erro: mensagem };
  }
}
