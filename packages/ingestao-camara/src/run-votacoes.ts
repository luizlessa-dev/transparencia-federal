/**
 * CLI: ingestion de votações do plenário da Câmara
 *
 * Uso:
 *   npm run votacoes:ts                         # tudo da 57ª legislatura
 *   npm run votacoes:ts -- --data-inicio 2025-01-01  # só votações a partir desta data
 *   npm run votacoes:ts -- --forcar             # reprocessa mesmo votações já existentes
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoVotacoes } from "./job-ingestao-votacoes.js";

const args = process.argv.slice(2);
const forcar      = args.includes("--forcar");
const idxData     = args.indexOf("--data-inicio");
const dataInicio  = idxData !== -1 ? args[idxData + 1] : undefined;

console.log("▶ Iniciando job_ingestao_votacoes...");
if (dataInicio) console.log(`  Data início: ${dataInicio}`);
if (forcar)     console.log(`  Modo: reprocessamento forçado`);

const resultado = await jobIngestaoVotacoes({
  supabaseUrl:            process.env.SUPABASE_URL!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  forcarReprocessamento:  forcar,
  dataInicio,
});

console.log(`\n  Status: ${resultado.status}`);
console.log(`  Votações na API: ${resultado.total_votacoes}`);
console.log(`  Novas processadas: ${resultado.votacoes_novas}`);
console.log(`  Total votos inseridos: ${resultado.total_votos}`);
console.log(`  Total orientações: ${resultado.total_orientacoes}`);
console.log(`  Duração: ${resultado.duracao_ms}ms`);

if (resultado.status === "erro") {
  console.error(`\n  Erro: ${resultado.erro}`);
  process.exit(1);
}
