/**
 * CLI: agregados de contexto MG (diárias por órgão, restos a pagar por órgão,
 * serviço da dívida por tipo). Favorecido é anonimizado na fonte → só somatório.
 *   npm run ingestao-mg:agregados            (todos)
 *   npm run ingestao-mg:agregados -- diarias  (subconjunto: diarias|restos|divida)
 * Anos: MG_ANO_INI..MG_ANO_FIM (default 2022..2026). Dívida = arquivo único.
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { packageShow, fetchResourceText, type CkanResource } from "./ckan-client.js";
import { parseLinha, mapColunas, parseValorBR, stripBOM } from "./csv.js";
import { flushUpsert } from "./ingest-util.js";

const DS_DIARIAS = "dd6e9dcc-b86d-4318-b140-4ae4c9b060f3";
const DS_DIVIDA = "6972dbe5-82c0-4ac8-aac9-4258efc3e483";
const DS_RESTOS = "029a2c5a-2e9b-46d9-b7b5-5260d05d7f5d";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const client = createClient(url, key, { auth: { persistSession: false } });

const ANO_INI = Number(process.env.MG_ANO_INI ?? 2022);
const ANO_FIM = Number(process.env.MG_ANO_FIM ?? 2026);
const ANOS: number[] = [];
for (let a = ANO_INI; a <= ANO_FIM; a++) ANOS.push(a);

const alvos = process.argv.slice(2).filter((a) => !/^https?:\/\//i.test(a)).map((a) => a.toLowerCase());
const quer = (nome: string) => alvos.length === 0 || alvos.includes(nome);

const toInt = (s: string | undefined) => { const n = parseInt((s ?? "").replace(/[^\d-]/g, ""), 10); return Number.isFinite(n) ? n : null; };
const r2 = (n: number) => Math.round(n * 100) / 100;
const at = (l: string[], i: number) => (i >= 0 ? l[i] : undefined);

/** Itera linhas do CSV sem materializar todo o array (economia de heap). */
function eachRow(texto: string, onHeader: (h: string[]) => void, onRow: (cols: string[]) => void): number {
  const clean = stripBOM(texto).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let start = 0, first = true, n = 0;
  for (let i = 0; i <= clean.length; i++) {
    if (i === clean.length || clean[i] === "\n") {
      const line = clean.slice(start, i); start = i + 1;
      if (line.trim().length === 0) continue;
      const cols = parseLinha(line, ";");
      if (first) { onHeader(cols); first = false; } else { onRow(cols); n++; }
    }
  }
  return n;
}

function urlPorNome(res: CkanResource[], teste: RegExp): string | null {
  const r = res.find((x) => teste.test((x.name ?? "").trim()));
  return r?.url ?? null;
}

/** dim Unidade Orçamentária → Map<id_unidade_orc, {cd, nome, sigla}>. */
async function carregarUnidades(res: CkanResource[]): Promise<Map<string, { cd: number | null; nome: string; sigla: string }>> {
  const u = urlPorNome(res, /^unidade\s+or/i);
  const m = new Map<string, { cd: number | null; nome: string; sigla: string }>();
  if (!u) { console.log("  ⚠ dim Unidade Orçamentária não encontrada"); return m; }
  let idx: (n: string) => number = () => -1;
  let iId = -1, iCd = -1, iNome = -1, iSigla = -1;
  eachRow(await fetchResourceText(u),
    (h) => { idx = mapColunas(h); iId = idx("id_unidade_orc"); iCd = idx("cd_unidade_orc"); iNome = idx("nome"); iSigla = idx("sigla"); },
    (l) => { const id = at(l, iId); if (id) m.set(id, { cd: toInt(at(l, iCd)), nome: (at(l, iNome) ?? "").trim(), sigla: (at(l, iSigla) ?? "").trim() }); });
  return m;
}

async function gravar(tabela: string, onConflict: string, rows: Record<string, unknown>[]): Promise<void> {
  const erros: string[] = [];
  let n = 0;
  for (let i = 0; i < rows.length; i += 500) n += await flushUpsert(client, tabela, onConflict, rows.slice(i, i + 500), erros);
  console.log(`  ✓ ${tabela}: ${n}/${rows.length} gravados${erros.length ? ` | erros: ${erros.slice(0, 2).join("; ")}` : ""}`);
}

// ── Diárias por órgão/ano ───────────────────────────────────────────────────
async function aggDiarias() {
  console.log("▶ Diárias por órgão");
  const pkg = await packageShow(DS_DIARIAS);
  const uni = await carregarUnidades(pkg.resources);
  type A = { ano: number; cd: number | null; orgao: string | null; sigla: string | null; emp: number; liq: number; pag: number; q: number };
  const agg = new Map<string, A>();
  for (const ano of ANOS) {
    const u = urlPorNome(pkg.resources, new RegExp(`^Di[aá]rias\\s+${ano}$`, "i"));
    if (!u) { console.log(`  diárias ${ano}: ausente`); continue; }
    let iU = -1, iE = -1, iL = -1, iP = -1;
    const n = eachRow(await fetchResourceText(u),
      (h) => { const idx = mapColunas(h); iU = idx("id_unidade_orc"); iE = idx("vr_empenhado"); iL = idx("vr_liquidado"); iP = idx("vr_pago"); },
      (l) => {
        const d = uni.get(at(l, iU) ?? ""); const cd = d?.cd ?? null;
        const k = `${ano}|${cd}`; let a = agg.get(k);
        if (!a) { a = { ano, cd, orgao: d?.nome ?? null, sigla: d?.sigla ?? null, emp: 0, liq: 0, pag: 0, q: 0 }; agg.set(k, a); }
        a.emp += parseValorBR(at(l, iE)) ?? 0; a.liq += parseValorBR(at(l, iL)) ?? 0; a.pag += parseValorBR(at(l, iP)) ?? 0; a.q++;
      });
    console.log(`  diárias ${ano}: ${n} linhas`);
  }
  await gravar("mg_diarias_orgao", "ano,cd_unidade_orc",
    [...agg.values()].map((a) => ({ ano: a.ano, cd_unidade_orc: a.cd, orgao: a.orgao, sigla: a.sigla, vr_empenhado: r2(a.emp), vr_liquidado: r2(a.liq), vr_pago: r2(a.pag), qtd_registros: a.q })));
}

