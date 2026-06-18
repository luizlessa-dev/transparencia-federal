/**
 * Backfill PNCP Resultados — vencedores por item de licitação
 *
 * Uso:
 *   npx tsx --no-cache src/backfill-resultados.ts --anos=2024,2025
 *   npx tsx --no-cache src/backfill-resultados.ts --anos=2026
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobResultadosPncp } from "./job-resultados-pncp.js";

const args = process.argv.slice(2);
const get = (flag: string) => args.find((a) => a.startsWith(`--${flag}=`))?.split("=")[1];

const anosArg = get("anos") ?? "2024,2025,2026";
const anos = anosArg.split(",").map(Number);
const mesInicio = Number(get("mes-inicio") ?? "1");

console.log("▶ Backfill PNCP Resultados (vencedores)");
console.log(`  Anos: ${anos.join(", ")}`);
console.log();

const hoje = new Date();
let totalGeral = 0, inseridosGeral = 0;

for (const ano of anos) {
  const mesStart = anos.indexOf(ano) === 0 ? mesInicio : 1;
  for (let mes = mesStart; mes <= 12; mes++) {
    const inicio = new Date(ano, mes - 1, 1);
    if (inicio > hoje) break;

    const fimDate = new Date(ano, mes, 0);
    const fim = fimDate > hoje ? hoje : fimDate;

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const di = fmt(inicio);
    const df = fmt(fim);

    process.stdout.write(`  ${ano}-${String(mes).padStart(2, "0")} (${di}→${df})... `);

    await new Promise((r) => setTimeout(r, 1000));

    const t0 = Date.now();
    const { total, inseridos } = await jobResultadosPncp({
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      dataInicial: di,
      dataFinal: df,
    });

    totalGeral += total;
    inseridosGeral += inseridos;

    const seg = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`${total.toLocaleString("pt-BR")} resultados, ${inseridos.toLocaleString("pt-BR")} inseridos (${seg}s)`);
  }
}

console.log(`\n  ✓ Backfill concluído`);
console.log(`  Total: ${totalGeral.toLocaleString("pt-BR")} | Inseridos: ${inseridosGeral.toLocaleString("pt-BR")}`);
