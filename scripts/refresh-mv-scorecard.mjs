import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log("Atualizando mv_scorecard_cnpj (CONCURRENTLY)...");
const t0 = Date.now();
const { error } = await sb.rpc("refresh_mv_scorecard_cnpj");
if (error) { console.error("Erro:", error.message); process.exit(1); }
console.log(`  ✓ REFRESH concluído em ${Date.now() - t0}ms`);

const { data, error: e2 } = await sb
  .from("mv_scorecard_cnpj")
  .select("cnpj, nome_fornecedor, risk_score, valor_total_recebido")
  .order("risk_score", { ascending: false })
  .limit(5);
if (e2) { console.error("Erro lendo MV:", e2.message); process.exit(1); }
console.log("Top 5 por risco:");
console.table(data);
