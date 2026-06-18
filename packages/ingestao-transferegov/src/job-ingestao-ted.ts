/**
 * Job de ingestão TED (Termos de Execução Descentralizada).
 * Tabelas: ted_planos_acao, ted_termos_execucao
 * Fonte: api.transferegov.gestao.gov.br/ted/ (PostgREST público)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { iterarTedPlanoAcao, iterarTedTermoExecucao, type TedPlanoAcao, type TedTermoExecucao } from "./transferegov-client.js";

const LOTE = 500;

export interface JobTedConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export interface ResultadoJobTed {
  status: "sucesso" | "erro";
  planos: { total: number; upsert: number };
  termos: { total: number; upsert: number };
  erro?: string;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function bool(v: unknown): boolean | null {
  if (v == null) return null;
  return Boolean(v);
}

function mapPlano(item: TedPlanoAcao): Record<string, unknown> {
  return {
    id_plano_acao: item.id_plano_acao,
    id_programa: item.id_programa,
    sigla_unidade_descentralizada: str(item.sigla_unidade_descentralizada),
    unidade_descentralizada: str(item.unidade_descentralizada),
    sigla_unidade_execucao: str(item.sigla_unidade_responsavel_execucao),
    unidade_execucao: str(item.unidade_responsavel_execucao),
    valor_total: num(item.vl_total_plano_acao),
    data_inicio_vigencia: str(item.dt_inicio_vigencia) ?? null,
    data_fim_vigencia: str(item.dt_fim_vigencia) ?? null,
    objeto: str(item.tx_objeto_plano_acao),
    situacao: str(item.tx_situacao_plano_acao),
    ano: num(item.aa_ano_plano_acao),
    forma_execucao_direta: bool(item.in_forma_execucao_direta),
    forma_execucao_particulares: bool(item.in_forma_execucao_particulares),
    forma_execucao_descentralizada: bool(item.in_forma_execucao_descentralizada),
    valor_beneficiario_especifico: num(item.vl_beneficiario_especifico),
    valor_chamamento_publico: num(item.vl_chamamento_publico),
    dados: item,
    atualizado_em: new Date().toISOString(),
  };
}

function mapTermo(item: TedTermoExecucao): Record<string, unknown> {
  return {
    id_termo: item.id_termo,
    id_plano_acao: item.id_plano_acao,
    situacao: str(item.tx_situacao_termo),
    numero_processo_sei: str(item.tx_num_processo_sei),
    numero_ns: str(item.tx_numero_ns_termo),
    data_assinatura: item.dt_assinatura_termo ?? null,
    data_divulgacao: item.dt_divulgacao_termo ?? null,
    data_recebimento: item.dt_recebimento_termo ?? null,
    data_efetivacao: item.dt_efetivacao_termo ?? null,
    minuta_padrao: bool(item.in_minuta_padrao),
    dados: item,
    atualizado_em: new Date().toISOString(),
  };
}

async function upsertLote(sb: SupabaseClient, tabela: string, conflito: string, rows: Record<string, unknown>[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { error } = await sb.from(tabela).upsert(rows, { onConflict: conflito, ignoreDuplicates: false });
  if (error) {
    console.error(`  Upsert ${tabela} erro: ${error.message}`);
    return 0;
  }
  return rows.length;
}

export async function jobIngestaoTed(config: JobTedConfig): Promise<ResultadoJobTed> {
  const sb = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

  const resultado: ResultadoJobTed = {
    status: "sucesso",
    planos: { total: 0, upsert: 0 },
    termos: { total: 0, upsert: 0 },
  };

  try {
    // ── Planos de ação ──
    console.log("  [TED] Ingerindo planos de ação...");
    let lote: Record<string, unknown>[] = [];

    for await (const item of iterarTedPlanoAcao()) {
      lote.push(mapPlano(item));
      resultado.planos.total++;

      if (lote.length >= LOTE) {
        resultado.planos.upsert += await upsertLote(sb, "ted_planos_acao", "id_plano_acao", lote);
        process.stdout.write(`\r    ${resultado.planos.total.toLocaleString("pt-BR")} planos processados...`);
        lote = [];
      }
    }
    if (lote.length > 0) resultado.planos.upsert += await upsertLote(sb, "ted_planos_acao", "id_plano_acao", lote);
    console.log(`\r  [TED] Planos: ${resultado.planos.total} total, ${resultado.planos.upsert} upsert`);

    // ── Termos de execução ──
    console.log("  [TED] Ingerindo termos de execução...");
    lote = [];

    for await (const item of iterarTedTermoExecucao()) {
      lote.push(mapTermo(item));
      resultado.termos.total++;

      if (lote.length >= LOTE) {
        resultado.termos.upsert += await upsertLote(sb, "ted_termos_execucao", "id_termo", lote);
        process.stdout.write(`\r    ${resultado.termos.total.toLocaleString("pt-BR")} termos processados...`);
        lote = [];
      }
    }
    if (lote.length > 0) resultado.termos.upsert += await upsertLote(sb, "ted_termos_execucao", "id_termo", lote);
    console.log(`\r  [TED] Termos: ${resultado.termos.total} total, ${resultado.termos.upsert} upsert`);

  } catch (err) {
    resultado.status = "erro";
    resultado.erro = err instanceof Error ? err.message : String(err);
  }

  return resultado;
}
