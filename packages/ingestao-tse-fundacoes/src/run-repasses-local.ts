/**
 * run-repasses-local.ts
 * Descobre as fundações partidárias a partir do dataset TSE (fonte autoritativa)
 * e ingere todos os repasses partido→fundação no Supabase.
 *
 * Estratégia em 2 passadas sobre o CSV:
 *   Passada 1 (descoberta): identifica CNPJs classificados como "FUNDAÇÃO PARTIDÁRIA"
 *                           e popula cadastro mínimo em fundacoes_partidarias.
 *   Passada 2 (repasses):   captura TODA linha cujo fornecedor é uma fundação
 *                           descoberta — inclusive aluguel/serviço (caixa circular).
 *
 * Os CNPJs NUNCA são hardcoded — vêm sempre da fonte. O enriquecimento de
 * endereço/QSA fica a cargo de enrich-brasilapi.ts (passo separado).
 *
 * Uso:
 *   CSV_PATH=/Users/luizlessa/tf-spike-fundacoes/despesa_anual_2024_BR.csv \
 *   ANO=2024 npm run repasses:ts -w @transparencia/ingestao-tse-fundacoes
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";
import { existsSync } from "fs";
import { createInterface } from "readline";
import { execSync, spawn } from "child_process";
import { join } from "path";
import { tmpdir } from "os";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const ANO        = parseInt(process.env.ANO ?? "2024", 10);
const LOTE       = 300;
const CSV_URL    = `https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas_anual_partidaria/prestacao_contas_anual_partidaria_${ANO}.zip`;
const ARQUIVO_BR = `despesa_anual_${ANO}_BR.csv`;

// ─────────────────────────────────────────────────────────
// CSV: colunas, parsing
// ─────────────────────────────────────────────────────────
const COLUNAS = [
  "DT_GERACAO","HH_GERACAO","AA_EXERCICIO","TP_DESPESA",
  "CD_TP_ESFERA_PARTIDARIA","DS_TP_ESFERA_PARTIDARIA","SG_UF","CD_MUNICIPIO",
  "NM_MUNICIPIO","NR_ZONA","NR_CNPJ_PRESTADOR_CONTA","SG_PARTIDO","NM_PARTIDO",
  "CD_TP_DOCUMENTO","DS_TP_DOCUMENTO","NR_DOCUMENTO","AA_AIDF","NR_AIDF",
  "CD_TP_FORNECEDOR","DS_TP_FORNECEDOR","NR_CPF_CNPJ_FORNECEDOR","NM_FORNECEDOR",
  "DS_GASTO","DT_PAGAMENTO","VR_GASTO","VR_PAGAMENTO","VR_DOCUMENTO",
  "CD_FONTE_DESPESA","DS_FONTE_DESPESA","SQ_DESPESA",
];
const COL = Object.fromEntries(COLUNAS.map((c, i) => [c, i]));

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuote = !inQuote;
    else if (ch === ";" && !inQuote) { fields.push(cur); cur = ""; }
    else cur += ch;
  }
  fields.push(cur);
  return fields.map(f => f.replace(/^"|"$/g, ""));
}

function sanitize(v: string): string | null {
  if (!v || v === "#NULO" || v === "#NULO#") return null;
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
function ehFundacaoPartidaria(dsGasto: string): boolean {
  const u = (dsGasto ?? "").toUpperCase();
  return u.includes("FUNDAÇÃO PARTIDÁRIA") || u.includes("FUNDACAO PARTIDARIA") ||
         u.includes("DOUTRINAÇÃO E EDUCAÇÃO POLÍTICA") || u.includes("DOUTRINACAO E EDUCACAO POLITICA");
}
function classificarTipo(ds: string): string {
  const u = (ds ?? "").toUpperCase();
  if (ehFundacaoPartidaria(ds)) return "fundacao_partidaria";
  if (u.includes("ALUGU") || u.includes("LOCAÇÃO") || u.includes("LOCACAO") || u.includes("CONDOMÍNIO") || u.includes("CONDOMINIO")) return "aluguel";
  if (u.includes("SERVIÇO") || u.includes("SERVICO") || u.includes("CONTRAT")) return "servico";
  return "outros";
}

// ─────────────────────────────────────────────────────────
// Leitura do CSV em stream (iconv LATIN1→UTF-8), callback por linha
// ─────────────────────────────────────────────────────────
async function lerCSV(csvPath: string, onRow: (f: string[]) => void): Promise<number> {
  const iconv = spawn("iconv", ["-f", "LATIN1", "-t", "UTF-8", csvPath]);
  const rl = createInterface({ input: iconv.stdout, crlfDelay: Infinity });
  let n = 0, header = true;
  for await (const line of rl) {
    n++;
    if (header) { header = false; continue; }
    if (!line.trim()) continue;
    onRow(parseLine(line));
  }
  return n;
}

// ─────────────────────────────────────────────────────────
// Resolver CSV (local ou download)
// ─────────────────────────────────────────────────────────
function resolverCSV(): string {
  const local = process.env.CSV_PATH;
  if (local && existsSync(local)) { console.log(`CSV local: ${local}`); return local; }

  const tmp = join(tmpdir(), "tf-fundacoes");
  const zip = join(tmp, `fundacoes_${ANO}.zip`);
  const out = join(tmp, ARQUIVO_BR);
  if (existsSync(out)) { console.log(`CSV já extraído: ${out}`); return out; }

  console.log(`Baixando ${CSV_URL}...`);
  execSync(`mkdir -p ${tmp} && curl -sL -o ${zip} "${CSV_URL}"`);
  console.log(`Extraindo ${ARQUIVO_BR}...`);
  execSync(`cd ${tmp} && unzip -o ${zip} ${ARQUIVO_BR}`);
  return out;
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────
type FundacaoDescoberta = {
  cnpj: string; nome: string; partido: string; cnpj_partido: string | null; total: number;
};

async function main() {
  console.log(`\n🏛️  Repasses partido→fundação — exercício ${ANO}\n`);
  const csvPath = resolverCSV();

  // ── Passada 1: DESCOBERTA ──────────────────────────────
  console.log("Passada 1/2 — descobrindo fundações na fonte TSE...");
  const fundacoes = new Map<string, FundacaoDescoberta>();

  await lerCSV(csvPath, (f) => {
    if (!ehFundacaoPartidaria(f[COL.DS_GASTO])) return;
    const cnpj = (f[COL.NR_CPF_CNPJ_FORNECEDOR] ?? "").replace(/\D/g, "");
    if (cnpj.length !== 14) return; // só PJ
    const valor = parseBRL(f[COL.VR_PAGAMENTO]);
    const ex = fundacoes.get(cnpj);
    if (ex) { ex.total += valor; }
    else fundacoes.set(cnpj, {
      cnpj,
      nome: sanitize(f[COL.NM_FORNECEDOR]) ?? "",
      partido: sanitize(f[COL.SG_PARTIDO]) ?? "",
      cnpj_partido: (f[COL.NR_CNPJ_PRESTADOR_CONTA] ?? "").replace(/\D/g, "") || null,
      total: valor,
    });
  });

  console.log(`  Descobertas: ${fundacoes.size} fundações.\n`);

  // Popular cadastro mínimo (sem sobrescrever enriquecimento BrasilAPI prévio)
  for (const fd of fundacoes.values()) {
    await sb.from("fundacoes_partidarias").upsert({
      cnpj:          fd.cnpj,
      razao_social:  fd.nome,
      nome_popular:  fd.nome,
      partido_sigla: fd.partido,
      partido_cnpj:  fd.cnpj_partido,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "cnpj", ignoreDuplicates: false });
  }
  console.log(`  Cadastro mínimo gravado.\n`);

  const cnpjsFundacoes = new Set(fundacoes.keys());

  // ── Passada 2: REPASSES (todos os tipos para esses CNPJs) ──
  console.log("Passada 2/2 — capturando todos os repasses (inclui aluguel/serviço)...");
  let lote: Record<string, unknown>[] = [];
  let totalInseridos = 0;

  async function uploadBatch(batch: Record<string, unknown>[]) {
    const { error } = await sb.from("fundacoes_repasses")
      .upsert(batch, { onConflict: "sq_despesa,aa_exercicio" });
    if (error) console.error("\n  ❌ upsert:", error.message);
    else { totalInseridos += batch.length; process.stdout.write(`\r  Inseridos: ${totalInseridos}`); }
  }

  const pendentes: Promise<void>[] = [];
  await lerCSV(csvPath, (f) => {
    const cnpj = (f[COL.NR_CPF_CNPJ_FORNECEDOR] ?? "").replace(/\D/g, "");
    if (!cnpjsFundacoes.has(cnpj)) return;
    const sq = parseInt((f[COL.SQ_DESPESA] ?? "").trim(), 10);
    if (isNaN(sq)) return;

    lote.push({
      sq_despesa:       sq,
      aa_exercicio:     ANO,
      sg_partido:       sanitize(f[COL.SG_PARTIDO]) ?? "",
      nm_partido:       sanitize(f[COL.NM_PARTIDO]),
      cnpj_partido:     (f[COL.NR_CNPJ_PRESTADOR_CONTA] ?? "").replace(/\D/g, "") || null,
      cnpj_fundacao:    cnpj,
      nm_fundacao:      sanitize(f[COL.NM_FORNECEDOR]),
      ds_gasto:         sanitize(f[COL.DS_GASTO]),
      tipo_repasse:     classificarTipo(f[COL.DS_GASTO] ?? ""),
      dt_pagamento:     parseDate(f[COL.DT_PAGAMENTO]),
      vr_pagamento:     parseBRL(f[COL.VR_PAGAMENTO]),
      cd_fonte_despesa: parseInt(f[COL.CD_FONTE_DESPESA] ?? "", 10) || null,
      ds_fonte_despesa: sanitize(f[COL.DS_FONTE_DESPESA]),
      dados: {
        ds_tp_fornecedor: sanitize(f[COL.DS_TP_FORNECEDOR]),
        nr_documento:     sanitize(f[COL.NR_DOCUMENTO]),
        vr_gasto:         parseBRL(f[COL.VR_GASTO]),
        vr_documento:     parseBRL(f[COL.VR_DOCUMENTO]),
      },
    });
    if (lote.length >= LOTE) { const batch = lote; lote = []; pendentes.push(uploadBatch(batch)); }
  });
  if (lote.length) pendentes.push(uploadBatch(lote));
  await Promise.all(pendentes);

  console.log(`\n\n✅ Concluído.`);
  console.log(`   Fundações descobertas : ${fundacoes.size}`);
  console.log(`   Repasses inseridos    : ${totalInseridos.toLocaleString("pt-BR")}`);
  console.log(`\n   Próximo passo: enrich-brasilapi para QSA + endereço.`);
}

main().catch(console.error);
