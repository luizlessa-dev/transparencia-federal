/**
 * CLI: ingere verba indenizatória de UM mês.
 *
 * Uso:
 *   npm run verba:ts -w @transparencia/ingestao-almg                # mês corrente
 *   npm run verba:ts -w @transparencia/ingestao-almg -- 4 2026      # abril/2026
 *   npm run verba:ts -w @transparencia/ingestao-almg -- 4 2026 12193,28859  # só esses deputados
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoVerba } from "./job-verba.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const now = new Date();
const mesArg = process.argv[2];
const anoArg = process.argv[3];
const depsArg = process.argv[4];

const mes = mesArg ? Number(mesArg) : now.getMonth() + 1;
const ano = anoArg ? Number(anoArg) : now.getFullYear();
const deputadoIds = depsArg ? depsArg.split(",").map(Number).filter(Boolean) : undefined;

if (!Number.isFinite(mes) || mes < 1 || mes > 12 || !Number.isFinite(ano)) {
  console.error(`Argumentos inválidos: mes=${mesArg} ano=${anoArg}`);
  process.exit(1);
}

console.log(`▶ Iniciando job_ingestao_verba (ALMG) — período ${String(mes).padStart(2, "0")}/${ano}`);
if (deputadoIds) console.log(`  Deputados filtrados: ${deputadoIds.join(", ")}`);

const t0 = Date.now();
const resultado = await jobIngestaoVerba({
  supabaseUrl: url,
  supabaseServiceRoleKey: key,
  mes,
  ano,
  deputadoIds,
  onProgress: ({ idx, total, deputadoId, gastos }) => {
    if (idx % 10 === 0 || idx === total) {
      console.log(`  [${idx}/${total}] dep=${deputadoId}  +${gastos} gastos`);
    }
  },
});

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n  Status:               ${resultado.status}`);
console.log(`  Deputados processados: ${resultado.deputadosProcessados}`);
console.log(`  Gastos coletados:      ${resultado.totalGastos}`);
console.log(`  Inseridos no banco:    ${resultado.inseridos}`);
console.log(`  Falhas:                ${resultado.falhas.length}`);
console.log(`  Tempo:                 ${elapsed}s`);

if (resultado.falhas.length > 0) {
  console.log("\n  Detalhe das falhas:");
  for (const f of resultado.falhas.slice(0, 10)) {
    console.log(`    dep=${f.deputadoId}  ${f.erro}`);
  }
  if (resultado.falhas.length > 10) {
    console.log(`    ... e mais ${resultado.falhas.length - 10}`);
  }
}

if (resultado.status === "erro") process.exit(1);
