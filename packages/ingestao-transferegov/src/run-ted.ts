import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env") });
import { jobIngestaoTed } from "./job-ingestao-ted.js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

console.log("=== Ingestão TED (Termos de Execução Descentralizada) ===");
const inicio = Date.now();

const resultado = await jobIngestaoTed({ supabaseUrl: url, supabaseServiceRoleKey: key });

const duracao = ((Date.now() - inicio) / 1000).toFixed(1);
console.log(`\nStatus: ${resultado.status}`);
console.log(`Planos de ação: ${resultado.planos.total.toLocaleString("pt-BR")} processados, ${resultado.planos.upsert.toLocaleString("pt-BR")} upsert`);
console.log(`Termos:         ${resultado.termos.total.toLocaleString("pt-BR")} processados, ${resultado.termos.upsert.toLocaleString("pt-BR")} upsert`);
console.log(`Tempo total: ${duracao}s`);

if (resultado.erro) {
  console.error(`Erro: ${resultado.erro}`);
  process.exit(1);
}
