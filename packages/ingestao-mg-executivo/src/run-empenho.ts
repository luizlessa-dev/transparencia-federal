/**
 * CLI: ingere Empenhos (pagamentos) do Estado de MG — modo ENXUTO: grava só os
 * empenhos cujo credor está na lista de sancionadas (filtra na ingestão). Foco:
 * "pagamentos a empresas sancionadas". A base completa de empenhos é enorme;
 * aqui guardamos só o recorte investigativo.
 *   npm run ingestao-mg:empenho                      # empenho 2026 (default)
 *   npm run ingestao-mg:empenho -- "<url empenhoANO.csv>"
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { carregarCSV, colFinder, flushUpsert, finalizar } from "./ingest-util.js";
import { parseValorBR, parseDataBR, normCNPJ } from "./csv.js";

const EMPENHO_2026_URL =
  "https://dados.mg.gov.br/dataset/8a9482f1-8d9e-49bd-8c58-d1574cb2843b/resource/c5edcee8-e67f-4352-b499-d578625669b4/download/empenho2026.csv";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const fonte = process.argv.slice(2).find((a) => /^https?:\/\//i.test(a)) ?? EMPENHO_2026_URL;

const client = createClient(url, key, { auth: { persistSession: false } });

console.log("▶ Ingestão Empenho × sancionadas (MG)");

// 1. set de CNPJs sancionados
const { data: sanc, error: sErr } = await client.from("mg_empresas_sancionadas").select("cnpj_norm");
if (sErr) { console.error(`erro lendo sancionadas: ${sErr.message}`); process.exit(1); }
const cnpjsSanc = new Set((sanc ?? []).map((r) => r.cnpj_norm).filter(Boolean));
console.log(`  ${cnpjsSanc.size} CNPJs sancionados carregados`);
if (cnpjsSanc.size === 0) { console.error("Sem sancionadas no banco — rode ingestao-mg:contratos antes."); process.exit(1); }

// 2. stream empenho, filtrando por credor sancionado
const { header, linhas } = await carregarCSV(fonte, "utf-8");
const c = colFinder(header);
const C = {
  ano: c("ano_de_exercicio", "ano_empenho"), num: c("numero_empenho"),
  orgao: c("unidade_orcamentaria_nome"), credor: c("razao_social_credor"),
  cnpj: c("cnpj_cpf_credor_formatado"), elemento: c("elemento_despesa_descricao"),
  fonte: c("fonte_recurso_descricao"), data: c("data_registro_doc_empenho"),
  processo: c("numero_processo_compra_siad"),
  vEmp: c("valor_despesa_empenhada"), vLiq: c("valor_despesa_liquidada"), vPago: c("valor_pago_financeiro"),
};
const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");

const erros: string[] = [];
let inseridos = 0;
let casados = 0;
let buffer: Record<string, unknown>[] = [];
for (const l of linhas) {
  const cnpj = normCNPJ(at(l, C.cnpj));
  if (!cnpjsSanc.has(cnpj)) continue; // ENXUTO: só credor sancionado
  casados++;
  buffer.push({
    ano: Number(at(l, C.ano)) || null,
    numero_empenho: at(l, C.num) || null,
    orgao: at(l, C.orgao) || null,
    credor: at(l, C.credor) || null,
    cnpj_norm: cnpj || null,
    elemento_despesa: at(l, C.elemento) || null,
    fonte_recurso: at(l, C.fonte) || null,
    data_registro: parseDataBR(at(l, C.data)),
    numero_processo: at(l, C.processo) || null,
    valor_empenhado: parseValorBR(at(l, C.vEmp)),
    valor_liquidado: parseValorBR(at(l, C.vLiq)),
    valor_pago: parseValorBR(at(l, C.vPago)),
  });
  if (buffer.length >= 500) { inseridos += await flushUpsert(client, "mg_empenhos_sancionados", "ano,numero_empenho,orgao", buffer, erros); buffer = []; }
}
inseridos += await flushUpsert(client, "mg_empenhos_sancionados", "ano,numero_empenho,orgao", buffer, erros);
const r = finalizar(linhas.length, inseridos, erros, header);
console.log(`  status ${r.status} | linhas lidas ${r.total} | casaram c/ sancionada ${casados} | gravados ${r.inseridos}`);
for (const e of r.erros.slice(0, 5)) console.log(`  erro: ${e}`);
if (r.status === "erro") { console.log(`  header: ${header.join(" | ")}`); process.exit(1); }
