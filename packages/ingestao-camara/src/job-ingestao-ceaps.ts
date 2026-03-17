/**
 * job_ingestao_ceaps
 * Coleta despesas de gabinete (CEAPS) de todos os deputados para os anos configurados.
 * Estratégia: busca lista de deputados → para cada deputado × ano → pagina despesas → upsert.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { CamaraClient } from "./camara-client.js";
import { createSupabaseClient, inserirExecucao, atualizarExecucao, inserirEtapa, atualizarEtapa } from "./db.js";

const JOB_NOME = "job_ingestao_ceaps";
const ETAPA_NOME = "ingestao_ceaps";
const TAMANHO_LOTE = 200;
const ANOS_CEAPS = [2023, 2024, 2025];

export interface JobIngestaoCeapsConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  anos?: number[];
}

export interface ResultadoAnoCeaps {
  ano: number;
  total: number;
  inseridos: number;
  erros: number;
}

export interface ResultadoJobCeaps {
  execucao_id: string;
  status: "sucesso" | "erro";
  resultados_por_ano: ResultadoAnoCeaps[];
  erro?: string;
}

function nowISO(): string {
  return new Date().toISOString();
}

async function upsertCeaps(supabase: SupabaseClient, rows: object[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { data, error } = await supabase
    .from("ceaps_brutas")
    .upsert(rows, { onConflict: "ano,cod_documento", ignoreDuplicates: false })
    .select("id");
  if (error) throw new Error(`Upsert ceaps_brutas: ${error.message}`);
  return Array.isArray(data) ? data.length : 0;
}

export async function jobIngestaoCeaps(
  config: JobIngestaoCeapsConfig
): Promise<ResultadoJobCeaps> {
  const supabase = createSupabaseClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  const camara = new CamaraClient();
  const anos = config.anos ?? ANOS_CEAPS;
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
    // Busca lista de deputados da tabela já ingerida (evita re-chamar API)
    const { data: deputadosDb, error: errDep } = await supabase
      .from("deputados_brutas")
      .select("id_externo, nome");

    if (errDep) throw new Error(`Buscar deputados: ${errDep.message}`);
    if (!deputadosDb || deputadosDb.length === 0) {
      throw new Error("Nenhum deputado encontrado em deputados_brutas. Execute job_ingestao_deputados primeiro.");
    }

    const resultados_por_ano: ResultadoAnoCeaps[] = [];

    for (const ano of anos) {
      let totalAno = 0;
      let inseridosAno = 0;
      let errosAno = 0;

      for (const dep of deputadosDb) {
        try {
          const despesas = await camara.buscarDespesasDeputado(Number(dep.id_externo), ano);
          if (despesas.length === 0) continue;

          // Deduplicar por codDocumento dentro do mesmo ano
          const unicas = Array.from(
            new Map(despesas.map((d) => [d.codDocumento, d])).values()
          );

          totalAno += unicas.length;

          for (let i = 0; i < unicas.length; i += TAMANHO_LOTE) {
            const lote = unicas.slice(i, i + TAMANHO_LOTE).map((d) => ({
              ano,
              cod_documento: d.codDocumento,
              deputado_id_externo: dep.id_externo,
              tipo_despesa: d.tipoDespesa,
              nome_fornecedor: d.nomeFornecedor,
              cnpj_cpf_fornecedor: d.cnpjCpfFornecedor,
              valor_liquido: d.valorLiquido,
              valor_documento: d.valorDocumento,
              valor_glosa: d.valorGlosa,
              data_documento: d.dataDocumento ? d.dataDocumento.substring(0, 10) : null,
              url_documento: d.urlDocumento,
              dados: d,
            }));
            inseridosAno += await upsertCeaps(supabase, lote);
          }
        } catch {
          errosAno++;
        }
      }

      resultados_por_ano.push({ ano, total: totalAno, inseridos: inseridosAno, erros: errosAno });
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