// ── Restos a pagar por órgão/ano ─────────────────────────────────────────────
async function aggRestos() {
  console.log("▶ Restos a pagar por órgão");
  const pkg = await packageShow(DS_RESTOS);
  const uni = await carregarUnidades(pkg.resources);
  type A = { ano: number; cd: number | null; orgao: string | null; sigla: string | null; np: number; pr: number; pg: number; q: number };
  const agg = new Map<string, A>();
  for (const ano of ANOS) {
    const u = urlPorNome(pkg.resources, new RegExp(`^ft_restos_pagar\\s+${ano}$`, "i"));
    if (!u) { console.log(`  restos ${ano}: ausente`); continue; }
    let iU = -1, iNP = -1, iPR = -1, iPG = -1;
    const n = eachRow(await fetchResourceText(u),
      (h) => { const idx = mapColunas(h); iU = idx("id_unidade_orc"); iNP = idx("vr_nao_processado"); iPR = idx("vr_processado"); iPG = idx("vr_pago"); },
      (l) => {
        const d = uni.get(at(l, iU) ?? ""); const cd = d?.cd ?? null;
        const k = `${ano}|${cd}`; let a = agg.get(k);
        if (!a) { a = { ano, cd, orgao: d?.nome ?? null, sigla: d?.sigla ?? null, np: 0, pr: 0, pg: 0, q: 0 }; agg.set(k, a); }
        a.np += parseValorBR(at(l, iNP)) ?? 0; a.pr += parseValorBR(at(l, iPR)) ?? 0; a.pg += parseValorBR(at(l, iPG)) ?? 0; a.q++;
      });
    console.log(`  restos ${ano}: ${n} linhas`);
  }
  await gravar("mg_restos_orgao", "ano,cd_unidade_orc",
    [...agg.values()].map((a) => ({ ano: a.ano, cd_unidade_orc: a.cd, orgao: a.orgao, sigla: a.sigla, vr_nao_processado: r2(a.np), vr_processado: r2(a.pr), vr_pago: r2(a.pg), qtd_registros: a.q })));
}

// ── Serviço da dívida por tipo/ano (arquivo único, todos os anos) ────────────
async function aggDivida() {
  console.log("▶ Serviço da dívida por tipo");
  const pkg = await packageShow(DS_DIVIDA);
  const tipoUrl = urlPorNome(pkg.resources, /^tipo\s+d[ií]vida$/i);
  const tipo = new Map<string, { cd: number | null; nome: string }>();
  let tId = -1, tCd = -1, tN = -1;
  if (tipoUrl) eachRow(await fetchResourceText(tipoUrl),
    (h) => { const idx = mapColunas(h); tId = idx("id_tipo"); tCd = idx("cd_tipo"); tN = idx("nome"); },
    (l) => { const id = at(l, tId); if (id) tipo.set(id, { cd: toInt(at(l, tCd)), nome: (at(l, tN) ?? "").trim() }); });
  const fatoUrl = urlPorNome(pkg.resources, /^d[ií]vida\s+p[uú]blica$/i);
  if (!fatoUrl) { console.log("  ⚠ fato Dívida Pública não encontrado"); return; }
  type A = { ano: number; cd: number | null; tipo: string | null; jur: number; amo: number; q: number };
  const agg = new Map<string, A>();
  let iT = -1, iA = -1, iJ = -1, iAm = -1;
  const n = eachRow(await fetchResourceText(fatoUrl),
    (h) => { const idx = mapColunas(h); iT = idx("id_tipo"); iA = idx("ano_particao"); iJ = idx("vr_juros"); iAm = idx("vr_amortizacao"); },
    (l) => {
      const ano = toInt(at(l, iA)); if (ano == null || ano < 2010) return;
      const t = tipo.get(at(l, iT) ?? ""); const cd = t?.cd ?? toInt(at(l, iT));
      const k = `${ano}|${cd}`; let a = agg.get(k);
      if (!a) { a = { ano, cd, tipo: t?.nome ?? null, jur: 0, amo: 0, q: 0 }; agg.set(k, a); }
      a.jur += parseValorBR(at(l, iJ)) ?? 0; a.amo += parseValorBR(at(l, iAm)) ?? 0; a.q++;
    });
  console.log(`  dívida: ${n} linhas`);
  await gravar("mg_divida_tipo", "ano,cd_tipo",
    [...agg.values()].map((a) => ({ ano: a.ano, cd_tipo: a.cd, tipo: a.tipo, vr_juros: r2(a.jur), vr_amortizacao: r2(a.amo), qtd_registros: a.q })));
}

if (quer("diarias")) await aggDiarias();
if (quer("restos")) await aggRestos();
if (quer("divida")) await aggDivida();
console.log("✓ Agregados concluídos");
