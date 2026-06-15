import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";
import { fetchDeputadosAlesc } from "./deputados.js";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const deputados = await fetchDeputadosAlesc();
console.log(`Encontrados: ${deputados.length} deputados`);

const rows = deputados.map((d) => ({
  id_alesc: d.id_alesc,
  nome: d.nome,
  partido: d.partido,
  uf: "SC",
  ativo: true,
  atualizado_em: new Date().toISOString(),
}));

const { error } = await sb.from("alesc_deputados").upsert(rows, { onConflict: "id_alesc" });
if (error) { console.error("Erro:", error.message); process.exit(1); }
console.log(`✓ ${rows.length} deputados upsertados`);
