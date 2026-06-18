/**
 * Backfill completo: ingere TED e FAF sequencialmente.
 * Uso: tsx src/backfill.ts [--apenas-ted] [--apenas-faf]
 */
import "dotenv/config";
import { jobIngestaoTed } from "./job-ingestao-ted.js";
import { jobIngestaoFaf } from "./job-ingestao-faf.js";
import { resumoVolumes } from "./transferegov-client.js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const args = process.argv.slice(2);
const apenasT = args.includes("--apenas-ted");
const apenasF = args.includes("--apenas-faf");
const ambos = !apenasT && !apenasF;

console.log("=== Backfill TransfereGov (TED + FAF) ===\n");

console.log("Volumes disponíveis na API:");
const volumes = await resumoVolumes();
for (const [k, v] of Object.entries(volumes)) {
  console.log(`  ${k}: ${v.toLocaleString("pt-BR")} registros`);
}
console.log();

const inicio = Date.now();
let erros = 0;

if (apenasT || ambos) {
  const res = await jobIngestaoTed({ supabaseUrl: url, supabaseServiceRoleKey: key });
  if (res.status === "erro") { console.error(`[TED] Erro: ${res.erro}`); erros++; }
  console.log(`[TED] Planos: ${res.planos.upsert}/${res.planos.total} | Termos: ${res.termos.upsert}/${res.termos.total}\n`);
}

if (apenasF || ambos) {
  const res = await jobIngestaoFaf({ supabaseUrl: url, supabaseServiceRoleKey: key });
  if (res.status === "erro") { console.error(`[FAF] Erro: ${res.erro}`); erros++; }
  console.log(`[FAF] Planos: ${res.planos.upsert}/${res.planos.total}\n`);
}

const duracao = ((Date.now() - inicio) / 1000).toFixed(1);
console.log(`Backfill concluído em ${duracao}s — ${erros === 0 ? "sem erros" : `${erros} módulo(s) com erro`}`);
if (erros > 0) process.exit(1);
