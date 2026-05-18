import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoEmendasCompletas } from "./job-ingestao-emendas-completas.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY ?? "";

if (!url || !key || !apiKey) {
  console.error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e PORTAL_TRANSPARENCIA_API_KEY são obrigatórios.");
  process.exit(1);
}

// Aceita anos como argumento: "2019,2020,2021,2022" ou vazio para todos
const anosArg = process.argv[2];
const anos = anosArg
  ? anosArg.split(",").map(Number).filter(Boolean)
  : undefined;

console.log("▶ Iniciando job_ingestao_emendas_completas...");
if (anos) console.log(`  Anos: ${anos.join(", ")}`);
else console.log("  Anos: 2019–2025 (default)");

const resultado = await jobIngestaoEmendasCompletas({
  supabaseUrl: url,
  supabaseServiceRoleKey: key,
  portalApiKey: apiKey,
  anos,
});

console.log(`\n  Status: ${resultado.status}`);
if (resultado.erro) console.error(`  Erro: ${resultado.erro}`);
for (const r of resultado.resultados_por_ano) {
  const rp9Flag = r.rp9 > 0 ? ` (${r.rp9} RP9)` : "";
  console.log(`  ${r.ano}: ${r.total} emendas${rp9Flag} — ${r.duracao_ms}ms${r.erro ? ` ERRO=${r.erro}` : ""}`);
}

if (resultado.status === "erro") process.exit(1);
