/**
 * CLI: Compras SIAD agregadas por fornecedor (CNPJ) e ano — Executivo de MG.
 * Reduz ft_compras_contrato a 1 linha por contrato (maior ano_particao → sem
 * dupla contagem dos snapshots), resolve o contratado (dm_contratado, PJ
 * nomeada por CNPJ) e soma por CNPJ+ano. Star-schema via packageShow.
 *   npm run ingestao-mg:compras
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

const DS = "86e157db-d2c5-4151-9b16-9c5987462cba";
const RID = {
  contratado: "1818ccfb-c08a-43a1-b53a-c2cf39f698e5",
  fatoContrato: "844f0808-bfa6-4dc6-8274-9703856309eb",
};

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const client = createClient(url, key, { auth: { persistSession: false } });

const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");
const toInt = (s: string) => { const n = parseInt((s ?? "").replace(/\D/g, ""), 10); return Number.isFinite(n) ? n : null; };

console.log("▶ Compras SIAD por fornecedor (MG)");
const pkg = await packageShow(DS);
const urlOf = (rid: string) => (pkg.resources.find((r: CkanResource) => r.id === rid)?.url ?? null);

// 1. dm_contratado → id → { cnpj, nome }
const contratado = new Map<string, { cnpj: string; nome: string }>();
const uC = urlOf(RID.contratado);
if (!uC) { console.error("dm_contratado ausente"); process.exit(1); }
{
  let iId = -1, iDoc = -1, iNome = -1, iTp = -1;
  eachRow(await fetchResourceText(uC, "utf-8"),
    (h) => { const idx = mapColunas(h); iId = idx("id_contratado"); iDoc = idx("nr_documento_anonimizado"); iNome = idx("nome_anonimizado"); iTp = idx("tp_documento"); },
    (l) => { const id = at(l, iId); if (id) contratado.set(id, { cnpj: at(l, iTp) === "2" ? normCNPJ(at(l, iDoc)) : "", nome: at(l, iNome) }); });
}
console.log(`  contratados: ${contratado.size}`);

// Teto de plausibilidade POR CONTRATO. A fonte traz valores corrompidos
// esporádicos (ex.: TICKET/CEMIG em vr_atualizado, GLOBAL EAGLE em homologado —
// R$68bi/R$1,47tri). Maiores contratos REAIS de MG são concessões ~R$2,7bi
// (Rodoanel). Acima de R$3bi por contrato = corrupção → descartado e logado.
const CEIL = 3_000_000_000;

// 2. ft_compras_contrato → melhor linha por contrato (maior ano; desempate maior vr_homologado)
type Best = { idCont: string; ano: number; vrH: number; vrA: number };
const best = new Map<string, Best>();
const uF = urlOf(RID.fatoContrato);
if (!uF) { console.error("ft_compras_contrato ausente"); process.exit(1); }
let iContrato = -1, iContratado = -1, iAno = -1, iVH = -1, iVA = -1;
const totalLinhas = eachRow(await fetchResourceText(uF, "utf-8"),
  (h) => { const idx = mapColunas(h); iContrato = idx("id_contrato"); iContratado = idx("id_contratado"); iAno = idx("ano_particao"); iVH = idx("vr_homologado"); iVA = idx("vr_atualizado"); },
  (l) => {
    const idc = at(l, iContrato); if (!idc) return;
    const ano = toInt(at(l, iAno)) ?? 0;
    const vrH = parseValorBR(at(l, iVH)) ?? 0;
    const cur = best.get(idc);
    if (!cur || ano > cur.ano || (ano === cur.ano && vrH > cur.vrH)) {
      best.set(idc, { idCont: at(l, iContratado), ano, vrH, vrA: parseValorBR(at(l, iVA)) ?? 0 });
    }
  });

// 3. agrega por cnpj+ano (valor canônico = vr_homologado; teto por contrato)
type Ag = { nome: string; ano: number; n: number; vrH: number; vrA: number };
const agg = new Map<string, Ag>();
let semCnpj = 0, corrompidos = 0, vrCorrompido = 0;
for (const b of best.values()) {
  if (b.vrH > CEIL) { corrompidos++; vrCorrompido += b.vrH; continue; } // descarta valor corrompido
  const c = contratado.get(b.idCont);
  const cnpj = c?.cnpj || "";
  if (!cnpj) { semCnpj++; continue; } // pula PF/anonimizado sem CNPJ
  const k = `${cnpj}|${b.ano}`;
  const a = agg.get(k) ?? { nome: c?.nome ?? "", ano: b.ano, n: 0, vrH: 0, vrA: 0 };
  // vr_atualizado também limitado ao teto (evita propagar corrupção da coluna)
  a.n++; a.vrH += b.vrH; a.vrA += Math.min(b.vrA, CEIL); agg.set(k, a);
}
console.log(`  contratos descartados por valor corrompido (> R$3bi): ${corrompidos} (somavam R$ ${Math.round(vrCorrompido / 1e9)} bi)`);

// rebuild: limpa a tabela antes (o valor canônico mudou p/ homologado)
const del = await client.from("mg_compras_fornecedor").delete().not("id", "is", null);
if (del.error) console.log(`  ⚠ delete: ${del.error.message}`);

const r2 = (n: number) => Math.round(n * 100) / 100;
const erros: string[] = [];
let inseridos = 0;
let buffer: Record<string, unknown>[] = [];
for (const [k, a] of agg) {
  const cnpj = k.split("|")[0];
  buffer.push({ cnpj_norm: cnpj, nome: a.nome || null, ano: a.ano || null, n_contratos: a.n, vr_homologado: r2(a.vrH), vr_atualizado: r2(a.vrA) });
  if (buffer.length >= 500) { inseridos += await flushUpsert(client, "mg_compras_fornecedor", "cnpj_norm,ano", buffer, erros); buffer = []; }
}
inseridos += await flushUpsert(client, "mg_compras_fornecedor", "cnpj_norm,ano", buffer, erros);
console.log(`  fato: ${totalLinhas} linhas | contratos distintos ${best.size} | sem CNPJ (PF) ${semCnpj} | fornecedor×ano ${agg.size} | gravados ${inseridos}`);
for (const e of erros.slice(0, 3)) console.log(`  erro: ${e}`);
if (erros.length && inseridos === 0) process.exit(1);
console.log("✓ Compras por fornecedor concluído");
