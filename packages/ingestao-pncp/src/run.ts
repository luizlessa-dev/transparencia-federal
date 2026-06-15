/**
 * Ingestão PNCP — licitações do dia (ou intervalo)
 *
 * Uso:
 *   npm run pncp:ts                           # ontem
 *   npm run pncp:ts -- --data=2026-06-01      # data específica
 *   npm run pncp:ts -- --inicio=2026-01-01 --fim=2026-01-31   # intervalo
 *   npm run pncp:ts -- --modalidades=6,8      # só pregão eletrônico e dispensa eletrônica
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoPncp, type ResultadoPncp } from "./job-ingestao-pncp.js";

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

const args = process.argv.slice(2);
const get = (flag: string) => args.find((a) => a.startsWith(`--${flag}=`))?.split("=")[1];

let dataInicial: string;
let dataFinal: string;

const data = get("data");
const inicio = get("inicio");
const fim = get("fim");

if (data) {
  dataInicial = dataFinal = data.replace(/-/g, "");
} else if (inicio && fim) {
  dataInicial = inicio.replace(/-/g, "");
  dataFinal = fim.replace(/-/g, "");
} else {
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  dataInicial = dataFinal = fmt(ontem);
}

const modArg = get("modalidades");
const modalidades = modArg ? modArg.split(",").map(Number).filter(Boolean) : undefined;

console.log("▶ Ingestão PNCP licitações");
console.log(`  Período: ${dataInicial} → ${dataFinal}`);
console.log(`  Modalidades: ${modalidades?.join(", ") ?? "todas (1-9)"}`);
console.log();

const t0 = Date.now();

const { resultados } = await jobIngestaoPncp({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  dataInicial,
  dataFinal,
  modalidades,
});

const seg = ((Date.now() - t0) / 1000).toFixed(1);
const totalGeral = resultados.reduce((s, r) => s + r.total, 0);
const inseridosGeral = resultados.reduce((s, r) => s + r.inseridos, 0);

console.log(`\n  ✓ Concluído em ${seg}s`);
console.log(`  Total: ${totalGeral.toLocaleString("pt-BR")} | Inseridos: ${inseridosGeral.toLocaleString("pt-BR")}`);
console.log("\n  Por modalidade:");
for (const r of resultados) {
  console.log(`    modal ${r.modalidade}: ${r.total} / ${r.inseridos} inseridos`);
}
