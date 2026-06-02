/**
 * run-nf-partidos.ts
 * Ingere o dataset de notas fiscais dos diretórios nacionais dos partidos.
 *
 * Cobre TODOS os fornecedores (não só fundações), identificando automaticamente
 * quais pagamentos foram para as 25 fundações conhecidas.
 *
 * Fonte: prestacao_contas_anual_partidaria_notafiscal_{ANO}.zip
 * URL:   https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas_anual_partidaria/
 *
 * Uso:
 *   CSV_NF=/Users/luizlessa/tf-spike-fundacoes/nf_2024.zip \
 *   ANO=2024 npm run nf:ts -w @transparencia/ingestao-tse-fundacoes
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";
import { createInterface } from "readline";
import { existsSync } from "fs";
import { execSync, spawn } from "child_process";
import { join } from "path";
import { tmpdir } from "os";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("Env vars ausentes."); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const ANO   = parseInt(process.env.ANO ?? "2024", 10);
const LOTE  = 300;
const ARQUIVO_BR = `despesa_anual_partidaria_nf_${ANO}_BR.csv`;
const ZIP_URL = `https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas_anual_partidaria/prestacao_contas_anual_partidaria_notafiscal_${ANO}.zip`;

// ─────────────────────────────────────────────────────────────────────────────
// Colunas: DT_GERACAO;HH_GERACAO;AA_EXERCICIO;SG_UF;SG_PARTIDO;NR_CNPJ_PRESTADOR_CONTA;
//           SQ_DESPESA;CD_TIPO_DESPESA;DS_TIPO_DESPESA;NR_CPF_CNPJ_FORNECEDOR;
//           NR_DOCUMENTO;VR_DOCUMENTO;DT_PAGAMENTO;NM_URL
// ─────────────────────────────────────────────────────────────────────────────
const COLUNAS = [
  "DT_GERACAO","HH_GERACAO","AA_EXERCICIO","SG_UF","SG_PARTIDO",
  "NR_CNPJ_PRESTADOR_CONTA","SQ_DESPESA","CD_TIPO_DESPESA","DS_TIPO_DESPESA",
  "NR_CPF_CNPJ_FORNECEDOR","NR_DOCUMENTO","VR_DOCUMENTO","DT_PAGAMENTO","NM_URL",
];
const C = Object.fromEntries(COLUNAS.map((c, i) => [c, i]));

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "", inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === ';' && !inQ) { fields.push(cur); cur = ""; }
    else cur += ch;
  }
  fields.push(cur);
  return fields.map(f => f.replace(/^"|"$/g, "").trim());
}

function sanitize(v: string): string | null {
  if (!v || v === "#NULO#" || v === "#NULO") return null;
  return v.trim() || null;
}
function parseBRL(v: string): number {
  const n = parseFloat((v ?? "0").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}
function parseDate(v: string): string | null {
  const m = (v ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolver ZIP
// ─────────────────────────────────────────────────────────────────────────────
function resolverZIP(): string {
  const local = process.env.CSV_NF;
  if (local && existsSync(local)) { console.log(`ZIP local: ${local}`); return local; }
  const tmp = join(tmpdir(), "tf-fundacoes-nf");
  const zip = join(tmp, `nf_${ANO}.zip`);
  if (existsSync(zip)) { console.log(`ZIP já existe: ${zip}`); return zip; }
  console.log(`Baixando ${ZIP_URL}...`);
  execSync(`mkdir -p ${tmp} && curl -sL -o ${zip} "${ZIP_URL}"`);
  return zip;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📑 NFs dos partidos nacionais — exercício ${ANO}\n`);

  const zipPath = resolverZIP();

  // Carregar CNPJs das fundações para flag automática
  const { data: fndData } = await sb.from("fundacoes_partidarias").select("cnpj");
  const cnpjsFundacoes = new Set((fndData ?? []).map(r => (r.cnpj as string).replace(/\D/g, "")));
  console.log(`Fundações cadastradas: ${cnpjsFundacoes.size}\n`);

  // Stream do CSV BR via iconv
  const icov = spawn("bash", ["-c", `unzip -p "${zipPath}" "${ARQUIVO_BR}" | iconv -f LATIN1 -t UTF-8`]);
  const rl = createInterface({ input: icov.stdout, crlfDelay: Infinity });

  let lote: Record<string, unknown>[] = [];
  let totalInseridos = 0;
  let totalLinhas = 0;
  let totalBR = 0;
  let header = true;
  let rowIdx = 0;

  // Upload sequencial — evita deadlocks em upsert concorrente
  async function uploadBatch(batch: Record<string, unknown>[]) {
    const { error } = await sb.from("fundacoes_nf_partidos")
      .upsert(batch, { onConflict: "sq_despesa,aa_exercicio,cnpj_partido,nr_documento" });
    if (error) {
      // Fallback: ignorar conflitos e inserir o que der
      const { error: e2 } = await sb.from("fundacoes_nf_partidos").insert(batch).select("id");
      if (e2) console.error("\n  ❌", e2.message.slice(0, 80));
      else { totalInseridos += batch.length; process.stdout.write(`\r  Inseridos: ${totalInseridos.toLocaleString("pt-BR")}`); }
    } else {
      totalInseridos += batch.length;
      process.stdout.write(`\r  Inseridos: ${totalInseridos.toLocaleString("pt-BR")}`);
    }
  }

  for await (const line of rl) {
    if (header) { header = false; continue; }
    if (!line.trim()) continue;
    totalLinhas++;

    const f = parseLine(line);
    const cnpjPartido = (f[C.NR_CNPJ_PRESTADOR_CONTA] ?? "").replace(/\D/g, "");
    if ((f[C.SG_UF] ?? "").trim() !== "BR") continue;
    totalBR++;

    const sq = parseInt((f[C.SQ_DESPESA] ?? "").trim(), 10);
    if (isNaN(sq)) continue;

    const cnpjFornecedor = (f[C.NR_CPF_CNPJ_FORNECEDOR] ?? "").replace(/\D/g, "");
    const ehFundacao = cnpjsFundacoes.has(cnpjFornecedor);
    // nr_documento com fallback único para NULL
    const nrDoc = sanitize(f[C.NR_DOCUMENTO]) ?? `AUTO_${sq}_${rowIdx++}`;

    lote.push({
      sq_despesa:          sq,
      aa_exercicio:        ANO,
      cnpj_partido:        cnpjPartido,
      sg_partido:          sanitize(f[C.SG_PARTIDO]),
      uf:                  "BR",
      nr_documento:        nrDoc,
      cd_tipo_despesa:     sanitize(f[C.CD_TIPO_DESPESA]),
      ds_tipo_despesa:     sanitize(f[C.DS_TIPO_DESPESA]),
      vr_documento:        parseBRL(f[C.VR_DOCUMENTO]),
      dt_pagamento:        parseDate(f[C.DT_PAGAMENTO]),
      url_pdf:             sanitize(f[C.NM_URL]),
      cnpj_fornecedor:     cnpjFornecedor || null,
      tipo_fornecedor:     cnpjFornecedor.length === 14 ? "PJ" : cnpjFornecedor.length === 11 ? "PF" : "desconhecido",
      eh_repasse_fundacao: ehFundacao,
      fundacao_cnpj:       ehFundacao ? cnpjFornecedor : null,
      atualizado_em:       new Date().toISOString(),
    });

    if (lote.length >= LOTE) {
      const batch = lote; lote = [];
      await uploadBatch(batch); // sequencial
    }
  }

  if (lote.length) await uploadBatch(lote);

  console.log(`\n\n✅ Concluído.`);
  console.log(`   Linhas processadas : ${totalLinhas.toLocaleString("pt-BR")}`);
  console.log(`   NFs inseridas      : ${totalInseridos.toLocaleString("pt-BR")}`);

  // Resumo por tipo de despesa
  const { data: resumo } = await sb
    .from("fundacoes_nf_partidos")
    .select("ds_tipo_despesa, vr_documento")
    .eq("aa_exercicio", ANO);

  if (resumo) {
    const agg: Record<string, number> = {};
    for (const r of resumo) {
      const tipo = (r.ds_tipo_despesa as string | null) ?? "OUTROS";
      agg[tipo] = (agg[tipo] ?? 0) + Number(r.vr_documento ?? 0);
    }
    const sorted = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log(`\n   Top 10 tipos de despesa:`);
    for (const [tipo, valor] of sorted) {
      console.log(`     ${tipo.padEnd(55)} R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
    }
  }
}

main().catch(console.error);
