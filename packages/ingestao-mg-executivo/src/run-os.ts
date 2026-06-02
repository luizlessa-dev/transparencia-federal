/**
 * CLI: Termos de Parceria e Contratos de Gestão (organizações sociais) de MG.
 * Junta termos (entidade + CNPJ + objeto + vigência) com repasses (somados por
 * instrumento). Flat, latin-1. Cruzável por CNPJ com sancionadas.
 *   npm run ingestao-mg:os
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { packageShow, fetchResourceText, type CkanResource } from "./ckan-client.js";
import { eachRow, mapColunas, parseValorBR, parseDataBR, normCNPJ } from "./csv.js";
import { flushUpsert } from "./ingest-util.js";

const DS = "d327dcbf-f64c-40cc-b03b-f7b83b24e97e";
const RID = {
  termos: "f66ad9dc-090a-4c0f-9da0-def65046e4b7",
  repasses: "87f51195-abfc-4bc1-a968-84dc07f92ddb",
};

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const client = createClient(url, key, { auth: { persistSession: false } });

const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");

console.log("▶ Termos de Parceria / Contratos de Gestão (OSs · MG)");
const pkg = await packageShow(DS);
const urlOf = (rid: string) => (pkg.resources.find((r: CkanResource) => r.id === rid)?.url ?? null);

// repasses → Map<instrumento, {prev, atu}> (soma por ano)
const repasse = new Map<string, { prev: number; atu: number }>();
{ const u = urlOf(RID.repasses); let iId = -1, iP = -1, iA = -1;
  if (u) eachRow(await fetchResourceText(u, "latin1"),
    (h) => { const idx = mapColunas(h); iId = idx("id_instrumento"); iP = idx("repasse_previsto"); iA = idx("repasse_atualizado"); },
    (l) => { const id = at(l, iId); if (!id) return; const r = repasse.get(id) ?? { prev: 0, atu: 0 }; r.prev += parseValorBR(at(l, iP)) ?? 0; r.atu += parseValorBR(at(l, iA)) ?? 0; repasse.set(id, r); }); }
console.log(`  instrumentos com repasse: ${repasse.size}`);

// termos → 1 linha por instrumento, com repasse anexado
const uT = urlOf(RID.termos);
if (!uT) { console.error("arquivo de termos ausente"); process.exit(1); }
let iId = -1, iTipo = -1, iNum = -1, iOrg = -1, iEnt = -1, iSig = -1, iCnpj = -1, iObj = -1, iSit = -1, iIni = -1, iFim = -1;
const erros: string[] = [];
let inseridos = 0;
let buffer: Record<string, unknown>[] = [];
const total = eachRow(await fetchResourceText(uT, "latin1"),
  (h) => {
    const idx = mapColunas(h);
    iId = idx("id_instrumento"); iTipo = idx("tipo_instrumento"); iNum = idx("num_termo_contrato");
    iOrg = idx("orgao_estatal_nome"); iEnt = idx("entidade_parceira_nome"); iSig = idx("entidade_parceira_sigla");
    iCnpj = idx("entidade_parceira_cnpj"); iObj = idx("objeto"); iSit = idx("situacao");
    iIni = idx("data_inicio_vigencia"); iFim = idx("data_fim_vigencia");
  },
  (l) => {
    const id = at(l, iId); if (!id) return;
    const rp = repasse.get(id);
    buffer.push({
      id_instrumento: id,
      tipo_instrumento: at(l, iTipo) || null,
      num_termo: at(l, iNum) || null,
      orgao_estatal: at(l, iOrg) || null,
      entidade: at(l, iEnt) || null,
      entidade_sigla: at(l, iSig) || null,
      cnpj_norm: normCNPJ(at(l, iCnpj)) || null,
      objeto: at(l, iObj) || null,
      situacao: at(l, iSit) || null,
      inicio_vigencia: parseDataBR(at(l, iIni)),
      fim_vigencia: parseDataBR(at(l, iFim)),
      vr_repasse_previsto: rp ? Math.round(rp.prev * 100) / 100 : null,
      vr_repasse_atualizado: rp ? Math.round(rp.atu * 100) / 100 : null,
    });
  });
for (let i = 0; i < buffer.length; i += 500) inseridos += await flushUpsert(client, "mg_os_parcerias", "id_instrumento", buffer.slice(i, i + 500), erros);
console.log(`  ${total} termos | gravados ${inseridos}`);
for (const e of erros.slice(0, 3)) console.log(`  erro: ${e}`);
if (erros.length && inseridos === 0) process.exit(1);
console.log("✓ OSs concluído");
