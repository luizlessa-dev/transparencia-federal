import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgregadoParlamentar, RankingBuildRow, ResultadoBuild } from "./types.js";
import {
  agregarPorParlamentar,
  inserirRankingBuild,
  inserirSnapshot,
  registrarExecucao,
  finalizarExecucao,
} from "./db.js";

const ANOS = [2023, 2024];

function calcularRanking(agregados: AgregadoParlamentar[], buildId: string): RankingBuildRow[] {
  // Ordena por valor_empenhado desc (métrica principal do ranking)
  const ordenados = [...agregados].sort((a, b) => b.valor_empenhado - a.valor_empenhado);

  return ordenados.map((ag, idx) => {
    const taxaExecucao =
      ag.valor_empenhado > 0
        ? Math.round((ag.valor_pago / ag.valor_empenhado) * 100)
        : 0;

    return {
      build_id: buildId,
      parlamentar_id: ag.parlamentar_id,
      ano: ag.ano,
      posicao: idx + 1,
      valor_total: ag.valor_empenhado,
      metricas: {
        total_emendas: ag.total_emendas,
        valor_empenhado: ag.valor_empenhado,
        valor_liquidado: ag.valor_liquidado,
        valor_pago: ag.valor_pago,
        taxa_execucao: taxaExecucao,
      },
    };
  });
}

export async function jobRankingBuild(sb: SupabaseClient): Promise<ResultadoBuild> {
  const buildId = randomUUID();
  const execId = await registrarExecucao(sb, "em_andamento", { build_id: buildId });
  const inicio = Date.now();
  let totalParlamentares = 0;

  try {
    for (const ano of ANOS) {
      const agregados = await agregarPorParlamentar(sb, ano);
      if (!agregados.length) {
        console.log(`  ${ano}: sem dados — pulando.`);
        continue;
      }

      const rows = calcularRanking(agregados, buildId);
      await inserirRankingBuild(sb, rows);
      await inserirSnapshot(sb, buildId, ano, {
        build_id: buildId,
        ano,
        total_parlamentares: rows.length,
        top10: rows.slice(0, 10).map((r) => ({
          posicao: r.posicao,
          parlamentar_id: r.parlamentar_id,
          valor_total: r.valor_total,
          metricas: r.metricas,
        })),
      });

      totalParlamentares += rows.length;
      const lider = rows[0];
      console.log(
        `  ${ano}: ${rows.length} parlamentares rankeados | ` +
        `1º lugar: R$ ${lider.valor_total.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
      );
    }

    const resultado: ResultadoBuild = {
      build_id: buildId,
      anos: ANOS,
      total_parlamentares: totalParlamentares,
      duracao_ms: Date.now() - inicio,
    };

    await finalizarExecucao(sb, execId, "sucesso", resultado);
    return resultado;
  } catch (err) {
    await finalizarExecucao(sb, execId, "erro", {
      erro: err instanceof Error ? err.message : String(err),
      duracao_ms: Date.now() - inicio,
    });
    throw err;
  }
}
