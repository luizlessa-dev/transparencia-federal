/**
 * job_ingestao_emendas
 * Responsabilidade única: coletar emendas da fonte oficial e gravar na camada bruta.
 * Não calcula ranking, não enriquece financeiro, não publica.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { PortalClient, normalizarItemPortal } from "./portal-client.js";
import {
  createSupabaseClient,
  inserirExecucao,
  atualizarExecucao,
  inserirEtapa,
  atualizarEtapa,
  upsertEmendasBrutas,
  atualizarCobertura,
} from "./db.js";
import { validarRegistroEmenda, getAnosCobertos } from "./validacao.js";
import type { EmendaBrutaInsert } from "./types.js";
import type { StatusCobertura, StatusExecucao } from "./types.js";

const JOB_NOME = "job_ingestao_emendas";
const ETAPA_NOME = "ingestao_emendas";
const TAMANHO_LOTE_UPSERT = 200;

export interface JobIngestaoEmendasConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  portalApiKey: string;
  portalBaseUrl?: string;
  anos?: number[];
}

export interface ResultadoAno {
  ano: number;
  status: StatusCobertura;
  total_registros: number;
  inseridos: number;
  erros_validacao: number;
  erro?: string;
}

export interface ResultadoJob {
  execucao_id: string;
  status: StatusExecucao;
  iniciado_em: string;
  finalizado_em: string;
  resultados_por_ano: ResultadoAno[];
}

function nowISO(): string {
  return new Date().toISOString();
}

export async function jobIngestaoEmendas(
  config: JobIngestaoEmendasConfig
): Promise<ResultadoJob> {
  const supabase = createSupabaseClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey
  );
  const portal = new PortalClient({
    apiKey: config.portalApiKey,
    baseUrl: config.portalBaseUrl,
  });

  const anos = config.anos ?? getAnosCobertos();
  const correlation_id = crypto.randomUUID();
  const iniciado_em = nowISO();

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

  const resultados_por_ano: ResultadoAno[] = [];
  let statusFinal: StatusExecucao = "sucesso";
  const totais_por_ano: Record<number, number> = {};

  for (const ano of anos) {
    const resultado = await coletarEPersistirAno(supabase, portal, ano);
    resultados_por_ano.push(resultado);
    totais_por_ano[ano] = resultado.total_registros;

    if (resultado.status === "erro_coleta") {
      statusFinal = "erro";
    }

    const ultima_ingestao_em = nowISO();
    await atualizarCobertura(supabase, {
      ano,
      status: resultado.status,
      total_registros: resultado.total_registros,
      ultima_ingestao_em,
    });
  }

  const finalizado_em = nowISO();

  await atualizarEtapa(supabase, etapa_id, {
    finalizado_em,
    status: statusFinal,
    detalhes: {
      correlation_id,
      resultados_por_ano,
      totais_por_ano,
    },
  });

  await atualizarExecucao(supabase, execucao_id, {
    finalizado_em,
    status: statusFinal,
    detalhes: {
      correlation_id,
      anos,
      totais_por_ano,
      resultados_por_ano,
    },
  });

  return {
    execucao_id,
    status: statusFinal,
    iniciado_em,
    finalizado_em,
    resultados_por_ano,
  };
}

async function coletarEPersistirAno(
  supabase: SupabaseClient,
  portal: PortalClient,
  ano: number
): Promise<ResultadoAno> {
  try {
    const itens = await portal.buscarEmendasPorAno(ano);
    const total_fonte = itens.length;

    if (total_fonte === 0) {
      return {
        ano,
        status: "vazio_na_fonte",
        total_registros: 0,
        inseridos: 0,
        erros_validacao: 0,
      };
    }

    const registros: EmendaBrutaInsert[] = [];
    let erros_validacao = 0;

    for (const item of itens) {
      const { id_externo, dados } = normalizarItemPortal(item, ano);
      const registro: EmendaBrutaInsert = {
        ano,
        id_externo,
        dados,
      };
      const validacao = validarRegistroEmenda(registro);
      if (!validacao.valido) {
        erros_validacao++;
        continue;
      }
      registros.push(registro);
    }

    // Deduplicar por id_externo — a API pode retornar o mesmo registro em páginas diferentes
    const registrosUnicos = Array.from(
      new Map(registros.map((r) => [r.id_externo, r])).values()
    );

    let totalInseridos = 0;
    for (let i = 0; i < registrosUnicos.length; i += TAMANHO_LOTE_UPSERT) {
      const lote = registrosUnicos.slice(i, i + TAMANHO_LOTE_UPSERT);
      const { inseridos } = await upsertEmendasBrutas(supabase, ano, lote);
      totalInseridos += inseridos;
    }

    return {
      ano,
      status: "dados_encontrados",
      total_registros: registrosUnicos.length,
      inseridos: totalInseridos,
      erros_validacao,
    };
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    return {
      ano,
      status: "erro_coleta",
      total_registros: 0,
      inseridos: 0,
      erros_validacao: 0,
      erro: mensagem,
    };
  }
}
