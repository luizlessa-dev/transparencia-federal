/**
 * Helpers de parsing de CSV para os dados abertos da CVM.
 * Os CSVs da CVM vêm separados por `;`, normalmente em latin-1 (ISO-8859-1) e
 * com valores numéricos no formato anglo ("1234567.89") OU brasileiro
 * ("1.234.567,89") dependendo do dataset — parseValorBR cobre os dois.
 * Mesma família de helpers dos pacotes ingestao-* (mantido local pra o pacote
 * ser autocontido).
 */

/** Parseia uma linha CSV separada por `sep`, respeitando aspas. */
export function parseLinha(linha: string, sep = ";"): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Quebra o texto em linhas e parseia cada uma. Detecta o separador (`;` ou `,`)
 * pela primeira linha não-vazia. Ignora linhas em branco.
 */
export function parseCSV(texto: string): { header: string[]; linhas: string[][] } {
  const limpo = stripBOM(texto).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const linhasRaw = limpo.split("\n").filter((l) => l.trim().length > 0);
  if (linhasRaw.length === 0) return { header: [], linhas: [] };
  const sep = (linhasRaw[0].match(/;/g)?.length ?? 0) >= (linhasRaw[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const header = parseLinha(linhasRaw[0], sep);
  const linhas = linhasRaw.slice(1).map((l) => parseLinha(l, sep));
  return { header, linhas };
}

/** Mapa nome-da-coluna → índice, case/acento-insensitive. Retorna -1 se ausente. */
export function mapColunas(cabecalho: string[]): (nome: string) => number {
  const norm = cabecalho.map((h) => normHeader(h));
  return (nome: string) => norm.findIndex((h) => h === normHeader(nome));
}

/** Normaliza nome de coluna: sem acento, minúsculo, sem pontuação/espaços extras. */
export function normHeader(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Remove BOM UTF-8 no início. */
export function stripBOM(s: string): string {
  return s.replace(/^﻿/, "").replace(/^ï»¿/, "");
}

/** "24/03/2023" → "2023-03-24". Aceita já-ISO ("2026-02-18"). */
export function parseDataBR(v: string | undefined | null): string | null {
  if (!v) return null;
  const t = v.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** Número no formato brasileiro "32.467,20" → 32467.2. Também aceita "32467.20". Vazio → null. */
export function parseValorBR(v: string | undefined | null): number | null {
  if (v == null) return null;
  let t = String(v).trim().replace(/^R\$\s*/i, "");
  if (!t) return null;
  // Se tem vírgula, assume formato BR (ponto = milhar, vírgula = decimal).
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * CNPJ/CPF só com dígitos, padronizando CNPJ a 14 ("51.343.243/0001-63" →
 * "51343243000163"; "9645889000139" → "09645889000139", zero à esquerda que
 * algumas fontes dropam). CPF (11) e vazio passam sem padding.
 */
export function normCNPJ(s: string | null | undefined): string {
  const d = (s ?? "").replace(/\D/g, "");
  return d.length === 12 || d.length === 13 ? d.padStart(14, "0") : d;
}

/** Normaliza nome de pessoa/entidade p/ comparação: sem acento, maiúsculo, só letras e espaço. */
export function normNome(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Itera as linhas de um CSV (separador `;`) sem materializar todo o array —
 * economia de heap em arquivos grandes (a CDA da CVM tem milhões de linhas).
 * Chama onHeader na 1ª linha e onRow nas demais. Devolve o nº de linhas de dados.
 */
export function eachRow(
  texto: string,
  onHeader: (h: string[]) => void,
  onRow: (cols: string[]) => void,
): number {
  const clean = stripBOM(texto).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let start = 0, first = true, n = 0;
  for (let i = 0; i <= clean.length; i++) {
    if (i === clean.length || clean[i] === "\n") {
      const line = clean.slice(start, i);
      start = i + 1;
      if (line.trim().length === 0) continue;
      const cols = parseLinha(line, ";");
      if (first) { onHeader(cols); first = false; } else { onRow(cols); n++; }
    }
  }
  return n;
}
