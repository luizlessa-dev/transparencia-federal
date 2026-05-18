import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
// Sobe 3 níveis: src → enriquecimento → packages → raiz do monorepo
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../");
config({ path: resolve(root, ".env") });
import { criarCliente } from "./db.js";
import { jobEnriquecimento } from "./job-enriquecimento.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const sb = criarCliente(url, key);

console.log("▶ Iniciando job_enriquecimento...");
await jobEnriquecimento(sb).catch((err) => {
  console.error("  ERRO FATAL:", err.message);
  process.exit(1);
});
