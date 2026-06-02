/**
 * CLI: Despesa de Pessoal do Acordo Judicial Vale/Brumadinho (flat, nominativo).
 * Servidores pagos com recurso do acordo. CKAN/LAI (pay de servidor é público).
 *   npm run ingestao-mg:vale-pessoal
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { packageShow, fetchResourceText, type CkanResource } from "./ckan-client.js";
import { eachRow, mapColunas, parseValorBR, parseDataBR } from "./csv.js";
import { flushUpsert } from "./ingest-util.js";

const DS = "27fc1bf4-80e4-4269-92c4-31ddf3a33ae8";
const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const client = createClient(url, key, { auth: { persistSession: false } });
const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");
const toInt = (s: string) => { const n = parseInt((s ?? "").replace(/\D/g, ""), 10); return Number.isFinite(n) ? n : null; };

console.log("▶ Despesa de Pessoal — Acordo Vale/Brumadinho (MG)");
const pkg = await packageShow(DS);
const fonte = pkg.resources.find((r: CkanResource) => (r.format ?? "").toUpperCase() === "CSV")?.url ?? "";
if (!fonte) { console.error("recurso CSV não encontrado"); process.exit(1); }

let iAm = -1, iMasp = -1, iSig = -1, iOrg = -1, iNome = -1, iVal = -1, iCgS = -1, iCgD = -1, iIni = -1, iFim = -1;
const erros: string[] = [];
let inseridos = 0;
let buffer: Record<string, unknown>[] = [];
const total = eachRow(await fetchResourceText(fonte, "utf-8"),
  (h) => { const idx = mapColunas(h); iAm = idx("ano_mes"); iMasp = idx("masp"); iSig = idx("orgao_sigla"); iOrg = idx("orgao"); iNome = idx("nome"); iVal = idx("valor"); iCgS = idx("cargo_sigla"); iCgD = idx("cargo_descricao"); iIni = idx("data_inicio_contrato"); iFim = idx("data_termino_contrato"); },
  (l) => {
    buffer.push({
      ano_mes: toInt(at(l, iAm)), masp: at(l, iMasp) || null, orgao_sigla: at(l, iSig) || null,
      orgao: at(l, iOrg) || null, nome: at(l, iNome) || null, valor: parseValorBR(at(l, iVal)),
      cargo_sigla: at(l, iCgS) || null, cargo_descricao: at(l, iCgD) || null,
      data_inicio: parseDataBR(at(l, iIni)), data_termino: parseDataBR(at(l, iFim)),
    });
  });
for (let i = 0; i < buffer.length; i += 500) inseridos += await flushUpsert(client, "mg_despesa_pessoal_vale", "ano_mes,masp,cargo_sigla", buffer.slice(i, i + 500), erros);
console.log(`  ${total} linhas | gravados ${inseridos}`);
for (const e of erros.slice(0, 3)) console.log(`  erro: ${e}`);
if (erros.length && inseridos === 0) process.exit(1);
console.log("✓ Pessoal Vale concluído");
