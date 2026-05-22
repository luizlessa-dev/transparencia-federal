/**
 * CLI: atualiza lista de deputados ativos da ALMG.
 *
 * Uso:
 *   npm run deputados:ts -w @transparencia/ingestao-almg
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoDeputadosAlmg } from "./job-deputados.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

console.log("▶ Iniciando job_ingestao_deputados (ALMG)...");

const resultado = await jobIngestaoDeputadosAlmg({
  supabaseUrl: url,
  supabaseServiceRoleKey: key,
});

console.log(`\n  Status: ${resultado.status}`);
console.log(`  Total na API: ${resultado.total}`);
console.log(`  Upsertados:   ${resultado.upsertados}`);
console.log(`  Desativados:  ${resultado.desativados}`);
if (resultado.erro) console.error(`  Erro: ${resultado.erro}`);

if (resultado.status === "erro") process.exit(1);
