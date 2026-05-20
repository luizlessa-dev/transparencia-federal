/**
 * CLI: ingere proposições de autoria de deputados → cam_proposicoes + cam_proposicoes_agg
 *
 * Uso:
 *   npm run proposicoes:ts           # resume (pula já processados)
 *   npm run proposicoes:ts -- --forcar  # reprocessa tudo
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoProposicoes } from "./job-ingestao-proposicoes.js";

const forcar = process.argv.includes("--forcar");

console.log("▶ Iniciando job_ingestao_proposicoes...");
if (forcar) console.log("  Modo: FORÇAR REPROCESSAMENTO");

const resultado = await jobIngestaoProposicoes({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  forcarReprocessamento: forcar,
});

console.log(`\n  Status: ${resultado.status}`);
console.log(`  Deputados processados: ${resultado.deputados_processados}`);
console.log(`  Total proposições: ${resultado.total_proposicoes}`);
console.log(`  Duração: ${resultado.duracao_ms}ms`);
if (resultado.erro) console.error(`  Erro: ${resultado.erro}`);
if (resultado.status !== "sucesso") process.exit(1);
