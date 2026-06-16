import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";
import { fetchDeputadosAleba } from "./deputados.js";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const deputados = await fetchDeputadosAleba();
console.log(`Encontrados: ${deputados.length} deputados`);

const rows = deputados.map((d) => ({
  id_aleba: d.id_aleba,
  nome: d.nome,
  nome_parlamentar: d.nome_parlamentar,
  partido: d.partido,
  uf: "BA",
  ativo: true,
  atualizado_em: new Date().toISOString(),
}));

const { error } = await sb.from("aleba_deputados").upsert(rows, { onConflict: "id_aleba" });
if (error) { console.error("Erro:", error.message); process.exit(1); }
console.log(`✓ ${rows.length} deputados upsertados`);
