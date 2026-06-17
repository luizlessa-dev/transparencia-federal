import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = process.argv.slice(2).join(" ");
if (!sql) { console.error("Uso: node _introspect.mjs '<SQL>'"); process.exit(1); }

const { data, error } = await sb.rpc("exec_readonly_query", { sql_query: sql });
if (error) { console.error("ERRO RPC query:", error.message, error.details || "", error.hint || ""); process.exit(2); }
console.log(JSON.stringify(data, null, 2));
