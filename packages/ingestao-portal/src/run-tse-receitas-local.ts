/**
 * Versão local: processa o ZIP já baixado em /tmp/transparencia-tse/candidatos_{ANO}.zip
 * Útil quando o download já foi feito manualmente ou por outro meio.
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const CARGOS_ALVO = new Set(["5", "6"]);
const TAMANHO_LOTE = 300;

const COLUNAS = [
  "DT_GERACAO","HH_GERACAO","AA_ELEICAO","CD_TIPO_ELEICAO","NM_TIPO_ELEICAO",
  "CD_ELEICAO","DS_ELEICAO","DT_ELEICAO","ST_TURNO","TP_PRESTACAO_CONTAS",
  "DT_PRESTACAO_CONTAS","SQ_PRESTADOR_CONTAS","SG_UF","SG_UE","NM_UE",
  "NR_CNPJ_PRESTADOR_CONTA","CD_CARGO","DS_CARGO","SQ_CANDIDATO","NR_CANDIDATO",
  "NM_CANDIDATO","NR_CPF_CANDIDATO","NR_CPF_VICE_CANDIDATO","NR_PARTIDO",
  "SG_PARTIDO","NM_PARTIDO","CD_FONTE_RECEITA","DS_FONTE_RECEITA",
  "CD_ORIGEM_RECEITA","DS_ORIGEM_RECEITA","CD_NATUREZA_RECEITA","DS_NATUREZA_RECEITA",
  "CD_ESPECIE_RECEITA","DS_ESPECIE_RECEITA","CD_CNAE_DOADOR","DS_CNAE_DOADOR",
  "NR_CPF_CNPJ_DOADOR","NM_DOADOR","NM_DOADOR_RFB","CD_ESFERA_PARTIDARIA_DOADOR",
  "DS_ESFERA_PARTIDARIA_DOADOR","SG_UF_DOADOR","CD_MUNICIPIO_DOADOR","NM_MUNICIPIO_DOADOR",
  "SQ_CANDIDATO_DOADOR","NR_CANDIDATO_DOADOR","CD_CARGO_CANDIDATO_DOADOR",
  "DS_CARGO_CANDIDATO_DOADOR","NR_PARTIDO_DOADOR","SG_PARTIDO_DOADOR","NM_PARTIDO_DOADOR",
  "NR_RECIBO_DOACAO","NR_DOCUMENTO_DOACAO","SQ_RECEITA","DT_RECEITA","DS_RECEITA",
  "VR_RECEITA","DS_NATUREZA_RECURSO_ESTIMAVEL","DS_GENERO","DS_COR_RACA",
];

function sanitize(v: string): string | null {
  if (!v || v === "#NULO" || v === "#NULO#" || v === "#NE" || v === "#NE#") return null;
  return v.trim() || null;
}

function parseIntSafe(v: string): number | null {
  const n = parseInt((v ?? "").trim(), 10);
  return isNaN(n) || n < 0 ? null : n;
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

function mapRow(fields: string[], ano: number): Record<string, unknown> | null {
  const row: Record<string, string> = {};
  COLUNAS.forEach((col, i) => { row[col] = fields[i] ?? ""; });
  if (!CARGOS_ALVO.has(row.CD_CARGO?.trim())) return null;
  const sq = parseIntSafe(row.SQ_RECEITA);
  if (sq === null) return null;
  return {
    sq_receita: sq,
    ano_eleicao: ano,
    sq_candidato: sanitize(row.SQ_CANDIDATO) ?? "",
    nm_candidato: sanitize(row.NM_CANDIDATO) ?? "",
    nr_cpf_candidato: sanitize(row.NR_CPF_CANDIDATO),
    cd_cargo: parseIntSafe(row.CD_CARGO),
    ds_cargo: sanitize(row.DS_CARGO) ?? "",
    sg_uf: sanitize(row.SG_UF) ?? "",
    nr_partido: parseIntSafe(row.NR_PARTIDO),
    sg_partido: sanitize(row.SG_PARTIDO),
    nm_partido: sanitize(row.NM_PARTIDO),
    cd_fonte_receita: parseIntSafe(row.CD_FONTE_RECEITA),
    ds_fonte_receita: sanitize(row.DS_FONTE_RECEITA),
    cd_origem_receita: parseIntSafe(row.CD_ORIGEM_RECEITA),
    ds_origem_receita: sanitize(row.DS_ORIGEM_RECEITA),
    cd_especie_receita: parseIntSafe(row.CD_ESPECIE_RECEITA),
    ds_especie_receita: sanitize(row.DS_ESPECIE_RECEITA),
    nr_cpf_cnpj_doador: sanitize(row.NR_CPF_CNPJ_DOADOR),
    nm_doador: sanitize(row.NM_DOADOR),
    nm_doador_rfb: sanitize(row.NM_DOADOR_RFB),
    cd_cnae_doador: sanitize(row.CD_CNAE_DOADOR),
    ds_cnae_doador: sanitize(row.DS_CNAE_DOADOR),
    sg_uf_doador: sanitize(row.SG_UF_DOADOR),
    vr_receita: parseBRL(row.VR_RECEITA ?? "0"),
    dt_receita: parseDate(row.DT_RECEITA ?? ""),
    ds_receita: sanitize(row.DS_RECEITA),
    dados: row,
    atualizado_em: new Date().toISOString(),
  };
}

async function processarEntry(zipPath: string, entry: string, ano: number) {
  let inseridos = 0, erros = 0;

  const proc = execSync(`unzip -p "${zipPath}" "${entry}"`, {
    encoding: "buffer",
    maxBuffer: 200 * 1024 * 1024,
  });
  const content = proc.toString("latin1");
  const lines = content.split("\n");

  // Deduplicar por sq_receita
  const mapa = new Map<string, Record<string, unknown>>();
  let isHeader = true;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (isHeader) { isHeader = false; continue; }
    const fields = parseLine(line);
    const row = mapRow(fields, ano);
    if (!row) continue;
    const key = `${row.sq_receita}|${row.ano_eleicao}`;
    mapa.set(key, row);
  }

  const rows = Array.from(mapa.values());
  for (let i = 0; i < rows.length; i += TAMANHO_LOTE) {
    const lote = rows.slice(i, i + TAMANHO_LOTE);
    const { error } = await sb.from("tse_receitas_brutas").upsert(lote, { onConflict: "sq_receita,ano_eleicao" });
    if (error) { erros += lote.length; console.error(`    Upsert erro: ${error.message}`); }
    else inseridos += lote.length;
  }
  return { total: rows.length, inseridos, erros };
}

const anosArg = process.argv[2];
const anos = anosArg ? anosArg.split(",").map(Number).filter(Boolean) : [2022, 2018];
const tmpDir = join(tmpdir(), "transparencia-tse");

console.log(`▶ Processando TSE local (${anos.join(",")})`);

for (const ano of anos) {
  const zipPath = join(tmpDir, `candidatos_${ano}.zip`);
  if (!existsSync(zipPath)) {
    console.error(`  [${ano}] ZIP não encontrado: ${zipPath}`);
    continue;
  }

  const t0 = Date.now();
  console.log(`  [${ano}] Lendo ${zipPath}...`);

  const entriesOut = execSync(`unzip -Z1 "${zipPath}"`, { encoding: "utf-8", maxBuffer: 5 * 1024 * 1024 });
  const entries = entriesOut.split("\n").map(l => l.trim()).filter(l =>
    l.startsWith(`receitas_candidatos_${ano}_`) &&
    !l.includes("_BRASIL") &&
    !l.includes("doador_originario") &&
    l.endsWith(".csv")
  );

  console.log(`  [${ano}] ${entries.length} arquivos de UF`);

  let total = 0, inseridos = 0, erros = 0;
  for (const entry of entries) {
    const uf = entry.replace(`receitas_candidatos_${ano}_`, "").replace(".csv", "");
    try {
      const r = await processarEntry(zipPath, entry, ano);
      total += r.total;
      inseridos += r.inseridos;
      erros += r.erros;
      console.log(`    [${uf}] ${r.inseridos} registros`);
    } catch (err) {
      console.error(`    [${uf}] ERRO: ${(err as Error).message}`);
      erros++;
    }
  }

  const duracao = Date.now() - t0;
  console.log(`  [${ano}] ✓ ${total} receitas, ${inseridos} inseridas, ${erros} erros — ${duracao}ms`);
}
