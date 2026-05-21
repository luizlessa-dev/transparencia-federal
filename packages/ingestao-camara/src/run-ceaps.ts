/**
 * CLI para ingestão de CEAP da Câmara por ano.
 *
 * Uso:
 *   npm run ceaps:ts -w @transparencia/ingestao-camara             # anos padrão (2023-2025)
 *   npm run ceaps:ts -w @transparencia/ingestao-camara -- 2022     # só 2022
 *   npm run ceaps:ts -w @transparencia/ingestao-camara -- 2019,2020,2021,2022
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoCeaps } from "./job-ingestao-ceaps.js";

const url  = process.env.SUPABASE_URL ?? "";
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const anosArg = process.argv[2];
const anos = anosArg && !anosArg.startsWith("--")
  ? anosArg.split(",").map(Number).filter(Boolean)
  : undefined;

console.log("▶ Iniciando job_ingestao_ceaps (Câmara)...");
if (anos) console.log(`  Anos: ${anos.join(", ")}`);
else      console.log("  Anos: 2023, 2024, 2025 (padrão)");

const resultado = await jobIngestaoCeaps({
  supabaseUrl: url,
  supabaseServiceRoleKey: key,
  anos,
});

console.log(`\n  Status: ${resultado.status}`);
if (resultado.erro) console.error(`  Erro global: ${resultado.erro}`);
for (const a of resultado.resultados_por_ano) {
  console.log(`  ${a.ano}: total=${a.total} inseridos=${a.inseridos} erros=${a.erros}`);
}

if (resultado.status === "erro") process.exit(1);
