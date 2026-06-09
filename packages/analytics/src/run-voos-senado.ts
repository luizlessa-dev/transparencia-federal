import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobVoosSenado } from "./job-voos-senado.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry");

console.log(`▶ Iniciando job_voos_senado${dryRun ? " (DRY RUN — não grava)" : ""}...`);

const r = await jobVoosSenado({ supabaseUrl: url, supabaseServiceRoleKey: key, dryRun });

console.log(`\n  Status: ${r.status}`);
if (r.erro) console.error(`  Erro: ${r.erro}`);
console.log(`  Documentos lidos:        ${r.documentos}`);
console.log(`  Blocos de voo:           ${r.blocos}`);
console.log(`  Voos c/ detalhe completo: ${r.blocos_ok}`);
console.log(`  Taxa de detalhe completo: ${(r.taxa_parse * 100).toFixed(2)}%`);
console.log(`  (resto = truncado na fonte; companhia/valor ainda contam)`);
console.log(`  Segmentos (pernas):      ${r.segmentos}`);

if (r.amostra_nao_parseados.length > 0) {
  console.log(`\n  ⚠ Amostra de voos sem passageiro (truncados na fonte) (${r.amostra_nao_parseados.length}):`);
  for (const s of r.amostra_nao_parseados) console.log(`    · ${s}`);
}

if (r.status === "erro") process.exit(1);
