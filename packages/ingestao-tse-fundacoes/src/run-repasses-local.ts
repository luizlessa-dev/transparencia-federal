/**
 * run-repasses-local.ts
 * Processa o CSV TSE já baixado e insere repasses partido→fundação no Supabase.
 *
 * Uso:
 *   CSV_PATH=/Users/luizlessa/tf-spike-fundacoes/despesa_anual_2024_BR.csv \
 *   npm run repasses:ts -w @transparencia/ingestao-tse-fundacoes
 *
 * Também baixa o CSV se CSV_PATH não estiver definido:
 *   ANO=2024 npm run repasses:ts -w @transparencia/ingestao-tse-fundacoes
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";
import { createReadStream, existsSync } from "fs";
import { createInterface } from "readline";
import { execSync } from "child_process";
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
// CNPJs das 26 fundações conhecidas (para filtro rápido)
// ─────────────────────────────────────────────────────────
async function carregarCNPJsFundacoes(): Promise<Set<string>> {
  const { data, error } = await sb.from("fundacoes_partidarias").select("cnpj");
  if (error || !data?.length) {
    console.warn("⚠️  Tabela fundacoes_partidarias vazia — rode seed-fundacoes primeiro.");
    process.exit(1);
  }
  return new Set(data.map(r => (r.cnpj as string).replace(/\D/g, "")));
}

// ─────────────────────────────────────────────────────────
// CSV parser (semicolon, ISO-8859-1 → via iconv)
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

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === ";" && !inQuote) { fields.push(cur); cur = ""; }
    else { cur += ch; }
  }
  fields.push(cur);
  return fields;
}

function sanitize(v: string): string | null {
  if (!v || v === "#NULO" || v === "#NULO#") return null;
  return v.trim() || null;
}

function parseBRL(v: string): number {
  const s = (v ?? "0").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseDate(v: string): string | null {
  const m = (v ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function classificarTipo(ds: string): string {
  const upper = (ds ?? "").toUpperCase();
  if (upper.includes("FUNDAÇÃO PARTIDÁRIA") || upper.includes("FUNDACAO PARTIDARIA")) return "fundacao_partidaria";
  if (upper.includes("ALUGUEL") || upper.includes("LOCAÇÃO") || upper.includes("LOCACAO") || upper.includes("CONDOMÍNIO")) return "aluguel";
  if (upper.includes("SERVIÇO") || upper.includes("SERVICO") || upper.includes("CONTRAT")) return "servico";
  return "outros";
}

function mapRow(
  fields: string[],
  cnpjsFundacoes: Set<string>
): Record<string, unknown> | null {
  const row: Record<string, string> = {};
  COLUNAS.forEach((col, i) => { row[col] = fields[i] ?? ""; });

  const cnpjFornecedor = (row.NR_CPF_CNPJ_FORNECEDOR ?? "").replace(/\D/g, "");
  if (!cnpjsFundacoes.has(cnpjFornecedor)) return null; // não é fundação conhecida

  const sqStr = (row.SQ_DESPESA ?? "").trim();
  const sq = parseInt(sqStr, 10);
  if (isNaN(sq)) return null;

  return {
    sq_despesa:       sq,
    aa_exercicio:     ANO,
    sg_partido:       sanitize(row.SG_PARTIDO) ?? "",
    nm_partido:       sanitize(row.NM_PARTIDO),
    cnpj_partido:     (row.NR_CNPJ_PRESTADOR_CONTA ?? "").replace(/\D/g, "") || null,
    cnpj_fundacao:    cnpjFornecedor,
    nm_fundacao:      sanitize(row.NM_FORNECEDOR),
    ds_gasto:         sanitize(row.DS_GASTO),
    tipo_repasse:     classificarTipo(row.DS_GASTO ?? ""),
    dt_pagamento:     parseDate(row.DT_PAGAMENTO),
    vr_pagamento:     parseBRL(row.VR_PAGAMENTO),
    cd_fonte_despesa: parseInt(row.CD_FONTE_DESPESA ?? "", 10) || null,
    ds_fonte_despesa: sanitize(row.DS_FONTE_DESPESA),
    dados: {
      ds_tp_fornecedor:    sanitize(row.DS_TP_FORNECEDOR),
      cd_tp_documento:     sanitize(row.CD_TP_DOCUMENTO),
      ds_tp_documento:     sanitize(row.DS_TP_DOCUMENTO),
      nr_documento:        sanitize(row.NR_DOCUMENTO),
      vr_gasto:            parseBRL(row.VR_GASTO),
      vr_documento:        parseBRL(row.VR_DOCUMENTO),
    },
  };
}

// ─────────────────────────────────────────────────────────
// Obter CSV (local ou download)
// ─────────────────────────────────────────────────────────
async function resolverCSV(): Promise<string> {
  const csvPath = process.env.CSV_PATH;
  if (csvPath && existsSync(csvPath)) {
    console.log(`Usando CSV local: ${csvPath}`);
    return csvPath;
  }

  // Baixar e extrair
  const tmpDir  = join(tmpdir(), "tf-fundacoes");
  const zipPath = join(tmpDir, `fundacoes_${ANO}.zip`);
  const csvOut  = join(tmpDir, ARQUIVO_BR);

  if (existsSync(csvOut)) {
    console.log(`Usando CSV já extraído: ${csvOut}`);
    return csvOut;
  }

  console.log(`Baixando ${CSV_URL}...`);
  execSync(`mkdir -p ${tmpDir} && curl -sL -o ${zipPath} "${CSV_URL}"`);
  console.log(`Extraindo ${ARQUIVO_BR}...`);
  execSync(`cd ${tmpDir} && unzip -o ${zipPath} ${ARQUIVO_BR}`);
  return csvOut;
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🏛️  Ingestão de repasses partido→fundação — exercício ${ANO}\n`);

  const [csvPath, cnpjsFundacoes] = await Promise.all([
    resolverCSV(),
    carregarCNPJsFundacoes(),
  ]);

  console.log(`Filtrando por ${cnpjsFundacoes.size} CNPJs de fundações conhecidas...`);
  console.log(`CSV: ${csvPath}\n`);

  // Converter ISO-8859-1 → UTF-8 via iconv (Node)
  const { spawn } = await import("child_process");
  const iconv = spawn("iconv", ["-f", "LATIN1", "-t", "UTF-8", csvPath]);
  const rl = createInterface({ input: iconv.stdout, crlfDelay: Infinity });

  let linhaNr = 0;
  let lote: ReturnType<typeof mapRow>[] = [];
  let totalInseridos = 0;
  let totalFiltrados = 0;
  let primeiraLinha  = true;

  async function flushLote() {
    const rows = lote.filter(Boolean) as Record<string, unknown>[];
    if (!rows.length) return;
    const { error } = await sb.from("fundacoes_repasses").upsert(rows, {
      onConflict: "sq_despesa,aa_exercicio",
    });
    if (error) console.error("  ❌ upsert erro:", error.message);
    else {
      totalInseridos += rows.length;
      process.stdout.write(`\r  Inseridos: ${totalInseridos} repasses`);
    }
    lote = [];
  }

  for await (const line of rl) {
    linhaNr++;
    if (primeiraLinha) { primeiraLinha = false; continue; } // skip header

    const fields = parseLine(line);
    const row = mapRow(fields, cnpjsFundacoes);

    if (!row) { totalFiltrados++; continue; }

    lote.push(row);
    if (lote.length >= LOTE) await flushLote();
  }

  await flushLote();

  console.log(`\n\n✅ Concluído.`);
  console.log(`   Linhas processadas : ${linhaNr.toLocaleString("pt-BR")}`);
  console.log(`   Filtradas (fora)   : ${totalFiltrados.toLocaleString("pt-BR")}`);
  console.log(`   Repasses inseridos : ${totalInseridos.toLocaleString("pt-BR")}`);
}

main().catch(console.error);
