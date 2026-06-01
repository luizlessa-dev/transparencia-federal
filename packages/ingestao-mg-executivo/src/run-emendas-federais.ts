/**
 * CLI: ingere Emendas Federais executadas por MG (entrada de recursos). Flat.
 * Rastreio autoria → valor → objeto → órgão executor. Inclui transf. especiais.
 *   npm run ingestao-mg:emendas-federais
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { carregarCSV, colFinder, flushUpsert, finalizar } from "./ingest-util.js";
import { parseValorBR } from "./csv.js";

const URL_ =
  "https://dados.mg.gov.br/dataset/fece3d93-2fd6-46c6-862c-55f3a26924dd/resource/b39077cb-dd51-4f3b-8743-d4f4b7221b92/download/dados_gerais_emendas.csv";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const fonte = process.argv.slice(2).find((a) => /^https?:\/\//i.test(a)) ?? URL_;

const toInt = (s: string) => { const n = parseInt((s ?? "").replace(/\D/g, ""), 10); return Number.isFinite(n) ? n : null; };
const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");

console.log("▶ Ingestão Emendas Federais (MG)");
const { header, linhas } = await carregarCSV(fonte, "utf-8");
const c = colFinder(header);
const C = {
  esfera: c("esfera"), modalidade: c("modalide", "modalidade"), autoria: c("autorida", "autoria"),
  tipo: c("tipo_instrumento_juridico", "tipo_instrumento"), num: c("numero_emenda"), ano: c("ano_emenda", "ano"),
  siafi: c("codigo_siafi"), sigcon: c("codigo_sigcon_entrada", "codigo_sigcon"),
  vInd: c("valor_indicado"), vRep: c("valor_repassado"),
  objeto: c("objeto"), funcao: c("funcao_governo"), orgao: c("orgao_executor"),
};

const client = createClient(url, key, { auth: { persistSession: false } });
const erros: string[] = [];
let inseridos = 0;
let buffer: Record<string, unknown>[] = [];
for (const l of linhas) {
  const num = at(l, C.num);
  if (!num && !at(l, C.objeto)) continue;
  buffer.push({
    esfera: at(l, C.esfera) || null,
    modalidade: at(l, C.modalidade) || null,
    autoria: at(l, C.autoria) || null,
    tipo_instrumento: at(l, C.tipo) || null,
    numero_emenda: num || null,
    ano: toInt(at(l, C.ano)),
    codigo_siafi: at(l, C.siafi) || null,
    codigo_sigcon: at(l, C.sigcon) || null,
    valor_indicado: parseValorBR(at(l, C.vInd)),
    valor_repassado: parseValorBR(at(l, C.vRep)),
    objeto: at(l, C.objeto) || null,
    funcao_governo: at(l, C.funcao) || null,
    orgao_executor: at(l, C.orgao) || null,
  });
  if (buffer.length >= 500) { inseridos += await flushUpsert(client, "mg_emendas_federais", "dedupe_key", buffer, erros); buffer = []; }
}
inseridos += await flushUpsert(client, "mg_emendas_federais", "dedupe_key", buffer, erros);
const r = finalizar(linhas.length, inseridos, erros, header);
console.log(`  status ${r.status} | linhas ${r.total} | gravados ${r.inseridos}`);
for (const e of r.erros.slice(0, 5)) console.log(`  erro: ${e}`);
if (r.status === "erro") { console.log(`  header: ${header.join(" | ")}`); process.exit(1); }
