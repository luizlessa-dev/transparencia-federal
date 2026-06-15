/**
 * Ingere despesas de gabinete da ALESC (verba indenizatória).
 *
 * Uso:
 *   npm run despesas:ts                     # ano atual
 *   npm run despesas:ts -- --anos=2022,2023,2024,2025,2026
 *   npm run despesas:ts -- --anos=2011,2012,...  # histórico completo (2011-2026)
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";
import { fetchDespesasAlesc } from "./despesas.js";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const args = process.argv.slice(2);
const anosArg = args.find((a) => a.startsWith("--anos="))?.split("=")[1];
const anoAtual = new Date().getFullYear();
const anos: number[] = anosArg
  ? anosArg.split(",").map(Number)
  : [anoAtual];

const LOTE = 500;

console.log("▶ Ingestão ALESC — despesas de gabinete");
console.log(`  Anos: ${anos.join(", ")}`);
console.log();

let totalGeral = 0, inseridosGeral = 0;

for (const ano of anos) {
  process.stdout.write(`  ${ano}... `);
  try {
    const despesas = await fetchDespesasAlesc("", ano);

    let inseridos = 0;
    for (let i = 0; i < despesas.length; i += LOTE) {
      const lote = despesas.slice(i, i + LOTE).map((d) => ({
        ...d,
        ingerido_em: new Date().toISOString(),
      }));
      const { error } = await sb.from("alesc_despesas").insert(lote);
      if (error && !error.message.includes("duplicate")) {
        console.error(`\n  Erro ${ano}:`, error.message);
      } else {
        inseridos += lote.length;
      }
    }

    totalGeral += despesas.length;
    inseridosGeral += inseridos;
    console.log(`${despesas.length} registros, ${inseridos} inseridos`);
  } catch (err) {
    console.error(`\n  Erro ao buscar ${ano}:`, err instanceof Error ? err.message : err);
  }

  // Pausa entre anos para não sobrecarregar
  if (anos.indexOf(ano) < anos.length - 1) {
    await new Promise((r) => setTimeout(r, 1000));
  }
}

console.log(`\n  ✓ Concluído: ${totalGeral.toLocaleString("pt-BR")} registros, ${inseridosGeral.toLocaleString("pt-BR")} inseridos`);
