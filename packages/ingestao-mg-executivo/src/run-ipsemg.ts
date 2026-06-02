/**
 * CLI: contratos/credenciados vigentes do IPSEMG (saúde) — nominativo + CNPJ.
 * Snapshot mensal → deduplica por (num_contrato, cnpj, início). Sem valor na
 * fonte; serve para cruzar credenciados de saúde com a lista de sancionadas.
 *   npm run ingestao-mg:ipsemg
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { packageShow, fetchResourceText, type CkanResource } from "./ckan-client.js";
import { eachRow, mapColunas, parseDataBR, normCNPJ } from "./csv.js";
import { flushUpsert } from "./ingest-util.js";

const DS = "8d0f57e1-eeba-49d9-903e-37716a5dcdda";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const client = createClient(url, key, { auth: { persistSession: false } });

const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");

console.log("▶ IPSEMG — contratos/credenciados vigentes (MG)");
const pkg = await packageShow(DS);
const fonte = process.argv.slice(2).find((a) => /^https?:\/\//i.test(a))
  ?? pkg.resources.find((r: CkanResource) => (r.format ?? "").toUpperCase() === "CSV")?.url
  ?? "";
if (!fonte) { console.error("recurso CSV não encontrado"); process.exit(1); }

let iPer = -1, iReg = -1, iMic = -1, iMun = -1, iRamo = -1, iNum = -1, iCnpj = -1, iNome = -1, iIni = -1, iFim = -1;
const erros: string[] = [];
let inseridos = 0;
const vistos = new Set<string>();
let buffer: Record<string, unknown>[] = [];
const total = eachRow(await fetchResourceText(fonte, "utf-8"),
  (h) => {
    const idx = mapColunas(h);
    iPer = idx("periodo_referencia"); iReg = idx("regiao_assistencial"); iMic = idx("microrregiao");
    iMun = idx("municipio"); iRamo = idx("ramo_atividade"); iNum = idx("num_contrato");
    iCnpj = idx("cpf_cnpj"); iNome = idx("nome"); iIni = idx("inicio_vigencia"); iFim = idx("fim_vigencia");
  },
  (l) => {
    const cnpj = normCNPJ(at(l, iCnpj));
    const num = at(l, iNum);
    const ini = parseDataBR(at(l, iIni));
    const k = `${num}|${cnpj}|${ini ?? ""}`;
    if (vistos.has(k)) return; // dedup snapshot mensal
    vistos.add(k);
    buffer.push({
      num_contrato: num || null,
      cnpj_norm: cnpj || null,
      nome: at(l, iNome) || null,
      ramo_atividade: at(l, iRamo) || null,
      municipio: at(l, iMun) || null,
      regiao: at(l, iReg) || null,
      microrregiao: at(l, iMic) || null,
      inicio_vigencia: ini,
      fim_vigencia: parseDataBR(at(l, iFim)),
      periodo_referencia: parseDataBR(at(l, iPer)),
    });
  });
for (let i = 0; i < buffer.length; i += 500) inseridos += await flushUpsert(client, "mg_ipsemg_contratos", "num_contrato,cnpj_norm,inicio_vigencia", buffer.slice(i, i + 500), erros);
console.log(`  ${total} linhas | contratos distintos ${vistos.size} | gravados ${inseridos}`);
for (const e of erros.slice(0, 3)) console.log(`  erro: ${e}`);
if (erros.length && inseridos === 0) process.exit(1);
console.log("✓ IPSEMG concluído");
