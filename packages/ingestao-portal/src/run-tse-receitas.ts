import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoTseReceitas } from "./job-ingestao-tse-receitas.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

// Aceita anos como argumento: "2022" ou "2022,2018" ou vazio para todos
const anosArg = process.argv[2];
const anos = anosArg
  ? anosArg.split(",").map(Number).filter(Boolean)
  : undefined;

const manterZip = process.argv.includes("--manter-zip");

console.log("▶ Iniciando job_ingestao_tse_receitas...");
if (anos) console.log(`  Anos: ${anos.join(", ")}`);
else console.log("  Anos: 2022, 2018 (padrão)");
if (manterZip) console.log("  Modo: manter ZIP após ingestão");

const resultado = await jobIngestaoTseReceitas({
  supabaseUrl: url,
  supabaseServiceRoleKey: key,
  anosEleitorais: anos,
  manter_zip: manterZip,
});

console.log(`\n  Status: ${resultado.status}`);
if (resultado.erro) console.error(`  Erro global: ${resultado.erro}`);
for (const r of resultado.resultados_por_ano) {
  const flag = r.erro ? ` ERRO=${r.erro}` : "";
  console.log(`  ${r.ano}: ${r.total} receitas, ${r.inseridos} inseridas, ${r.erros} erros — ${r.duracao_ms}ms${flag}`);
}

if (resultado.status === "erro") process.exit(1);
