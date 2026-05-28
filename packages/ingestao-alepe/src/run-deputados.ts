/**
 * CLI: atualiza lista de deputados ativos da ALEPE.
 *
 * Ingere todos os 163 deputados históricos (leg=-16) de uma vez,
 * marcando como `ativo=true` apenas os da legislatura atual (leg=17).
 *
 * Uso:
 *   npm run deputados:ts -w @transparencia/ingestao-alepe
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoDeputadosAlepe } from "./job-deputados.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

console.log("▶ Iniciando ingestão de deputados ALEPE...\n");

const resultado = await jobIngestaoDeputadosAlepe({
  supabaseUrl: url,
  supabaseServiceRoleKey: key,
});

console.log(`\n  Status:       ${resultado.status}`);
console.log(`  Total:        ${resultado.total}`);
console.log(`  Upsertados:   ${resultado.upsertados}`);
console.log(`  Duração:      ${((resultado.duracao_ms ?? 0) / 1000).toFixed(2)}s`);
if (resultado.erro) console.error(`  Erro: ${resultado.erro}`);

if (resultado.status === "erro") process.exit(1);
