/**
 * CLI: ingere CEIS e CNEP (empresas sancionadas) → portal_sancionados
 * e cruza com fornecedores do CEAP e doadores do TSE.
 *
 * Uso:
 *   npm run sancionados:ts
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoSancionados } from "./job-ingestao-sancionados.js";

console.log("▶ Iniciando job_ingestao_sancionados (CEIS + CNEP)...");

const resultado = await jobIngestaoSancionados({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  portalApiKey: process.env.PORTAL_TRANSPARENCIA_API_KEY!,
});

console.log(`\n  Status: ${resultado.status}`);
console.log(`  CEIS: ${resultado.total_ceis} registros`);
console.log(`  CNEP: ${resultado.total_cnep} registros`);
console.log(`  Ativos (vigentes hoje): ${resultado.total_ativos}`);
console.log(`  Cruzamento CEAP: ${resultado.fornecedores_cruzados} deputados com fornecedor sancionado`);
console.log(`  Duração: ${resultado.duracao_ms}ms`);

if (resultado.status !== "sucesso") process.exit(1);
