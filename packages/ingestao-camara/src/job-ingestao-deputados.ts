/**
 * job_ingestao_deputados
 * Coleta todos os deputados em exercício da API da Câmara e grava em deputados_brutas.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { CamaraClient } from "./camara-client.js";
import { createSupabaseClient, inserirExecucao, atualizarExecucao, inserirEtapa, atualizarEtapa } from "./db.js";

const JOB_NOME = "job_ingestao_deputados";
const ETAPA_NOME = "ingestao_deputados";
const TAMANHO_LOTE = 100;

export interface JobIngestaoDeputadosConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export interface ResultadoJobDeputados {
  execucao_id: string;
  status: "sucesso" | "erro";
  total: number;
  inseridos: number;
  erro?: string;
}

function nowISO(): string {
  return new Date().toISOString();
}

async function upsertDeputados(
  supabase: SupabaseClient,
  rows: object[]
): Promise<number> {
  if (rows.length === 0) return 0;
  const { data, error } = await supabase
    .from("deputados_brutas")
    .upsert(rows, { onConflict: "id_externo", ignoreDuplicates: false })
    .select("id");
  if (error) throw new Error(`Upsert deputados_brutas: ${error.message}`);
  return Array.isArray(data) ? data.length : 0;
}

export async function jobIngestaoDeputados(
  config: JobIngestaoDeputadosConfig
): Promise<ResultadoJobDeputados> {
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
    const deputados = await camara.buscarDeputados();
    const total = deputados.length;
    let inseridos = 0;

    for (let i = 0; i < deputados.length; i += TAMANHO_LOTE) {
      const lote = deputados.slice(i, i + TAMANHO_LOTE).map((d) => ({
        id_externo: String(d.id),
        nome: d.nome,
        sigla_partido: d.siglaPartido,
        sigla_uf: d.siglaUf,
        id_legislatura: d.idLegislatura,
        url_foto: d.urlFoto,
        email: d.email,
        dados: d,
      }));
      inseridos += await upsertDeputados(supabase, lote);
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
