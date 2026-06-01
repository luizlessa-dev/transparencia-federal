/**
 * CLI: ingere as iniciativas do acordo judicial de reparação Vale/Brumadinho.
 *   npm run ingestao-mg:reparacao
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { carregarCSV, colFinder, flushUpsert, finalizar } from "./ingest-util.js";
import { parseValorBR } from "./csv.js";

const URL_ =
  "https://dados.mg.gov.br/dataset/d7840175-2445-4ab3-84eb-ca645f58db31/resource/c57a6e00-a731-442b-81a5-7822b1375130/download/iniciativas_acordo_judicial_reparacao_vale.csv";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const fonte = process.argv.slice(2).find((a) => /^https?:\/\//i.test(a)) ?? URL_;

console.log("▶ Ingestão Reparação Vale/Brumadinho (MG)");
const { header, linhas } = await carregarCSV(fonte, "utf-8");
const c = colFinder(header);
const C = { cod: c("codigo_iniciativa"), ini: c("iniciativa"), anexo: c("anexo"), valor: c("valor_da_iniciativa") };
const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");

const client = createClient(url, key, { auth: { persistSession: false } });
const erros: string[] = [];
let inseridos = 0;
let buffer: Record<string, unknown>[] = [];
for (const l of linhas) {
  const cod = at(l, C.cod);
  if (!cod && !at(l, C.ini)) continue;
  buffer.push({
    codigo_iniciativa: cod || null,
    iniciativa: at(l, C.ini) || null,
    anexo: at(l, C.anexo) || null,
    valor: parseValorBR(at(l, C.valor)),
  });
  if (buffer.length >= 500) { inseridos += await flushUpsert(client, "mg_reparacao_vale", "codigo_iniciativa", buffer, erros); buffer = []; }
}
inseridos += await flushUpsert(client, "mg_reparacao_vale", "codigo_iniciativa", buffer, erros);
const r = finalizar(linhas.length, inseridos, erros, header);
console.log(`  status ${r.status} | linhas ${r.total} | gravados ${r.inseridos}`);
for (const e of r.erros.slice(0, 5)) console.log(`  erro: ${e}`);
if (r.status === "erro") { console.log(`  header: ${header.join(" | ")}`); process.exit(1); }
