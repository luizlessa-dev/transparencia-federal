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

/** Normaliza nome p/ comparação: sem acento, maiúsculo, só letras e espaço. */
export function normNome(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Número no formato brasileiro "32.467,20" → 32467.2. Vazio → null. */
export function parseValorBR(v: string | undefined | null): number | null {
  if (v == null) return null;
  const t = String(v).trim();
  if (!t) return null;
  const n = parseFloat(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Extrai o nome do senador de uma lotação do Senado (API admin).
 *   "Gabinete do Senador Jorge Viana"            → "Jorge Viana"
 *   "Escritório de Apoio nº 1 do Senador X"      → "X"
 *   "Escritório de Ap. 1 da Sen. Profa. Dorinha" → "Dorinha"
 * Retorna null para lotações institucionais (Liderança, Bloco, Secretaria...).
 */
export function nomeSenadorDeLotacao(lotacao: string | null | undefined): string | null {
  const s = (lotacao ?? "").trim();
  if (!s) return null;
  if (/lideran[çc]a|\bbloco\b|secretaria|presid[êe]ncia/i.test(s)) return null;
  const m = s.match(/\bSen(?:ador|adora)?\.?\s+(.+)$/i);
  if (!m) return null;
  return (
    m[1]
      .replace(/^(Profa?\.?|Dra?\.?|Pr\.?)\s+/i, "")
      .trim() || null
  );
}
