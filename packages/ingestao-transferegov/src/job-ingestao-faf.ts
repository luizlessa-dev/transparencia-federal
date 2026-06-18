/**
 * Job de ingestão FAF (Fundo a Fundo).
 * Tabela principal: faf_planos_acao
 * Fonte: api.transferegov.gestao.gov.br/fundoafundo/ (PostgREST público)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { iterarFafPlanoAcao, type FafPlanoAcao } from "./transferegov-client.js";

const LOTE = 500;

export interface JobFafConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export interface ResultadoJobFaf {
  status: "sucesso" | "erro";
  planos: { total: number; upsert: number };
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

function mapPlano(item: FafPlanoAcao): Record<string, unknown> {
  return {
    id_plano_acao: item.id_plano_acao,
    codigo: str(item.codigo_plano_acao),
    data_inicio_vigencia: item.data_inicio_vigencia_plano_acao ?? null,
    data_fim_vigencia: item.data_fim_vigencia_plano_acao ?? null,
    situacao: str(item.situacao_plano_acao),
    id_programa: item.id_programa ?? null,

    // Repassador (órgão federal)
    sigla_orgao_repassador: str(item.sigla_orgao_repassador_plano_acao),
    cnpj_orgao_repassador: str(item.cnpj_orgao_repassador_plano_acao),
    nome_orgao_repassador: str(item.nome_orgao_repassador_plano_acao),

    // Fundo repassador
    cnpj_fundo_repassador: str(item.cnpj_fundo_repassador_plano_acao),
    nome_fundo_repassador: str(item.nome_fundo_repassador_plano_acao),
    uf_fundo_repassador: str(item.uf_fundo_repassador_plano_acao),

    // Recebedor (ente municipal/estadual)
    cnpj_ente_recebedor: str(item.cnpj_ente_recebedor_plano_acao),
    nome_ente_recebedor: str(item.nome_ente_recebedor_plano_acao),
    uf_recebedor: str(item.uf_ente_recebedor_plano_acao),
    municipio_recebedor: str(item.nome_municipio_ente_recebedor_plano_acao),
    ibge_recebedor: num(item.codigo_ibge_municipio_ente_recebedor_plano_acao),

    // Fundo recebedor
    cnpj_fundo_recebedor: str(item.cnpj_fundo_recebedor_plano_acao),
    nome_fundo_recebedor: str(item.nome_fundo_recebedor_plano_acao),
    uf_fundo_recebedor: str(item.uf_fundo_recebedor_plano_acao),
    municipio_fundo_recebedor: str(item.municipio_fundo_recebedor_plano_acao),
    ibge_fundo_recebedor: num(item.codigo_ibge_fundo_recebedor_plano_acao),

    // Valores
    valor_total: num(item.valor_total_plano_acao),
    valor_repasse_total: num(item.valor_total_repasse_plano_acao),
    valor_repasse_emenda: num(item.valor_repasse_emenda_plano_acao),
    valor_repasse_voluntario: num(item.valor_repasse_voluntario_plano_acao),
    valor_recursos_proprios: num(item.valor_recursos_proprios_plano_acao),
    valor_custeio: num(item.valor_total_custeio_plano_acao),
    valor_investimento: num(item.valor_total_investimento_plano_acao),
    valor_saldo_disponivel: num(item.valor_saldo_disponivel_plano_acao),

    dados: item,
    atualizado_em: new Date().toISOString(),
  };
}

async function upsertLote(sb: SupabaseClient, rows: Record<string, unknown>[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { error } = await sb.from("faf_planos_acao").upsert(rows, { onConflict: "id_plano_acao", ignoreDuplicates: false });
  if (error) {
    console.error(`  Upsert faf_planos_acao erro: ${error.message}`);
    return 0;
  }
  return rows.length;
}

export async function jobIngestaoFaf(config: JobFafConfig): Promise<ResultadoJobFaf> {
  const sb = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

  const resultado: ResultadoJobFaf = {
    status: "sucesso",
    planos: { total: 0, upsert: 0 },
  };

  try {
    console.log("  [FAF] Ingerindo planos de ação...");
    let lote: Record<string, unknown>[] = [];

    for await (const item of iterarFafPlanoAcao()) {
      lote.push(mapPlano(item));
      resultado.planos.total++;

      if (lote.length >= LOTE) {
        resultado.planos.upsert += await upsertLote(sb, lote);
        process.stdout.write(`\r    ${resultado.planos.total.toLocaleString("pt-BR")} planos processados...`);
        lote = [];
      }
    }
    if (lote.length > 0) resultado.planos.upsert += await upsertLote(sb, lote);
    console.log(`\r  [FAF] Planos: ${resultado.planos.total} total, ${resultado.planos.upsert} upsert`);

  } catch (err) {
    resultado.status = "erro";
    resultado.erro = err instanceof Error ? err.message : String(err);
  }

  return resultado;
}
