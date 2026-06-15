/**
 * Backfill PNCP — percorre meses passados
 *
 * Uso:
 *   npm run backfill:ts -- --anos=2024,2025
 *   npm run backfill:ts -- --anos=2026 --modalidades=6
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoPncp } from "./job-ingestao-pncp.js";

const args = process.argv.slice(2);
const get = (flag: string) => args.find((a) => a.startsWith(`--${flag}=`))?.split("=")[1];

const anosArg = get("anos") ?? "2024,2025,2026";
const anos = anosArg.split(",").map(Number);
const modArg = get("modalidades");
// Default: só as modalidades mais comuns para reduzir carga no API
const modalidades = modArg
  ? modArg.split(",").map(Number)
  : [1, 3, 4, 6, 8]; // pregão elet, dispensa elet, concorrência elet, leilão, concurso

console.log("▶ Backfill PNCP");
console.log(`  Anos: ${anos.join(", ")}`);
console.log(`  Modalidades: ${modalidades?.join(", ") ?? "todas"}`);
console.log();

const hoje = new Date();
let totalGeral = 0, inseridosGeral = 0;

for (const ano of anos) {
  for (let mes = 1; mes <= 12; mes++) {
    const inicio = new Date(ano, mes - 1, 1);
    if (inicio > hoje) break;

    const fimDate = new Date(ano, mes, 0); // último dia do mês
    const fim = fimDate > hoje ? hoje : fimDate;

    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
    const di = fmt(inicio);
    const df = fmt(fim);

    process.stdout.write(`  ${ano}-${String(mes).padStart(2, "0")} (${di}→${df})... `);

    // Pausa entre meses para não sobrecarregar o PNCP
    await new Promise((r) => setTimeout(r, 3000));

    const t0 = Date.now();
    const { resultados } = await jobIngestaoPncp({
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      dataInicial: di,
      dataFinal: df,
      modalidades,
    });

    const tot = resultados.reduce((s, r) => s + r.total, 0);
    const ins = resultados.reduce((s, r) => s + r.inseridos, 0);
    totalGeral += tot;
    inseridosGeral += ins;

    const seg = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`${tot} licitações, ${ins} inseridas (${seg}s)`);
  }
}

console.log(`\n  ✓ Backfill concluído`);
console.log(`  Total: ${totalGeral.toLocaleString("pt-BR")} | Inseridos: ${inseridosGeral.toLocaleString("pt-BR")}`);
