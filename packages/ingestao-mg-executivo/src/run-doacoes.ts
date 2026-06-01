/**
 * CLI: ingere Doações e comodatos ao Estado de MG (flat). Quem doa o quê.
 *   npm run ingestao-mg:doacoes
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { carregarCSV, colFinder, flushUpsert, finalizar } from "./ingest-util.js";

const URL_ =
  "https://dados.mg.gov.br/dataset/b046e36d-ae74-4f00-86eb-47caa0cfe8ec/resource/98fa6d80-a9ad-467c-a198-a371d7b0703e/download/doacoes_e_comodatos.csv";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const fonte = process.argv.slice(2).find((a) => /^https?:\/\//i.test(a)) ?? URL_;

const toInt = (s: string) => { const n = parseInt((s ?? "").replace(/\D/g, ""), 10); return Number.isFinite(n) ? n : null; };

console.log("▶ Ingestão Doações e comodatos (MG)");
const { header, linhas } = await carregarCSV(fonte, "utf-8");
const c = colFinder(header);
const C = {
  tipo: c("tipo_instrumento"), ano: c("ano_instrumento"), mes: c("mes_instrumento"),
  catValor: c("categoria_valor"), orgao: c("orgao_recebedor"), natureza: c("natureza_doador"),
  doador: c("doador_comodante"), objeto: c("objeto_descritivo"), qtd: c("quantidade_objeto"),
  vigencia: c("vigencia"), recurso: c("recurso_tjmg_ou_mpmg"),
};
const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");

const client = createClient(url, key, { auth: { persistSession: false } });
const erros: string[] = [];
let inseridos = 0;
let buffer: Record<string, unknown>[] = [];
for (const l of linhas) {
  const doador = at(l, C.doador);
  if (!doador && !at(l, C.objeto)) continue;
  buffer.push({
    tipo_instrumento: at(l, C.tipo) || null,
    ano: toInt(at(l, C.ano)),
    mes: toInt(at(l, C.mes)),
    categoria_valor: at(l, C.catValor) || null,
    orgao_recebedor: at(l, C.orgao) || null,
    natureza_doador: at(l, C.natureza) || null,
    doador: doador || null,
    objeto: at(l, C.objeto) || null,
    quantidade: at(l, C.qtd) || null,
    vigencia: at(l, C.vigencia) || null,
    recurso_tj_mp: at(l, C.recurso) || null,
  });
  if (buffer.length >= 500) { inseridos += await flushUpsert(client, "mg_doacoes", "doador,objeto,orgao_recebedor,ano,mes", buffer, erros); buffer = []; }
}
inseridos += await flushUpsert(client, "mg_doacoes", "doador,objeto,orgao_recebedor,ano,mes", buffer, erros);
const r = finalizar(linhas.length, inseridos, erros, header);
console.log(`  status ${r.status} | linhas ${r.total} | gravados ${r.inseridos}`);
for (const e of r.erros.slice(0, 5)) console.log(`  erro: ${e}`);
if (r.status === "erro") { console.log(`  header: ${header.join(" | ")}`); process.exit(1); }
