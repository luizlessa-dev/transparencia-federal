import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../");
config({ path: resolve(root, ".env") });

import { jobCeapsRanking } from "./job-ceaps-ranking.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const anosArg = process.argv[2];
const anos = anosArg
  ? anosArg.split(",").map(Number).filter(Boolean)
  : undefined;

console.log("▶ Iniciando job_ceaps_ranking...");
if (anos) console.log(`  Anos: ${anos.join(", ")}`);

const resultado = await jobCeapsRanking({
  supabaseUrl: url,
  supabaseServiceRoleKey: key,
  anos,
});

if (resultado.status === "erro") {
  console.error(`\n  ERRO: ${resultado.erro}`);
  process.exit(1);
}

console.log(`\n  Status: ${resultado.status}`);
for (const r of resultado.resultados_por_ano) {
  console.log(`  ${r.ano}: ${r.total_deputados} deputados — ${r.duracao_ms}ms`);
}
