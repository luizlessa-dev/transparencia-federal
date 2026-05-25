/**
 * Bridge: emendas_completas → emendas_financeiro
 *
 * Lê emendas da tabela emendas_completas (populada via CSV bulk),
 * faz matching de autor_nome → parlamentar_id usando ParlamentarMatcher,
 * e upserta em emendas_financeiro para que o ranking possa agregá-las.
 *
 * Uso:
 *   npm run bridge:ts -w @transparencia/enriquecimento -- 2025,2026
 *   npm run bridge:ts -w @transparencia/enriquecimento           # processa ANOS abaixo
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../");
config({ path: resolve(root, ".env") });

import { createClient } from "@supabase/supabase-js";
import { ParlamentarMatcher } from "./matcher.js";
import { carregarParlamentares, upsertEmendaFinanceiro } from "./db.js";

const ANOS_DEFAULT = [2023, 2024, 2025, 2026];
const LOTE = 500;

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const anosArg = process.argv[2];
const anos: number[] = anosArg
  ? anosArg.split(",").map(Number).filter(Boolean)
  : ANOS_DEFAULT;

console.log("▶ Bridge emendas_completas → emendas_financeiro");
console.log(`  Anos: ${anos.join(", ")}`);
console.log();

const parlamentares = await carregarParlamentares(sb);
const matcher = new ParlamentarMatcher(parlamentares);
console.log(`  ${parlamentares.length} parlamentares carregados para matching.`);
console.log();

const t0 = Date.now();
let totalInseridos = 0;
let totalSemParlamentar = 0;

for (const ano of anos) {
  let offset = 0;
  let anoInseridos = 0;
  let anoSemParlamentar = 0;

  while (true) {
    const { data, error } = await sb
      .from("emendas_completas")
      .select("codigo_emenda, ano, autor_nome, valor_empenhado, valor_liquidado, valor_pago")
      .eq("ano", ano)
      .range(offset, offset + LOTE - 1);

    if (error) {
      console.error(`  [${ano}] Erro ao buscar: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;

    const rows = data.map((e: any) => ({
      ano: e.ano,
      id_externo: e.codigo_emenda as string,
      parlamentar_id: matcher.match(e.autor_nome),
      valor_empenhado: Number(e.valor_empenhado ?? 0),
      valor_liquidado: Number(e.valor_liquidado ?? 0),
      valor_pago: Number(e.valor_pago ?? 0),
    }));

    await upsertEmendaFinanceiro(sb, rows);

    const semParlamentar = rows.filter((r) => r.parlamentar_id === null).length;
    anoInseridos += rows.length;
    anoSemParlamentar += semParlamentar;
    offset += LOTE;

    if (data.length < LOTE) break;
  }

  const taxa = anoInseridos > 0
    ? Math.round(((anoInseridos - anoSemParlamentar) / anoInseridos) * 100)
    : 0;
  console.log(`  ${ano}: ${anoInseridos} emendas | ${anoSemParlamentar} sem parlamentar | match ${taxa}%`);
  totalInseridos += anoInseridos;
  totalSemParlamentar += anoSemParlamentar;
}

const taxaGeral = totalInseridos > 0
  ? Math.round(((totalInseridos - totalSemParlamentar) / totalInseridos) * 100)
  : 0;
console.log(`\n  ✓ Total: ${totalInseridos} emendas inseridas | match geral ${taxaGeral}% | ${Date.now() - t0}ms`);
