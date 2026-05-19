import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobCeapsSenadorRanking } from "./job-ceaps-senado-ranking.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const anosArg = process.argv[2];
const anos = anosArg ? anosArg.split(",").map(Number).filter(Boolean) : undefined;

console.log("▶ Iniciando job_ceaps_senado_ranking...");
if (anos) console.log(`  Anos: ${anos.join(", ")}`);
else console.log("  Anos: 2019–2025 (padrão)");

const resultado = await jobCeapsSenadorRanking({
  supabaseUrl: url,
  supabaseServiceRoleKey: key,
  anos,
});

console.log(`\n  Status: ${resultado.status}`);
if (resultado.erro) console.error(`  Erro: ${resultado.erro}`);
for (const r of resultado.resultados_por_ano) {
  const flag = r.erro ? ` ERRO=${r.erro}` : "";
  console.log(`  ${r.ano}: ${r.senadores} senadores — ${r.duracao_ms}ms${flag}`);
}

if (resultado.status === "erro") process.exit(1);
