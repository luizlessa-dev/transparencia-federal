/**
 * Helpers de parsing de CSV para os dados abertos de MG.
 * Os CSVs da CGE/Prodemge costumam vir separados por `;`, em UTF-8 (às vezes
 * com BOM) ou latin-1. Valores monetários no formato brasileiro ("32.467,20").
 * Mesma família de helpers do pacote `ingestao-folha` (mantido local pra o
 * pacote ser autocontido, como os demais `ingestao-*`).
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
 * Valor em CENTAVOS inteiros (formato do dataset de remuneração de MG):
 * "3452656" → 34526.56. Aceita sinal negativo. Vazio/0 → 0.
 * NÃO use em colunas que já vêm com vírgula decimal — pra essas use parseValorBR.
 */
export function parseCentavos(v: string | number | undefined | null): number | null {
  if (v == null) return null;
  const t = String(v).trim();
  if (!t) return null;
  const neg = t.startsWith("-");
  const digits = t.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const n = Number(digits) / 100;
  return neg ? -n : n;
}

/** CNPJ/CPF só com dígitos ("51.343.243/0001-63" → "51343243000163"). Vazio → "". */
export function normCNPJ(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

/** Normaliza nome de pessoa p/ comparação: sem acento, maiúsculo, só letras e espaço. */
export function normNome(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 1º dia do mês informado (ou corrente) em ISO (YYYY-MM-01) — chave do snapshot. */
export function snapshotMesISO(d = new Date()): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}-01`;
}
