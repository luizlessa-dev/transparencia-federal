/**
 * CLI: convênios de ENTRADA de recursos no Estado de MG (star-schema).
 * Reduz a 1 linha por convênio (maior ano_particao) → sem dupla contagem dos
 * snapshots temporais. concedente (quem repassa) → proponente (órgão estadual).
 *   npm run ingestao-mg:convenios-entrada
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { packageShow, fetchResourceText, type CkanResource } from "./ckan-client.js";
import { eachRow, mapColunas, parseValorBR, normCNPJ } from "./csv.js";
import { flushUpsert } from "./ingest-util.js";

const DS = "12253b1a-1171-4453-90f8-f84517cf147b";
const RID = {
  fato: "5ec81641-ac64-4a12-ad3d-7fba592126ba",
  concedente: "c9fe5251-6aa0-4701-9c4e-4341f9fa979d",
  proponente: "1db7da36-e65e-4e17-9c13-014f198b9242",
  situacao: "5bbc3778-cf9b-474f-8e76-711980db5760",
};

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const client = createClient(url, key, { auth: { persistSession: false } });

const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");
const toInt = (s: string) => { const n = parseInt((s ?? "").replace(/\D/g, ""), 10); return Number.isFinite(n) ? n : null; };

console.log("▶ Convênios de entrada (MG)");
const pkg = await packageShow(DS);
const urlOf = (rid: string) => (pkg.resources.find((r: CkanResource) => r.id === rid)?.url ?? null);

async function dim2(rid: string, idCol: string, valCol: string, extraCol?: string) {
  const u = urlOf(rid);
  const m = new Map<string, { nome: string; doc: string }>();
  if (!u) return m;
  let iId = -1, iVal = -1, iEx = -1;
  eachRow(await fetchResourceText(u, "utf-8"),
    (h) => { const idx = mapColunas(h); iId = idx(idCol); iVal = idx(valCol); iEx = extraCol ? idx(extraCol) : -1; },
    (l) => { const id = at(l, iId); if (id) m.set(id, { nome: at(l, iVal), doc: iEx >= 0 ? at(l, iEx) : "" }); });
  return m;
}

const concedente = await dim2(RID.concedente, "id_concedente", "nome", "nr_documento");
const proponente = await dim2(RID.proponente, "id_orgao", "nome");
const situacao = await dim2(RID.situacao, "id_situacao", "nome");
console.log(`  dims: concedente ${concedente.size} | proponente ${proponente.size} | situação ${situacao.size}`);

// fato → melhor linha por convênio (maior ano; desempate maior vr_concedente)
type Best = { ano: number; idCon: string; idOrg: string; idSit: string; vrC: number; vrP: number };
const best = new Map<string, Best>();
const fatoUrl = urlOf(RID.fato);
if (!fatoUrl) { console.error("fato não encontrada"); process.exit(1); }
let iTmp = -1, iOrg = -1, iConv = -1, iCon = -1, iSit = -1, iAno = -1, iVC = -1, iVP = -1;
const totalLinhas = eachRow(await fetchResourceText(fatoUrl, "utf-8"),
  (h) => { const idx = mapColunas(h); iOrg = idx("id_orgao"); iConv = idx("id_convenio"); iCon = idx("id_concedente"); iSit = idx("id_situacao"); iAno = idx("ano_particao"); iVC = idx("vr_concedente_atual"); iVP = idx("vr_proponente_atual"); void iTmp; },
  (l) => {
    const conv = at(l, iConv); if (!conv) return;
    const ano = toInt(at(l, iAno)) ?? 0;
    const vrC = parseValorBR(at(l, iVC)) ?? 0;
    const cur = best.get(conv);
    if (!cur || ano > cur.ano || (ano === cur.ano && vrC > cur.vrC)) {
      best.set(conv, { ano, idCon: at(l, iCon), idOrg: at(l, iOrg), idSit: at(l, iSit), vrC, vrP: parseValorBR(at(l, iVP)) ?? 0 });
    }
  });

const erros: string[] = [];
let inseridos = 0;
let buffer: Record<string, unknown>[] = [];
for (const [conv, b] of best) {
  const c = concedente.get(b.idCon);
  buffer.push({
    id_convenio: conv,
    concedente: c?.nome || null,
    concedente_doc: c?.doc ? normCNPJ(c.doc) : null,
    proponente: proponente.get(b.idOrg)?.nome || null,
    situacao: situacao.get(b.idSit)?.nome || null,
    ano: b.ano || null,
    vr_concedente: b.vrC,
    vr_proponente: b.vrP,
  });
  if (buffer.length >= 500) { inseridos += await flushUpsert(client, "mg_convenios_entrada", "id_convenio", buffer, erros); buffer = []; }
}
inseridos += await flushUpsert(client, "mg_convenios_entrada", "id_convenio", buffer, erros);
console.log(`  fato: ${totalLinhas} linhas | convênios distintos ${best.size} | gravados ${inseridos}`);
for (const e of erros.slice(0, 3)) console.log(`  erro: ${e}`);
if (erros.length && inseridos === 0) process.exit(1);
console.log("✓ Convênios de entrada concluído");
