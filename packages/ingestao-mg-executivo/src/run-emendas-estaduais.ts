/**
 * CLI: emendas ao orçamento ESTADUAL de MG (LOA). A fato ft_orcamento_emenda
 * agora liga id_emenda + id_autor + vr_emenda → rastreio deputado → valor →
 * objeto → órgão beneficiado. 1 linha por emenda (maior vr_emenda).
 *   npm run ingestao-mg:emendas-estaduais
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { packageShow, fetchResourceText, type CkanResource } from "./ckan-client.js";
import { eachRow, mapColunas, parseValorBR } from "./csv.js";
import { flushUpsert } from "./ingest-util.js";

const DS = "c96021c7-95d7-4f9c-b530-ebb3f1f505f9";
const RID = {
  emenda: "35ba328f-ba44-4a5f-90b9-33b65af57843",   // dm_emenda_orcam
  autor: "14ee8ce2-b12b-42c0-9e8f-5a5422ad0d6a",     // dm_autor_emenda
  fato: "fc96c549-0fbd-4976-ab88-1a0232d80b7b",      // ft_orcamento_emenda
};

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const client = createClient(url, key, { auth: { persistSession: false } });

const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");
const toInt = (s: string) => { const n = parseInt((s ?? "").replace(/\D/g, ""), 10); return Number.isFinite(n) ? n : null; };

console.log("▶ Emendas estaduais (LOA · MG)");
const pkg = await packageShow(DS);
const urlOf = (rid: string) => (pkg.resources.find((r: CkanResource) => r.id === rid)?.url ?? null);

// dm_autor → id → nome
const autor = new Map<string, string>();
{ const u = urlOf(RID.autor); let iId = -1, iN = -1;
  if (u) eachRow(await fetchResourceText(u, "latin1"),
    (h) => { const idx = mapColunas(h); iId = idx("id_autor"); iN = idx("nome"); },
    (l) => { const id = at(l, iId); if (id) autor.set(id, at(l, iN)); }); }

// dm_emenda → id → detalhes
type Em = { nr: string; ano: number | null; grupo: string; mod: string; uo: string; objeto: string };
const emenda = new Map<string, Em>();
{ const u = urlOf(RID.emenda); let iId = -1, iNr = -1, iAno = -1, iG = -1, iM = -1, iUo = -1, iOb = -1;
  if (u) eachRow(await fetchResourceText(u, "latin1"),
    (h) => { const idx = mapColunas(h); iId = idx("id_emenda"); iNr = idx("nr_emenda"); iAno = idx("ano_exercicio"); iG = idx("grupo"); iM = idx("modalidade_aplic"); iUo = idx("uo_beneficiada"); iOb = idx("objeto"); },
    (l) => { const id = at(l, iId); if (id) emenda.set(id, { nr: at(l, iNr), ano: toInt(at(l, iAno)), grupo: at(l, iG), mod: at(l, iM), uo: at(l, iUo), objeto: at(l, iOb) }); }); }
console.log(`  dims: autor ${autor.size} | emenda ${emenda.size}`);

// fato → 1 linha por emenda (maior vr_emenda; captura autor)
const best = new Map<string, { idAutor: string; vr: number }>();
const uF = urlOf(RID.fato);
if (!uF) { console.error("ft_orcamento_emenda ausente"); process.exit(1); }
let iEm = -1, iAu = -1, iVr = -1;
const totalLinhas = eachRow(await fetchResourceText(uF, "latin1"),
  (h) => { const idx = mapColunas(h); iEm = idx("id_emenda"); iAu = idx("id_autor"); iVr = idx("vr_emenda"); },
  (l) => {
    const em = at(l, iEm); if (!em) return;
    const vr = parseValorBR(at(l, iVr)) ?? 0;
    const cur = best.get(em);
    if (!cur || vr > cur.vr) best.set(em, { idAutor: at(l, iAu), vr });
  });

const erros: string[] = [];
let inseridos = 0;
let buffer: Record<string, unknown>[] = [];
for (const [em, b] of best) {
  const d = emenda.get(em);
  buffer.push({
    id_emenda: em,
    nr_emenda: d?.nr || null,
    ano: d?.ano ?? null,
    autor: autor.get(b.idAutor) || null,
    grupo: d?.grupo || null,
    modalidade: d?.mod || null,
    uo_beneficiada: d?.uo || null,
    objeto: d?.objeto || null,
    vr_emenda: b.vr,
  });
  if (buffer.length >= 500) { inseridos += await flushUpsert(client, "mg_emendas_estaduais", "id_emenda", buffer, erros); buffer = []; }
}
inseridos += await flushUpsert(client, "mg_emendas_estaduais", "id_emenda", buffer, erros);
console.log(`  fato: ${totalLinhas} linhas | emendas distintas ${best.size} | gravados ${inseridos}`);
for (const e of erros.slice(0, 3)) console.log(`  erro: ${e}`);
if (erros.length && inseridos === 0) process.exit(1);
console.log("✓ Emendas estaduais concluído");
