import "dotenv/config";
import { jobIngestaoFaf } from "./job-ingestao-faf.js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

console.log("=== Ingestão FAF (Fundo a Fundo) ===");
const inicio = Date.now();

const resultado = await jobIngestaoFaf({ supabaseUrl: url, supabaseServiceRoleKey: key });

const duracao = ((Date.now() - inicio) / 1000).toFixed(1);
console.log(`\nStatus: ${resultado.status}`);
console.log(`Planos de ação: ${resultado.planos.total.toLocaleString("pt-BR")} processados, ${resultado.planos.upsert.toLocaleString("pt-BR")} upsert`);
console.log(`Tempo total: ${duracao}s`);

if (resultado.erro) {
  console.error(`Erro: ${resultado.erro}`);
  process.exit(1);
}
