/**
 * CLI: Notas Fiscais recebidas pelo Estado de MG, AGREGADAS por fornecedor
 * (CNPJ) e ano. Varre os arquivos mensais "Notas Fiscais <Mês> <Ano>" (exclui
 * "Itens Notas") via packageShow. Nominativo → base do scorecard de fornecedor.
 *   npm run ingestao-mg:notas
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

const DS = "b1382d3a-3ddd-43d4-ab12-5c930d44bd61";
const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const client = createClient(url, key, { auth: { persistSession: false } });
const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");

console.log("▶ Notas Fiscais por fornecedor (MG)");
const pkg = await packageShow(DS);
// recursos de cabeçalho de nota (exclui "Itens Notas ...")
const notas = pkg.resources.filter((r: CkanResource) =>
  /^notas?\s+fiscais/i.test((r.name ?? "").trim()) && !/itens/i.test(r.name ?? "") && (r.url ?? "").toLowerCase().endsWith(".csv"));
console.log(`  arquivos mensais de notas: ${notas.length}`);

type Ag = { nome: string; n: number; v: number };
const agg = new Map<string, Ag>();
let totalLinhas = 0, semCnpj = 0;
for (const r of notas) {
  const ano = Number((r.name ?? "").match(/\d{4}/)?.[0]) || null;
  let iCnpj = -1, iNome = -1, iVal = -1;
  const n = eachRow(await fetchResourceText(r.url!, "utf-8"),
    (h) => { const idx = mapColunas(h); iCnpj = idx("fornecedor_cnpj_cpf"); iNome = idx("fornecedor_nome_empresarial"); iVal = idx("valor_total_com_impostos"); },
    (l) => {
      const cnpj = normCNPJ(at(l, iCnpj));
      if (!cnpj) { semCnpj++; return; }
      const k = `${cnpj}|${ano ?? ""}`;
      const a = agg.get(k) ?? { nome: at(l, iNome), n: 0, v: 0 };
      a.n++; a.v += parseValorBR(at(l, iVal)) ?? 0; if (!a.nome) a.nome = at(l, iNome); agg.set(k, a);
    });
  totalLinhas += n;
  console.log(`  ${r.name}: ${n} notas`);
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const erros: string[] = [];
let inseridos = 0;
let buffer: Record<string, unknown>[] = [];
for (const [k, a] of agg) {
  const [cnpj, anoS] = k.split("|");
  buffer.push({ cnpj_norm: cnpj, nome: a.nome || null, ano: anoS ? Number(anoS) : null, n_notas: a.n, valor_total: r2(a.v) });
  if (buffer.length >= 500) { inseridos += await flushUpsert(client, "mg_notas_fornecedor", "cnpj_norm,ano", buffer, erros); buffer = []; }
}
inseridos += await flushUpsert(client, "mg_notas_fornecedor", "cnpj_norm,ano", buffer, erros);
console.log(`  total notas ${totalLinhas} | sem CNPJ ${semCnpj} | fornecedor×ano ${agg.size} | gravados ${inseridos}`);
for (const e of erros.slice(0, 3)) console.log(`  erro: ${e}`);
if (erros.length && inseridos === 0) process.exit(1);
console.log("✓ Notas fiscais por fornecedor concluído");
