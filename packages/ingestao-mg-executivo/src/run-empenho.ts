/**
 * CLI: ingere Empenhos (pagamentos) do Estado de MG — modo ENXUTO: grava só os
 * empenhos cujo credor está na lista de sancionadas (filtra na ingestão). Foco:
 * "pagamentos a empresas sancionadas". A base completa é enorme; guardamos só o
 * recorte investigativo, agora varrendo vários anos.
 *   npm run ingestao-mg:empenho                       # anos MG_ANO_INI..FIM (def 2022-2026)
 *   npm run ingestao-mg:empenho -- "<url empenhoANO.csv>"   # 1 arquivo específico
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { carregarCSV, colFinder, flushUpsert } from "./ingest-util.js";
import { parseValorBR, parseDataBR, normCNPJ } from "./csv.js";
import { packageShow } from "./ckan-client.js";

const DS_EMPENHO = "8a9482f1-8d9e-49bd-8c58-d1574cb2843b";
const ANO_INI = Number(process.env.MG_ANO_INI ?? 2022);
const ANO_FIM = Number(process.env.MG_ANO_FIM ?? 2026);

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const urlArg = process.argv.slice(2).find((a) => /^https?:\/\//i.test(a));

const client = createClient(url, key, { auth: { persistSession: false } });
const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");

console.log("▶ Ingestão Empenho × sancionadas (MG)");

// 1. set de CNPJs sancionados
const { data: sanc, error: sErr } = await client.from("mg_empresas_sancionadas").select("cnpj_norm");
if (sErr) { console.error(`erro lendo sancionadas: ${sErr.message}`); process.exit(1); }
const cnpjsSanc = new Set((sanc ?? []).map((r) => r.cnpj_norm).filter(Boolean));
console.log(`  ${cnpjsSanc.size} CNPJs sancionados carregados`);
if (cnpjsSanc.size === 0) { console.error("Sem sancionadas no banco — rode ingestao-mg:contratos antes."); process.exit(1); }

// 2. resolve as fontes (1 arquivo via arg, ou varre anos via packageShow)
let fontes: { ano: number; url: string }[] = [];
if (urlArg) {
  const m = urlArg.match(/empenho(\d{4})/i);
  fontes = [{ ano: m ? Number(m[1]) : 0, url: urlArg }];
} else {
  const pkg = await packageShow(DS_EMPENHO);
  for (let ano = ANO_INI; ano <= ANO_FIM; ano++) {
    const r = pkg.resources.find((x) => new RegExp(`empenho${ano}\\.csv`, "i").test(x.url ?? ""));
    if (r?.url) fontes.push({ ano, url: r.url });
    else console.log(`  empenho ${ano}: recurso ausente`);
  }
}

let totalCasados = 0, totalGravados = 0;
const errosGlobais: string[] = [];

for (const f of fontes) {
  const { header, linhas } = await carregarCSV(f.url, "utf-8");
  const c = colFinder(header);
  const C = {
    ano: c("ano_de_exercicio", "ano_empenho"), num: c("numero_empenho"),
    orgao: c("unidade_orcamentaria_nome"), credor: c("razao_social_credor"),
    cnpj: c("cnpj_cpf_credor_formatado"), elemento: c("elemento_despesa_descricao"),
    fonte: c("fonte_recurso_descricao"), data: c("data_registro_doc_empenho"),
    processo: c("numero_processo_compra_siad"),
    vEmp: c("valor_despesa_empenhada"), vLiq: c("valor_despesa_liquidada"), vPago: c("valor_pago_financeiro"),
  };
  if (C.cnpj < 0 || C.credor < 0) {
    console.log(`  ⚠ empenho ${f.ano}: coluna credor/cnpj ausente — pulando. header: ${header.slice(0, 6).join(" | ")}...`);
    continue;
  }
  let casados = 0, gravados = 0;
  let buffer: Record<string, unknown>[] = [];
  for (const l of linhas) {
    const cnpj = normCNPJ(at(l, C.cnpj));
    if (!cnpjsSanc.has(cnpj)) continue; // ENXUTO: só credor sancionado
    casados++;
    buffer.push({
      ano: Number(at(l, C.ano)) || f.ano || null,
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
    if (buffer.length >= 500) { gravados += await flushUpsert(client, "mg_empenhos_sancionados", "dedupe_key", buffer, errosGlobais); buffer = []; }
  }
  gravados += await flushUpsert(client, "mg_empenhos_sancionados", "dedupe_key", buffer, errosGlobais);
  totalCasados += casados; totalGravados += gravados;
  console.log(`  empenho ${f.ano}: ${linhas.length} linhas | casaram c/ sancionada ${casados} | gravados ${gravados}`);
}

console.log(`✓ Empenho concluído | total casados ${totalCasados} | total gravados ${totalGravados}`);
for (const e of errosGlobais.slice(0, 5)) console.log(`  erro: ${e}`);
if (errosGlobais.length && totalGravados === 0) process.exit(1);
