/**
 * CLI: atualiza lista de deputados ativos da ALESP.
 *
 * Uso:
 *   npm run deputados:ts -w @transparencia/ingestao-alesp
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoDeputadosAlesp } from "./job-deputados.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

console.log("▶ Iniciando job_ingestao_deputados (ALESP)...");

const resultado = await jobIngestaoDeputadosAlesp({
  supabaseUrl: url,
  supabaseServiceRoleKey: key,
});

console.log(`\n  Status:        ${resultado.status}`);
console.log(`  Total na API:  ${resultado.total}`);
console.log(`  Processados:   ${resultado.processados}`);
console.log(`  Upsertados:    ${resultado.upsertados}`);
console.log(`  Desativados:   ${resultado.ignorados}`);
console.log(`  Duração:       ${((resultado.duracao_ms ?? 0) / 1000).toFixed(2)}s`);
if (resultado.erro) console.error(`  Erro: ${resultado.erro}`);

if (resultado.status === "erro") process.exit(1);
