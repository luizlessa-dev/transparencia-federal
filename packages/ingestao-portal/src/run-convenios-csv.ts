/**
 * Ingere convênios federais a partir do CSV bulk do Portal da Transparência.
 *
 * Fonte: portaldatransparencia.gov.br/download-de-dados/convenios
 *        → selecionar ano → "Baixar arquivo" → extrai o CSV do ZIP
 *
 * O arquivo é latin-1, separador ";".
 *
 * Uso:
 *   npm run convenios-csv:ts -- /caminho/convenios_2024.csv
 *   npm run convenios-csv:ts -- /caminho/convenios_2024.csv 2023,2024
 *
 * Ou concatene vários anos:
 *   cat convenios_202*.csv > convenios_todos.csv
 *   npm run convenios-csv:ts -- convenios_todos.csv
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { createClient } from "@supabase/supabase-js";

const LOTE = 500;
const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── helpers ─────────────────────────────────────────────────────────────────

function limpar(v: string | undefined): string | null {
  if (!v) return null;
  const s = v.replace(/^"|"$/g, "").trim();
  return s && s !== "S/I" && s !== "Sem informação" ? s : null;
}

function parseBRL(v: string | undefined): number | null {
  if (!v) return null;
  const s = v.replace(/^"|"$/g, "").trim();
  if (!s || s === "S/I") return null;
  const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function parseData(v: string | undefined): string | null {
  if (!v) return null;
  const s = v.replace(/^"|"$/g, "").trim();
  // Formatos possíveis: DD/MM/YYYY ou YYYY-MM-DD
  const mDMY = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (mDMY) return `${mDMY[3]}-${mDMY[2]}-${mDMY[1]}`;
  const mISO = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (mISO) return mISO[1];
  return null;
}

function parseLinha(linha: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ";" && !inQuote) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

// Cabeçalho do CSV do Portal da Transparência para convênios (verificar com head -1 do arquivo)
// Colunas típicas (pode variar por ano):
// 0: NR_CONVENIO, 1: DIA_ASSIN_CONV, 2: SIT_CONVENIO, 3: INSTRUMENTO_ATIVO,
// 4: DIA_PUBL_CONV, 5: DIA_INIC_VIGENC_CONV, 6: DIA_FIM_VIGENC_CONV,
// 7: DIA_LIMITE_PREST_CONTAS, 8: VL_GLOBAL_CONV, 9: VL_REPASSE_CONV,
// 10: VL_CONTRAPARTIDA_CONV, 11: VL_EMPENHADO_CONV, 12: VL_DESEMBOLSADO_CONV,
// 13: VL_SALDO_REMAN_TESOURO, 14: VL_SALDO_REMAN_CONVENENTE,
// 15: NOME_ORGAO_SUP_CONV, 16: SIGLA_ORGAO_SUP_CONV, 17: NOME_ORGAO_CONV,
// 18: SIGLA_ORGAO_CONV, 19: NATUREZA_JURIDICA, 20: NR_CGCCPF,
// 21: NOME_CONVENENTE, 22: MUNICIPIO_PROPONENTE, 23: UF_PROPONENTE,
// 24: NOME_PARLAMENTAR, 25: OBJETO_PROPOSTA, 26: TIPO_COMARCA ...

let HEADER: string[] = [];

function mapearLinha(f: string[], anosAlvo: Set<number> | null): Record<string, unknown> | null {
  if (f.length < 10) return null;

  // Se temos o cabeçalho mapeado, usamos por nome; senão, por posição fixa
  const get = (nome: string, fallbackIdx: number): string | undefined => {
    const idx = HEADER.length > 0 ? HEADER.indexOf(nome) : fallbackIdx;
    return idx >= 0 ? f[idx] : f[fallbackIdx];
  };

  const nr_convenio = limpar(get("NR_CONVENIO", 0));
  if (!nr_convenio) return null;

  // Extrai ano da data de assinatura para filtro
  const data_assinatura = parseData(get("DIA_ASSIN_CONV", 1));
  const ano = data_assinatura ? parseInt(data_assinatura.slice(0, 4), 10) : null;
  if (anosAlvo && ano && !anosAlvo.has(ano)) return null;

  return {
    numero: nr_convenio,
    situacao: limpar(get("SIT_CONVENIO", 2)),
    ativo: limpar(get("INSTRUMENTO_ATIVO", 3)) === "SIM",

    data_publicacao: parseData(get("DIA_PUBL_CONV", 4)),
    data_inicio_vigencia: parseData(get("DIA_INIC_VIGENC_CONV", 5)),
    data_final_vigencia: parseData(get("DIA_FIM_VIGENC_CONV", 6)),
    data_limite_prestacao: parseData(get("DIA_LIMITE_PREST_CONTAS", 7)),

    valor: parseBRL(get("VL_GLOBAL_CONV", 8)),
    valor_liberado: parseBRL(get("VL_REPASSE_CONV", 9)),
    valor_contrapartida: parseBRL(get("VL_CONTRAPARTIDA_CONV", 10)),
    valor_empenhado: parseBRL(get("VL_EMPENHADO_CONV", 11)),
    valor_desembolsado: parseBRL(get("VL_DESEMBOLSADO_CONV", 12)),

    orgao_maximo_nome: limpar(get("NOME_ORGAO_SUP_CONV", 15)),
    orgao_maximo_sigla: limpar(get("SIGLA_ORGAO_SUP_CONV", 16)),
    orgao_nome: limpar(get("NOME_ORGAO_CONV", 17)),
    orgao_sigla: limpar(get("SIGLA_ORGAO_CONV", 18)),

    convenente_tipo: limpar(get("NATUREZA_JURIDICA", 19)),
    convenente_cnpj: limpar(get("NR_CGCCPF", 20)),
    convenente_nome: limpar(get("NOME_CONVENENTE", 21)),
    municipio_nome: limpar(get("MUNICIPIO_PROPONENTE", 22)),
    uf: limpar(get("UF_PROPONENTE", 23)),

    objeto: limpar(get("OBJETO_PROPOSTA", 25)),

    dados: { campos_raw: f.slice(0, 30) },
    atualizado_em: new Date().toISOString(),
  };
}

async function upsertLote(rows: Record<string, unknown>[]): Promise<number> {
  const { error } = await sb
    .from("convenios")
    .upsert(rows, { onConflict: "numero" });
  if (error) {
    console.error("  Upsert erro:", error.message);
    return 0;
  }
  return rows.length;
}

// ─── main ────────────────────────────────────────────────────────────────────

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Uso: npm run convenios-csv:ts -- /caminho/arquivo.csv [anos]");
  console.error("Baixe em: portaldatransparencia.gov.br/download-de-dados/convenios");
  process.exit(1);
}

const anosArg = process.argv[3];
const anosAlvo: Set<number> | null = anosArg
  ? new Set(anosArg.split(",").map(Number).filter(Boolean))
  : null;

console.log("▶ Ingestão convênios por CSV");
console.log(`  Arquivo: ${csvPath}`);
console.log(`  Anos:    ${anosAlvo ? [...anosAlvo].join(", ") : "todos"}`);
console.log();

const t0 = Date.now();
let lidos = 0, inseridos = 0, descartados = 0;
const porUF: Record<string, number> = {};
let lote: Record<string, unknown>[] = [];
let isHeader = true;

const stream = createReadStream(csvPath, { encoding: "latin1" });
const rl = createInterface({ input: stream, crlfDelay: Infinity });

for await (const rawLine of rl) {
  const linha = rawLine.trim();
  if (!linha) continue;

  if (isHeader) {
    HEADER = parseLinha(linha).map((h) => h.replace(/^"|"$/g, "").trim().toUpperCase());
    console.log(`  Colunas detectadas: ${HEADER.length} (${HEADER.slice(0, 5).join(", ")}...)`);
    isHeader = false;
    continue;
  }

  const f = parseLinha(linha);
  const row = mapearLinha(f, anosAlvo);

  if (!row) { descartados++; continue; }

  lidos++;
  const uf = (row.uf as string) ?? "??";
  porUF[uf] = (porUF[uf] ?? 0) + 1;
  lote.push(row);

  if (lote.length >= LOTE) {
    inseridos += await upsertLote(lote);
    lote = [];
    if (lidos % 10_000 === 0) {
      console.log(`  ${lidos.toLocaleString("pt-BR")} linhas processadas, ${inseridos.toLocaleString("pt-BR")} inseridas...`);
    }
  }
}

if (lote.length > 0) inseridos += await upsertLote(lote);

const seg = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n  ✓ Concluído em ${seg}s`);
console.log(`  Lidos: ${lidos.toLocaleString("pt-BR")} | Inseridos: ${inseridos.toLocaleString("pt-BR")} | Descartados: ${descartados.toLocaleString("pt-BR")}`);
console.log("\n  Por UF:");
for (const [uf, qtd] of Object.entries(porUF).sort()) {
  console.log(`    ${uf}: ${qtd.toLocaleString("pt-BR")}`);
}
