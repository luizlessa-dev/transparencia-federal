/**
 * job_ingestao_senadores
 * Coleta todos os senadores em exercício da API da Câmara e grava em senadores_brutas.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { CamaraClient } from "./camara-client.js";
import { createSupabaseClient, inserirExecucao, atualizarExecucao, inserirEtapa, atualizarEtapa } from "./db.js";

const JOB_NOME = "job_ingestao_senadores";
const ETAPA_NOME = "ingestao_senadores";
const TAMANHO_LOTE = 100;

export interface JobIngestaoSenadoresConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export interface ResultadoJobSenadores {
  execucao_id: string;
  status: "sucesso" | "erro";
  total: number;
  inseridos: number;
  erro?: string;
}

function nowISO(): string {
  return new Date().toISOString();
}

async function upsertSenadores(supabase: SupabaseClient, rows: object[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { data, error } = await supabase
    .from("senadores_brutas")
    .upsert(rows, { onConflict: "id_externo", ignoreDuplicates: false })
    .select("id");
  if (error) throw new Error(`Upsert senadores_brutas: ${error.message}`);
  return Array.isArray(data) ? data.length : 0;
}

export async function jobIngestaoSenadores(
  config: JobIngestaoSenadoresConfig
): Promise<ResultadoJobSenadores> {
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
    const senadores = await camara.buscarSenadores();
    const total = senadores.length;
    let inseridos = 0;

    for (let i = 0; i < senadores.length; i += TAMANHO_LOTE) {
      const lote = senadores.slice(i, i + TAMANHO_LOTE).map((s) => ({
        id_externo: String(s.id),
        nome: s.nome,
        sigla_partido: s.siglaPartido,
        sigla_uf: s.siglaUf,
        url_foto: s.urlFoto,
        email: s.email,
        dados: s,
      }));
      inseridos += await upsertSenadores(supabase, lote);
    }

    const finalizado_em = nowISO();
    await atualizarEtapa(supabase, etapa_id, { finalizado_em, status: "sucesso", detalhes: { total, inseridos } });
    await atualizarExecucao(supabase, execucao_id, { finalizado_em, status: "sucesso", detalhes: { total, inseridos } });

    return { execucao_id, status: "sucesso", total, inseridos };
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    const finalizado_em = nowISO();
    await atualizarEtapa(supabase, etapa_id, { finalizado_em, status: "erro", detalhes: { erro: mensagem } });
    await atualizarExecucao(supabase, execucao_id, { finalizado_em, status: "erro", detalhes: { erro: mensagem } });
    return { execucao_id, status: "erro", total: 0, inseridos: 0, erro: mensagem };
  }
}
