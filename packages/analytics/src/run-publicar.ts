import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../");
config({ path: resolve(root, ".env") });

import { criarCliente } from "./db.js";
import { jobPublicar } from "./job-publicar.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const sb = criarCliente(url, key);

// Aceita build_id como argumento opcional: node run-publicar.js <build_id>
const buildIdArg = process.argv[2];

console.log("▶ Iniciando job_publicar...");
const resultado = await jobPublicar(sb, buildIdArg).catch((err) => {
  console.error("  ERRO FATAL:", err.message);
  process.exit(1);
});

console.log(`\n  build_id: ${resultado.build_id}`);
console.log(`  ${resultado.total_publicados} entradas publicadas em ranking_parlamentar`);
console.log(`  Duração: ${resultado.duracao_ms}ms`);
