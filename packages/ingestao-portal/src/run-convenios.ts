/**
 * CLI: ingere convênios federais do Portal da Transparência por UF.
 *
 * Uso:
 *   npm run convenios:ts
 *   npm run convenios:ts -- --ufs MG,SP,RJ
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoConvenios } from "./job-ingestao-convenios.js";

const args = process.argv.slice(2);
const ufsArg = args.find((a) => a.startsWith("--ufs=") || a === "--ufs");
let ufs: string[] | undefined;
if (ufsArg) {
  const val = ufsArg.startsWith("--ufs=")
    ? ufsArg.split("=")[1]
    : args[args.indexOf("--ufs") + 1];
  ufs = val?.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
}

console.log(`▶ Iniciando job_ingestao_convenios${ufs ? ` (UFs: ${ufs.join(", ")})` : " (todas as UFs)"}...`);

const resultado = await jobIngestaoConvenios({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  portalApiKey: process.env.PORTAL_TRANSPARENCIA_API_KEY!,
  ufs,
});

const total = resultado.resultados_por_uf.reduce((s, r) => s + r.total, 0);
const inseridos = resultado.resultados_por_uf.reduce((s, r) => s + r.inseridos, 0);

console.log(`\n  Status    : ${resultado.status}`);
console.log(`  UFs       : ${resultado.resultados_por_uf.length}`);
console.log(`  Total     : ${total} convênios`);
console.log(`  Upserted  : ${inseridos}`);
if (resultado.erro) console.error(`  Erro      : ${resultado.erro}`);

if (resultado.status !== "sucesso") process.exit(1);
