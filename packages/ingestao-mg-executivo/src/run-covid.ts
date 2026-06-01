/**
 * CLI: ingere Compras Emergenciais COVID-19 (flat). Foco: sobrepreço (unitário
 * homologado × referência) e cruzamento com sancionadas.
 *   npm run ingestao-mg:covid
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { carregarCSV, colFinder, flushUpsert, finalizar } from "./ingest-util.js";
import { parseValorBR, parseDataBR, normCNPJ } from "./csv.js";

const COVID_URL =
  "https://dados.mg.gov.br/dataset/20984979-ae51-4ad7-82a0-6a9c670a82f8/resource/72d031e9-2753-469a-acfa-2d67417a2f49/download/compras-emergenciais-covid-19.csv";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const fonte = process.argv.slice(2).find((a) => /^https?:\/\//i.test(a)) ?? COVID_URL;

console.log("▶ Ingestão Compras Emergenciais COVID-19 (MG)");
const { header, linhas } = await carregarCSV(fonte, "utf-8");
const c = colFinder(header);
const C = {
  proc: c("numero_processo_compra"), objeto: c("objeto_processo"),
  orgaoDem: c("orgao_demandante"), orgaoCont: c("orgao_contrato"), situacao: c("situacao_processo"),
  procedimento: c("procedimento_contratacao"), contrato: c("numero_contrato"),
  dataPub: c("data_publicacao"), contratado: c("contratado"), cnpj: c("cpf_cnpj_contratado"),
  item: c("item_material_servico"), linha: c("linha_fornecimento"), cidade: c("cidade_entrega"),
  qtd: c("quantidade_homologada"), vRefU: c("valor_referencia_unitario"), vHomU: c("valor_homologado_unitario"),
  vRef: c("valor_referencia"), vHom: c("valor_homologado"),
};
const at = (l: string[], i: number) => { const v = i >= 0 ? (l[i] ?? "").trim() : ""; return v === "NA" ? "" : v; };

const client = createClient(url, key, { auth: { persistSession: false } });
const erros: string[] = [];
let inseridos = 0;
let buffer: Record<string, unknown>[] = [];
for (const l of linhas) {
  const proc = at(l, C.proc);
  if (!proc) continue;
  buffer.push({
    numero_processo: proc,
    objeto: at(l, C.objeto) || null,
    orgao_demandante: at(l, C.orgaoDem) || null,
    orgao_contrato: at(l, C.orgaoCont) || null,
    situacao: at(l, C.situacao) || null,
    procedimento: at(l, C.procedimento) || null,
    numero_contrato: at(l, C.contrato) || null,
    data_publicacao: parseDataBR(at(l, C.dataPub)),
    contratado: at(l, C.contratado) || null,
    cnpj_norm: normCNPJ(at(l, C.cnpj)) || null,
    item: at(l, C.item) || null,
    linha_fornecimento: at(l, C.linha) || null,
    cidade_entrega: at(l, C.cidade) || null,
    quantidade: parseValorBR(at(l, C.qtd)),
    valor_ref_unit: parseValorBR(at(l, C.vRefU)),
    valor_hom_unit: parseValorBR(at(l, C.vHomU)),
    valor_referencia: parseValorBR(at(l, C.vRef)),
    valor_homologado: parseValorBR(at(l, C.vHom)),
  });
  if (buffer.length >= 500) { inseridos += await flushUpsert(client, "mg_covid_compras", "numero_processo,item,cnpj_norm,valor_homologado", buffer, erros); buffer = []; }
}
inseridos += await flushUpsert(client, "mg_covid_compras", "numero_processo,item,cnpj_norm,valor_homologado", buffer, erros);
const r = finalizar(linhas.length, inseridos, erros, header);
console.log(`  status ${r.status} | linhas ${r.total} | gravados ${r.inseridos}`);
for (const e of r.erros.slice(0, 5)) console.log(`  erro: ${e}`);
if (r.status === "erro") { console.log(`  header: ${header.join(" | ")}`); process.exit(1); }
