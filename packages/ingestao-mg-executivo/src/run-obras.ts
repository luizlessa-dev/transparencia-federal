/**
 * CLI: ingere Obras do DER-MG (portal_obras/contratos.csv, flat).
 * Cruza com sancionadas (view mg_obras_sancionadas) e expõe paradas (mg_obras_paradas).
 *   npm run ingestao-mg:obras
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { carregarCSV, colFinder, flushUpsert, finalizar } from "./ingest-util.js";
import { parseValorBR, parseDataBR, normCNPJ } from "./csv.js";

const OBRAS_URL =
  "https://dados.mg.gov.br/dataset/78b78e97-f94c-421e-9d2e-71b16533857d/resource/0aea8831-9c53-463c-a2d3-0c6ccf87ad95/download/contratos.csv";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }
const fonte = process.argv.slice(2).find((a) => /^https?:\/\//i.test(a)) ?? OBRAS_URL;

console.log("▶ Ingestão Obras (DER-MG)");
const { header, linhas } = await carregarCSV(fonte, "utf-8");
const c = colFinder(header);
const C = {
  contrato: c("contrato"), objeto: c("objeto"), empresa: c("empresa"), cnpj: c("cnpj"),
  orgao: c("orgao_entidade_contratante"), setor: c("setor"), situacao: c("situacao"),
  modalidade: c("modalidade_de_licitacao"), municipios: c("municipios"),
  dataAss: c("data_assinatura"), diasPar: c("dias_paralisados"), diasAtu: c("dias_atuais"),
  valorTotal: c("valor_total_do_contrato"), totalMedido: c("total_medido"),
  pctExec: c("percentual_execucao_contrato"),
};
const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");
const toInt = (s: string) => { const n = parseInt(s.replace(/\D/g, ""), 10); return Number.isFinite(n) ? n : null; };

const client = createClient(url, key, { auth: { persistSession: false } });
const erros: string[] = [];
let inseridos = 0;
let buffer: Record<string, unknown>[] = [];
for (const l of linhas) {
  const contrato = at(l, C.contrato);
  if (!contrato) continue;
  buffer.push({
    contrato,
    objeto: at(l, C.objeto) || null,
    empresa: at(l, C.empresa) || null,
    cnpj_norm: normCNPJ(at(l, C.cnpj)) || null,
    orgao: at(l, C.orgao) || null,
    setor: at(l, C.setor) || null,
    situacao: at(l, C.situacao) || null,
    modalidade: at(l, C.modalidade) || null,
    municipios: at(l, C.municipios) || null,
    data_assinatura: parseDataBR(at(l, C.dataAss)),
    dias_paralisados: toInt(at(l, C.diasPar)),
    dias_atuais: toInt(at(l, C.diasAtu)),
    valor_total: parseValorBR(at(l, C.valorTotal)),
    total_medido: parseValorBR(at(l, C.totalMedido)),
    percentual_execucao: parseValorBR(at(l, C.pctExec)),
  });
  if (buffer.length >= 500) { inseridos += await flushUpsert(client, "mg_obras", "contrato,cnpj_norm", buffer, erros); buffer = []; }
}
inseridos += await flushUpsert(client, "mg_obras", "contrato,cnpj_norm", buffer, erros);
const r = finalizar(linhas.length, inseridos, erros, header);
console.log(`  status ${r.status} | linhas ${r.total} | gravados ${r.inseridos}`);
for (const e of r.erros.slice(0, 5)) console.log(`  erro: ${e}`);
if (r.status === "erro") { console.log(`  header: ${header.join(" | ")}`); process.exit(1); }
