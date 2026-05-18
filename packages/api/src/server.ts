import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../");
config({ path: resolve(root, ".env") });

import { serve } from "@hono/node-server";
import { criarCliente } from "./db.js";
import { criarApp } from "./app.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const port = Number(process.env.API_PORT ?? 3001);

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const sb = criarCliente(url, key);
const app = criarApp(sb);

serve({ fetch: app.fetch, port }, () => {
  console.log(`▶ API rodando em http://localhost:${port}`);
  console.log(`  GET /ranking?ano=2024`);
  console.log(`  GET /parlamentar/:id`);
  console.log(`  GET /metodologia`);
  console.log(`  GET /cobertura`);
});
