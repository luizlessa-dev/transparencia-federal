/**
 * Helpers de parsing de CSV ponto-e-vírgula para a folha de gabinete.
 * Câmara: UTF-8 com BOM. Senado: latin-1, com linha de metadado no topo.
 */

/** Parseia uma linha CSV separada por `;`, respeitando aspas. */
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

/** Mapa nome-da-coluna → índice, case-insensitive. */
export function mapColunas(cabecalho: string[]): (nome: string) => number {
  const norm = cabecalho.map((h) => h.trim().toLowerCase());
  return (nome: string) => norm.findIndex((h) => h === nome.trim().toLowerCase());
}

/** Remove BOM UTF-8 no início. */
export function stripBOM(s: string): string {
  return s.replace(/^﻿/, "").replace(/^ï»¿/, "");
}

/**
 * Separa "CODIGO - NOME" → { codigo, nome }. Split no primeiro " - ".
 * Ex: "GSACORON - GABINETE DO SENADOR ANGELO CORONEL"
 *     "GAB. 4/511 - CÉLIO SILVEIRA"
 */
export function splitCodigoNome(s: string): { codigo: string | null; nome: string | null } {
  const raw = (s ?? "").trim();
  if (!raw || raw === "-") return { codigo: null, nome: null };
  const idx = raw.indexOf(" - ");
  if (idx === -1) return { codigo: raw || null, nome: null };
  const codigo = raw.slice(0, idx).trim().replace(/^GAB\.\s*/i, "") || null;
  const nome = raw.slice(idx + 3).trim() || null;
  return { codigo, nome };
}

/** "GABINETE DO SENADOR ANGELO CORONEL" → "ANGELO CORONEL". */
export function nomeSenadorDoGabinete(s: string | null): string | null {
  if (!s) return null;
  const m = s.match(/GABINETE\s+D[OA]\s+SENADORA?\s+(.+)$/i);
  return m ? m[1].trim() : s.trim() || null;
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

/** 1º dia do mês corrente em ISO (YYYY-MM-01) — chave do snapshot. */
export function snapshotMesISO(d = new Date()): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}-01`;
}
