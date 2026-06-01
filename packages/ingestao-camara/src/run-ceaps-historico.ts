/**
 * Ingestão de CEAP histórico via CSV bulk anual da Câmara.
 *
 * Usa https://www.camara.leg.br/cotas/Ano-{ANO}.csv.zip em vez da API por deputado,
 * o que permite ingerir anos anteriores à legislatura atual.
 *
 * Uso:
 *   npm run ceaps-historico:ts -w @transparencia/ingestao-camara -- 2019,2020,2021,2022
 *   npm run ceaps-historico:ts -w @transparencia/ingestao-camara -- 2022
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createWriteStream, readFileSync, existsSync, mkdirSync } from "fs";
import { unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const BATCH_SIZE = 500;
const BASE_URL = "https://www.camara.leg.br/cotas";
const TMP_DIR = join(tmpdir(), "transparencia-ceap-historico");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseLinha(linha: string): string[] {
  // Suporta valores entre aspas com ponto-e-vírgula interno (raro mas existe)
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ";" && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseFloat2(v: string): number {
  if (!v || v === "" || v === "0") return 0;
  // Formato brasileiro: 1.234,56
  const clean = v.replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}

function parseDate(v: string): string | null {
  if (!v || v === "") return null;
  // datEmissao: "2019-01-16T00:00:00"
  return v.substring(0, 10) || null;
}

async function downloadZip(ano: number, destPath: string): Promise<void> {
  const url = `${BASE_URL}/Ano-${ano}.csv.zip`;
  console.log(`  Baixando ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download falhou: ${res.status} ${url}`);
  const ws = createWriteStream(destPath);
  const nodeStream = Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]);
  await pipeline(nodeStream, ws);
  console.log(`  ZIP salvo em ${destPath}`);
}

function extrairCsv(zipPath: string, ano: number): string {
  // Descobre nome do arquivo dentro do zip
  const listOut = execSync(`unzip -Z1 "${zipPath}"`, { encoding: "utf-8" });
  const entries = listOut.split("\n").map((l) => l.trim()).filter((e) => e.endsWith(".csv"));
  const csvName = entries.find((e) => e.includes(String(ano))) ?? entries[0];
  if (!csvName) throw new Error(`Nenhum CSV encontrado no zip ${zipPath}`);

  console.log(`  CSV encontrado: ${csvName}`);

  // Extrai para /tmp
  const destCsv = join(TMP_DIR, `Ano-${ano}.csv`);
  execSync(`unzip -o "${zipPath}" "${csvName}" -d "${TMP_DIR}"`, { encoding: "utf-8" });

  // O unzip cria o arquivo com o nome original; renomear se necessário
  const extractedPath = join(TMP_DIR, csvName);
  if (extractedPath !== destCsv && existsSync(extractedPath)) {
    execSync(`mv "${extractedPath}" "${destCsv}"`);
  }
  return destCsv;
}

async function upsertBatch(rows: object[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { data, error } = await supabase
    .from("ceaps_brutas")
    .upsert(rows, { onConflict: "ano,cod_documento", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(`Upsert ceaps_brutas: ${error.message}`);
  return Array.isArray(data) ? data.length : 0;
}

async function ingerirAno(ano: number): Promise<{ lidas: number; inseridas: number }> {
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });

  const zipPath = join(TMP_DIR, `Ano-${ano}.zip`);
  let csvPath: string | null = null;

  try {
    await downloadZip(ano, zipPath);
    csvPath = extrairCsv(zipPath, ano);

    // Lê o CSV (UTF-8 com BOM)
    const rawContent = readFileSync(csvPath, "utf-8");
    const content = rawContent.replace(/^﻿/, ""); // remove BOM
    const linhas = content.split("\n").filter((l) => l.trim().length > 0);

    console.log(`  ${linhas.length - 1} linhas de dados (excluindo cabeçalho)`);

    const cabecalho = parseLinha(linhas[0]);
    // Mapa de colunas por nome (case-insensitive)
    const col = (nome: string): number => {
      const idx = cabecalho.findIndex((h) => h.toLowerCase() === nome.toLowerCase());
      return idx;
    };

    const iNome      = col("txNomeParlamentar");
    const iDescricao = col("txtDescricao");
    const iFornecedor= col("txtFornecedor");
    const iCnpj      = col("txtCNPJCPF");
    const iData      = col("datEmissao");
    const iVlrDoc    = col("vlrDocumento");
    const iVlrGlosa  = col("vlrGlosa");
    const iVlrLiq    = col("vlrLiquido");
    const iAno       = col("numAno");
    const iDepId     = col("nuDeputadoId");
    const iDocId     = col("ideDocumento");
    const iUrl       = col("urlDocumento");

    let inseridas = 0;
    let lidas = 0;
    let batch: object[] = [];

    for (let i = 1; i < linhas.length; i++) {
      const campos = parseLinha(linhas[i]);
      if (campos.length < 20) continue;

      const codDoc = campos[iDocId]?.trim();
      const depId  = campos[iDepId]?.trim();
      if (!codDoc || codDoc === "" || codDoc === "0") continue;

      const anoLinha = parseInt(campos[iAno] ?? String(ano), 10) || ano;

      batch.push({
        ano:                    anoLinha,
        cod_documento:          codDoc,
        deputado_id_externo:    depId || null,
        tipo_despesa:           campos[iDescricao]?.trim() || null,
        nome_fornecedor:        campos[iFornecedor]?.trim() || null,
        cnpj_cpf_fornecedor:    campos[iCnpj]?.trim() || null,
        valor_documento:        parseFloat2(campos[iVlrDoc] ?? ""),
        valor_glosa:            parseFloat2(campos[iVlrGlosa] ?? ""),
        valor_liquido:          parseFloat2(campos[iVlrLiq] ?? ""),
        data_documento:         parseDate(campos[iData] ?? ""),
        url_documento:          campos[iUrl]?.trim() || null,
        dados: {
          txNomeParlamentar: campos[iNome]?.trim(),
          numAno: anoLinha,
        },
      });
      lidas++;

      if (batch.length >= BATCH_SIZE) {
        inseridas += await upsertBatch(batch);
        batch = [];
        if (lidas % 10000 === 0) console.log(`    ${lidas} linhas processadas...`);
      }
    }

    if (batch.length > 0) inseridas += await upsertBatch(batch);

    return { lidas, inseridas };
  } finally {
    // Limpa arquivos temporários
    try { await unlink(zipPath); } catch { /* ok */ }
    if (csvPath) { try { await unlink(csvPath); } catch { /* ok */ } }
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

const anosArg = process.argv[2];
const anos = anosArg && !anosArg.startsWith("--")
  ? anosArg.split(",").map(Number).filter((n) => n > 2000)
  : [2019, 2020, 2021, 2022];

console.log(`▶ CEAP histórico via CSV bulk — anos: ${anos.join(", ")}`);
console.log();

let totalLidas = 0;
let totalInseridas = 0;

for (const ano of anos) {
  console.log(`── ${ano} ────────────────────────────`);
  try {
    const { lidas, inseridas } = await ingerirAno(ano);
    console.log(`  ✓ lidas=${lidas} inseridas=${inseridas}`);
    totalLidas += lidas;
    totalInseridas += inseridas;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ Erro em ${ano}: ${msg}`);
  }
  console.log();
}

console.log(`▶ Concluído — total: lidas=${totalLidas} inseridas=${totalInseridas}`);
