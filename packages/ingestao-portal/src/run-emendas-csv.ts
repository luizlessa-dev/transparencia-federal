/**
 * Ingere emendas parlamentares a partir do CSV bulk do Portal da Transparência.
 * Fonte: portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares → "Baixar arquivo único"
 *
 * Uso:
 *   npm run emendas-csv:ts -w @transparencia/ingestao-portal -- /caminho/EmendasParlamentares.csv
 *   npm run emendas-csv:ts -w @transparencia/ingestao-portal -- /caminho/arquivo.csv 2025,2026
 *
 * O arquivo é latin-1, separador ";", 28 colunas.
 * Cobre 2014–2026 num único CSV de ~30 MB.
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { createClient } from "@supabase/supabase-js";

// ─── config ─────────────────────────────────────────────────────────────────

const LOTE = 500;

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseBRL(v: string): number {
  if (!v || v === "S/I" || v === "Sem informação") return 0;
  return parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;
}

function limpar(v: string): string | null {
  const s = v?.replace(/^"|"$/g, "").trim();
  if (!s || s === "S/I" || s === "Sem informação" || s === "Sem Informação") return null;
  return s;
}

/** Extrai sigla UF da localidade "CIDADE - UF" */
function extrairUF(localidade: string | null): string | null {
  if (!localidade) return null;
  const m = localidade.match(/[-–]\s*([A-Z]{2})\s*$/);
  return m ? m[1] : null;
}

function parseLinha(linha: string): string[] {
  // CSV simples com aspas opcionais e separador ";"
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

function mapearLinha(f: string[], anosAlvo: Set<number> | null): Record<string, unknown> | null {
  if (f.length < 28) return null;

  const ano = parseInt(f[1]?.trim(), 10);
  if (isNaN(ano)) return null;
  if (anosAlvo && !anosAlvo.has(ano)) return null;

  const codigo_emenda = limpar(f[0]);
  if (!codigo_emenda) return null; // sem chave natural, descarta

  const localidade = limpar(f[6]);
  const uf_full = limpar(f[10]); // nome completo ex: "BAHIA"
  const uf = extrairUF(localidade) ?? (uf_full?.slice(0, 2) ?? null);

  return {
    codigo_emenda,
    ano,
    tipo_emenda: limpar(f[2]) ?? "",
    autor_nome: limpar(f[4]),
    numero_emenda: limpar(f[5]),
    localidade,
    uf,
    municipio: limpar(f[8]),
    funcao: limpar(f[13]),
    subfuncao: limpar(f[15]),
    valor_empenhado: parseBRL(f[22]),
    valor_liquidado: parseBRL(f[23]),
    valor_pago: parseBRL(f[24]),
    valor_resto_inscrito: parseBRL(f[25]),
    valor_resto_cancelado: parseBRL(f[26]),
    valor_resto_pago: parseBRL(f[27]),
    dados: {
      cod_autor: limpar(f[3]),
      cod_municipio_ibge: limpar(f[7]),
      cod_uf_ibge: limpar(f[9]),
      regiao: limpar(f[11]),
      cod_funcao: limpar(f[12]),
      cod_subfuncao: limpar(f[14]),
      cod_programa: limpar(f[16]),
      nome_programa: limpar(f[17]),
      cod_acao: limpar(f[18]),
      nome_acao: limpar(f[19]),
      cod_plano_orcamentario: limpar(f[20]),
      nome_plano_orcamentario: limpar(f[21]),
    },
    atualizado_em: new Date().toISOString(),
  };
}

async function upsertLote(rows: Record<string, unknown>[]): Promise<number> {
  const { error } = await sb
    .from("emendas_completas")
    .upsert(rows, { onConflict: "codigo_emenda,ano" });
  if (error) {
    console.error("  Upsert erro:", error.message);
    return 0;
  }
  return rows.length;
}

// ─── main ────────────────────────────────────────────────────────────────────

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Uso: npm run emendas-csv:ts -- /caminho/EmendasParlamentares.csv [anos]");
  console.error("Exemplo: ... -- ~/Downloads/EmendasParlamentares.csv 2025,2026");
  process.exit(1);
}

const anosArg = process.argv[3];
const anosAlvo: Set<number> | null = anosArg
  ? new Set(anosArg.split(",").map(Number).filter(Boolean))
  : null;

console.log("▶ Ingestão emendas por CSV");
console.log(`  Arquivo: ${csvPath}`);
console.log(`  Anos:    ${anosAlvo ? [...anosAlvo].join(", ") : "todos (2014–2026)"}`);
console.log();

const t0 = Date.now();
let lidos = 0, inseridos = 0, descartados = 0;
const porAno: Record<number, number> = {};
let lote: Record<string, unknown>[] = [];
let isHeader = true;

const rl = createInterface({
  input: createReadStream(csvPath),
  crlfDelay: Infinity,
});

// Converte latin-1 via re-encode — Node lê como binary e decodifica
// Na prática, createReadStream sem encoding usa Buffer; readline entrega string utf8-ish
// Para latin-1 real, usamos workaround: passa encoding para o stream
const stream = createReadStream(csvPath, { encoding: "latin1" });
rl.close(); // fecha o anterior

const rl2 = createInterface({ input: stream, crlfDelay: Infinity });

for await (const rawLine of rl2) {
  if (isHeader) { isHeader = false; continue; }
  const linha = rawLine.trim();
  if (!linha) continue;

  const f = parseLinha(linha);
  const row = mapearLinha(f, anosAlvo);

  if (!row) { descartados++; continue; }

  lidos++;
  const ano = row.ano as number;
  porAno[ano] = (porAno[ano] ?? 0) + 1;
  lote.push(row);

  if (lote.length >= LOTE) {
    inseridos += await upsertLote(lote);
    lote = [];
    if (lidos % 5000 === 0) {
      console.log(`  ${lidos.toLocaleString("pt-BR")} linhas processadas, ${inseridos.toLocaleString("pt-BR")} inseridas...`);
    }
  }
}

if (lote.length > 0) inseridos += await upsertLote(lote);

const seg = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n  ✓ Concluído em ${seg}s`);
console.log(`  Lidos: ${lidos.toLocaleString("pt-BR")} | Inseridos: ${inseridos.toLocaleString("pt-BR")} | Descartados: ${descartados.toLocaleString("pt-BR")}`);
console.log("\n  Por ano:");
for (const [ano, qtd] of Object.entries(porAno).sort()) {
  console.log(`    ${ano}: ${qtd.toLocaleString("pt-BR")} emendas`);
}
