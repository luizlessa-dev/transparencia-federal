import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../");
config({ path: resolve(root, ".env") });

import { criarCliente } from "./db.js";
import { jobRankingBuild } from "./job-ranking-build.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const sb = criarCliente(url, key);

console.log("▶ Iniciando job_ranking_build...");
const resultado = await jobRankingBuild(sb).catch((err) => {
  console.error("  ERRO FATAL:", err.message);
  process.exit(1);
});

console.log(`\n  build_id: ${resultado.build_id}`);
console.log(`  ${resultado.total_parlamentares} entradas no ranking_parlamentar_build`);
console.log(`  Duração: ${resultado.duracao_ms}ms`);
