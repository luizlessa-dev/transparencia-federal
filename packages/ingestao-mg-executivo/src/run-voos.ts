/**
 * CLI: Voos Oficiais do Governador de MG (flat, por ano). Passageiro, cargo,
 * rota, aeronave, horas. Varre "Voos <ano>" via packageShow.
 *   npm run ingestao-mg:voos
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { packageShow, fetchResourceText, type CkanResource } from "./ckan-client.js";
import { eachRow, mapColunas, parseDataBR } from "./csv.js";
import { flushUpsert } from "./ingest-util.js";

const DS = "fa4f8391-33d1-46ed-9e9e-22ca2ae51103";
const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const client = createClient(url, key, { auth: { persistSession: false } });
const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");

console.log("▶ Voos Oficiais do Governador (MG)");
const pkg = await packageShow(DS);
const arqs = pkg.resources.filter((r: CkanResource) => /^voos/i.test((r.name ?? "").trim()) && (r.url ?? "").toLowerCase().endsWith(".csv"));

const erros: string[] = [];
let inseridos = 0, total = 0;
for (const r of arqs) {
  let iH = -1, iHr = -1, iAe = -1, iDb = -1, iBase = -1, iData = -1, iOri = -1, iDest = -1, iPax = -1, iCargo = -1, iOrg = -1;
  const buffer: Record<string, unknown>[] = [];
  const n = eachRow(await fetchResourceText(r.url!, "utf-8"),
    (h) => { const idx = mapColunas(h); iH = idx("historico"); iHr = idx("horas_voadas"); iAe = idx("aeronave"); iDb = idx("numero_db"); iBase = idx("base"); iData = idx("data_voo"); iOri = idx("origem"); iDest = idx("destino"); iPax = idx("passageiro"); iCargo = idx("cargo_passageiro"); iOrg = idx("orgao_passageiro"); },
    (l) => {
      buffer.push({
        numero_db: at(l, iDb) || null, data_voo: parseDataBR(at(l, iData)), aeronave: at(l, iAe) || null,
        base: at(l, iBase) || null, origem: at(l, iOri) || null, destino: at(l, iDest) || null,
        horas_voadas: at(l, iHr) || null, historico: at(l, iH) || null, passageiro: at(l, iPax) || null,
        cargo_passageiro: at(l, iCargo) || null, orgao_passageiro: at(l, iOrg) || null,
      });
    });
  total += n;
  for (let i = 0; i < buffer.length; i += 500) inseridos += await flushUpsert(client, "mg_voos_governador", "numero_db,passageiro,destino", buffer.slice(i, i + 500), erros);
  console.log(`  ${r.name}: ${n} trechos`);
}
console.log(`  total ${total} | gravados ${inseridos}`);
for (const e of erros.slice(0, 3)) console.log(`  erro: ${e}`);
if (erros.length && inseridos === 0) process.exit(1);
console.log("✓ Voos concluído");
