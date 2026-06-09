import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobVoosCamara } from "./job-voos-camara.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

console.log("▶ Iniciando job_voos_camara...");

const r = await jobVoosCamara({ supabaseUrl: url, supabaseServiceRoleKey: key });

console.log(`\n  Status: ${r.status}`);
if (r.erro) console.error(`  Erro: ${r.erro}`);
console.log(`  Registros de voo:   ${r.registros}`);
console.log(`  Deputados×ano:      ${r.deputados}`);
console.log(`  Companhias×ano:     ${r.companhias}`);
console.log(`  Gasto total:        R$ ${r.total_gasto.toLocaleString("pt-BR")}`);

if (r.status === "erro") process.exit(1);
