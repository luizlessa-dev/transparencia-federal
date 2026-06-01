/**
 * CLI: ingere Terceirizados do Estado de MG, AGREGANDO por empresa/órgão/mês.
 * NÃO armazena nomes individuais (LGPD / sem interesse público nominal). Foco:
 * quantos terceirizados cada empresa tem em cada órgão, e quais são sancionadas.
 *   npm run ingestao-mg:terceirizados                  # 2026 (default)
 *   npm run ingestao-mg:terceirizados -- "<url terceirizados_ANO.csv>"
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { carregarCSV, colFinder, flushUpsert, finalizar } from "./ingest-util.js";
import { parseDataBR, normCNPJ } from "./csv.js";

const TERCEIR_2026_URL =
  "https://dados.mg.gov.br/dataset/0f63932c-dbb7-40ea-9e6e-72806c706fd0/resource/51ff37db-5f34-45f0-b710-d2a9d2883648/download/terceirizados_2026.csv";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const fonte = process.argv.slice(2).find((a) => /^https?:\/\//i.test(a)) ?? TERCEIR_2026_URL;

console.log("▶ Ingestão Terceirizados (agregado por empresa/órgão/mês)");
const { header, linhas } = await carregarCSV(fonte, "utf-8");
const c = colFinder(header);
const C = {
  orgao: c("orgao"), empresa: c("empresa"), cnpj: c("cnpj_empresa"), mes: c("mes_referencia"),
};
const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");

// Agrega em memória: chave cnpj|orgao|mes → {empresa, qtd}
type Ag = { empresa: string; cnpj: string; orgao: string; mes: string | null; qtd: number };
const mapa = new Map<string, Ag>();
for (const l of linhas) {
  const cnpj = normCNPJ(at(l, C.cnpj));
  const orgao = at(l, C.orgao);
  const mes = parseDataBR(at(l, C.mes));
  const chave = `${cnpj}|${orgao}|${mes ?? ""}`;
  const cur = mapa.get(chave);
  if (cur) cur.qtd++;
  else mapa.set(chave, { empresa: at(l, C.empresa), cnpj, orgao, mes, qtd: 1 });
}
console.log(`  ${linhas.length} vínculos → ${mapa.size} combos empresa/órgão/mês`);

const client = createClient(url, key, { auth: { persistSession: false } });
const erros: string[] = [];
let inseridos = 0;
let buffer: Record<string, unknown>[] = [];
for (const a of mapa.values()) {
  buffer.push({
    empresa: a.empresa || null,
    cnpj_norm: a.cnpj || null,
    orgao: a.orgao || null,
    mes_referencia: a.mes,
    qtd_trabalhadores: a.qtd,
  });
  if (buffer.length >= 500) { inseridos += await flushUpsert(client, "mg_terceirizados", "cnpj_norm,orgao,mes_referencia", buffer, erros); buffer = []; }
}
inseridos += await flushUpsert(client, "mg_terceirizados", "cnpj_norm,orgao,mes_referencia", buffer, erros);
const r = finalizar(mapa.size, inseridos, erros, header);
console.log(`  status ${r.status} | combos ${r.total} | gravados ${r.inseridos}`);
for (const e of r.erros.slice(0, 5)) console.log(`  erro: ${e}`);
if (r.status === "erro") { console.log(`  header: ${header.join(" | ")}`); process.exit(1); }
