/**
 * job_ingestao_votacoes
 * Coleta votações de todos os deputados da API da Câmara.
 * Estratégia: busca lista de deputados → para cada deputado → pagina votações → upsert.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { CamaraClient } from "./camara-client.js";
import { createSupabaseClient, inserirExecucao, atualizarExecucao, inserirEtapa, atualizarEtapa } from "./db.js";

const JOB_NOME = "job_ingestao_votacoes";
const ETAPA_NOME = "ingestao_votacoes";
const TAMANHO_LOTE = 200;

export interface JobIngestaoVotacoesConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export interface ResultadoJobVotacoes {
  execucao_id: string;
  status: "sucesso" | "erro";
  total: number;
  inseridos: number;
  erro?: string;
}

function nowISO(): string {
  return new Date().toISOString();
}

async function upsertVotacoes(supabase: SupabaseClient, rows: object[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { data, error } = await supabase
    .from("votacoes_brutas")
    .upsert(rows, { onConflict: "deputado_id_externo,id_votacao", ignoreDuplicates: false })
    .select("id");
  if (error) throw new Error(`Upsert votacoes_brutas: ${error.message}`);
  return Array.isArray(data) ? data.length : 0;
}

export async function jobIngestaoVotacoes(
  config: JobIngestaoVotacoesConfig
): Promise<ResultadoJobVotacoes> {
  const supabase = createSupabaseClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  const camara = new CamaraClient();
  const correlation_id = crypto.randomUUID();

  const execucao_id = await inserirExecucao(supabase, {
    job_nome: JOB_NOME,
    status: "em_andamento",
    detalhes: { correlation_id },
  });

  const etapa_id = await inserirEtapa(supabase, {
    execucao_id,
    etapa_nome: ETAPA_NOME,
    status: "em_andamento",
    detalhes: { correlation_id },
  });

  try {
    // Busca lista de deputados da tabela já ingerida
    const { data: deputadosDb, error: errDep } = await supabase
      .from("deputados_brutas")
      .select("id_externo, nome");

    if (errDep) throw new Error(`Buscar deputados: ${errDep.message}`);
    if (!deputadosDb || deputadosDb.length === 0) {
      throw new Error("Nenhum deputado encontrado. Execute job_ingestao_deputados primeiro.");
    }

    let totalGeral = 0;
    let inseridosGeral = 0;

    for (const dep of deputadosDb) {
      try {
        const votacoes = await camara.buscarVotacoesDeputado(Number(dep.id_externo));
        if (votacoes.length === 0) continue;

        totalGeral += votacoes.length;

        for (let i = 0; i < votacoes.length; i += TAMANHO_LOTE) {
          const lote = votacoes.slice(i, i + TAMANHO_LOTE).map((v) => ({
            deputado_id_externo: dep.id_externo,
            id_votacao: v.idVotacao,
            descricao_voto: v.descricaoVoto,
            dados: v,
          }));
          inseridosGeral += await upsertVotacoes(supabase, lote);
        }
      } catch {
        // Continua mesmo se houver erro em um deputado
      }
    }

    const finalizado_em = nowISO();
    await atualizarEtapa(supabase, etapa_id, { finalizado_em, status: "sucesso", detalhes: { total: totalGeral, inseridos: inseridosGeral } });
    await atualizarExecucao(supabase, execucao_id, { finalizado_em, status: "sucesso", detalhes: { total: totalGeral, inseridos: inseridosGeral } });

    return { execucao_id, status: "sucesso", total: totalGeral, inseridos: inseridosGeral };
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    const finalizado_em = nowISO();
    await atualizarEtapa(supabase, etapa_id, { finalizado_em, status: "erro", detalhes: { erro: mensagem } });
    await atualizarExecucao(supabase, execucao_id, { finalizado_em, status: "erro", detalhes: { erro: mensagem } });
    return { execucao_id, status: "erro", total: 0, inseridos: 0, erro: mensagem };
  }
}
