/**
 * CLI: ingere declarações de bens de candidatos federais → tse_bens_candidatos + tse_bens_agg
 *
 * Uso:
 *   npm run tse-bens:ts               # anos 2022 e 2018
 *   npm run tse-bens:ts -- 2022       # só 2022
 *   npm run tse-bens:ts -- --manter-zip
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoTseBens } from "./job-ingestao-tse-bens.js";

const anosArg = process.argv[2];
const anos =
  anosArg && !anosArg.startsWith("--")
    ? anosArg.split(",").map(Number).filter(Boolean)
    : undefined;
const manterZip = process.argv.includes("--manter-zip");

console.log("▶ Iniciando job_ingestao_tse_bens...");
if (anos) console.log(`  Anos: ${anos.join(", ")}`);
else console.log("  Anos: 2022, 2018 (padrão)");
if (manterZip) console.log("  Modo: manter ZIP após ingestão");

const resultado = await jobIngestaoTseBens({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  anosEleitorais: anos,
  manter_zip: manterZip,
});

console.log(`\n  Status: ${resultado.status}`);
for (const r of resultado.resultados_por_ano) {
  console.log(
    `  ${r.ano}: CSV=${r.total_csv} filtrados=${r.filtrados} inseridos=${r.inseridos} erros=${r.erros} ${r.duracao_ms}ms`
  );
  if (r.erro) console.error(`    Erro: ${r.erro}`);
}
if (resultado.status !== "sucesso") process.exit(1);
