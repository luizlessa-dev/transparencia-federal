import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmendaFinanceiroInsert, ResultadoEnriquecimento } from "./types.js";
import { parseValorBR } from "./normalizers.js";
import { ParlamentarMatcher } from "./matcher.js";
import {
  carregarParlamentares,
  buscarEmendasBrutas,
  upsertEmendaFinanceiro,
  registrarExecucao,
  finalizarExecucao,
} from "./db.js";

const LOTE = 200;
const ANOS = [2023, 2024, 2025, 2026];

export async function jobEnriquecimento(sb: SupabaseClient): Promise<void> {
  const execId = await registrarExecucao(sb, "job_enriquecimento", "em_andamento", {});
  const inicio = Date.now();

  try {
    const parlamentares = await carregarParlamentares(sb);
    const matcher = new ParlamentarMatcher(parlamentares);
    console.log(`  ${parlamentares.length} parlamentares carregados para matching.`);

    const totais: ResultadoEnriquecimento = { total: 0, inseridos: 0, sem_parlamentar: 0, erros: 0 };

    for (const ano of ANOS) {
      let offset = 0;
      let lote: Awaited<ReturnType<typeof buscarEmendasBrutas>>;
      let anoTotal = 0;
      let anoInseridos = 0;
      let anoSemParlamentar = 0;

      do {
        lote = await buscarEmendasBrutas(sb, ano, offset, LOTE);
        if (!lote.length) break;

        const rows: EmendaFinanceiroInsert[] = lote.map((e) => {
          const bruto = e.dados.payload_bruto as Record<string, unknown>;
          return {
            ano: e.ano,
            id_externo: e.id_externo,
            parlamentar_id: matcher.match(e.dados.parlamentar),
            valor_empenhado: parseValorBR(bruto.valorEmpenhado),
            valor_liquidado: parseValorBR(bruto.valorLiquidado),
            valor_pago: parseValorBR(bruto.valorPago),
          };
        });

        await upsertEmendaFinanceiro(sb, rows);

        const semParlamentar = rows.filter((r) => r.parlamentar_id === null).length;
        anoTotal += lote.length;
        anoInseridos += rows.length;
        anoSemParlamentar += semParlamentar;
        offset += LOTE;
      } while (lote.length === LOTE);

      const taxa = anoTotal > 0 ? Math.round(((anoTotal - anoSemParlamentar) / anoTotal) * 100) : 0;
      console.log(
        `  ${ano}: total=${anoTotal} inseridos=${anoInseridos} sem_parlamentar=${anoSemParlamentar} (match ${taxa}%)`
      );

      totais.total += anoTotal;
      totais.inseridos += anoInseridos;
      totais.sem_parlamentar += anoSemParlamentar;
    }

    await finalizarExecucao(sb, execId, "sucesso", {
      ...totais,
      duracao_ms: Date.now() - inicio,
    });

    const taxaGeral = totais.total > 0
      ? Math.round(((totais.total - totais.sem_parlamentar) / totais.total) * 100)
      : 0;
    console.log(
      `  Total: ${totais.inseridos} emendas financeiras | match ${taxaGeral}% | ${Date.now() - inicio}ms`
    );
  } catch (err) {
    await finalizarExecucao(sb, execId, "erro", {
      erro: err instanceof Error ? err.message : String(err),
      duracao_ms: Date.now() - inicio,
    });
    throw err;
  }
}
