/**
 * job_ceaps_ranking
 * Agrega ceaps_brutas → ceaps_ranking por deputado × ano.
 * Calcula: total_liquido, total_documentos, por_categoria (breakdown), posição no ranking.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const JOB_NOME = "job_ceaps_ranking";
const ANOS_DEFAULT = [2023, 2024, 2025, 2026];

export interface JobCeapsRankingConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  anos?: number[];
}

export interface ResultadoAno {
  ano: number;
  total_deputados: number;
  duracao_ms: number;
}

export interface ResultadoJobCeapsRanking {
  status: "sucesso" | "erro";
  resultados_por_ano: ResultadoAno[];
  erro?: string;
}

interface AgregadoBruto {
  deputado_id_externo: string;
  total_liquido: number;
  total_documentos: number;
  por_categoria: Record<string, number>;
}

async function agregarPorAno(
  sb: SupabaseClient,
  ano: number
): Promise<AgregadoBruto[]> {
  // Busca todos os lançamentos do ano em páginas de 1000
  const PAGE = 1000;
  let offset = 0;
  const acumulado: AgregadoBruto[] = [];
  const mapa = new Map<string, AgregadoBruto>();

  while (true) {
    const { data, error } = await sb
      .from("ceaps_brutas")
      .select("deputado_id_externo, tipo_despesa, valor_liquido")
      .eq("ano", ano)
      .range(offset, offset + PAGE - 1);

    if (error) throw new Error(`Ler ceaps_brutas ano=${ano}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      const key = row.deputado_id_externo as string;
      const tipo = (row.tipo_despesa as string) ?? "Outros";
      const valor = Number(row.valor_liquido ?? 0);

      if (!mapa.has(key)) {
        mapa.set(key, {
          deputado_id_externo: key,
          total_liquido: 0,
          total_documentos: 0,
          por_categoria: {},
        });
      }
      const agg = mapa.get(key)!;
      agg.total_liquido += valor;
      agg.total_documentos += 1;
      agg.por_categoria[tipo] = (agg.por_categoria[tipo] ?? 0) + valor;
    }

    offset += data.length;
    if (data.length < PAGE) break;
  }

  return Array.from(mapa.values());
}

export async function jobCeapsRanking(
  config: JobCeapsRankingConfig
): Promise<ResultadoJobCeapsRanking> {
  const sb = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
  const anos = config.anos ?? ANOS_DEFAULT;
  const resultados_por_ano: ResultadoAno[] = [];

  // Registra execução
  const { data: exec } = await sb
    .from("execucoes_pipeline")
    .insert({ job_nome: JOB_NOME, status: "em_andamento", detalhes: { anos } })
    .select("id")
    .single();
  const execucao_id = exec?.id as string | undefined;

  try {
    for (const ano of anos) {
      const t0 = Date.now();
      const agregados = await agregarPorAno(sb, ano);

      if (agregados.length === 0) {
        resultados_por_ano.push({ ano, total_deputados: 0, duracao_ms: Date.now() - t0 });
        continue;
      }

      // Ordena por total_liquido desc para atribuir posição
      agregados.sort((a, b) => b.total_liquido - a.total_liquido);

      const rows = agregados.map((agg, idx) => ({
        deputado_id_externo: agg.deputado_id_externo,
        ano,
        posicao: idx + 1,
        total_liquido: Math.round(agg.total_liquido * 100) / 100,
        total_documentos: agg.total_documentos,
        por_categoria: agg.por_categoria,
        atualizado_em: new Date().toISOString(),
      }));

      // Upsert em lotes de 200
      const LOTE = 200;
      for (let i = 0; i < rows.length; i += LOTE) {
        const lote = rows.slice(i, i + LOTE);
        const { error } = await sb
          .from("ceaps_ranking")
          .upsert(lote, { onConflict: "deputado_id_externo,ano" });
        if (error) throw new Error(`Upsert ceaps_ranking ano=${ano}: ${error.message}`);
      }

      resultados_por_ano.push({
        ano,
        total_deputados: agregados.length,
        duracao_ms: Date.now() - t0,
      });
    }

    if (execucao_id) {
      await sb.from("execucoes_pipeline").update({
        finalizado_em: new Date().toISOString(),
        status: "sucesso",
        detalhes: { resultados_por_ano },
      }).eq("id", execucao_id);
    }

    return { status: "sucesso", resultados_por_ano };
  } catch (err) {
    const erro = err instanceof Error ? err.message : String(err);
    if (execucao_id) {
      await sb.from("execucoes_pipeline").update({
        finalizado_em: new Date().toISOString(),
        status: "erro",
        detalhes: { erro },
      }).eq("id", execucao_id);
    }
    return { status: "erro", resultados_por_ano, erro };
  }
}
