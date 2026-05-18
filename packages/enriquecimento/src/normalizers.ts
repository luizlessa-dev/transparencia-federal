/** Converte "24.570,00" ou "24570.00" para número. */
export function parseValorBR(v: unknown): number {
  if (v == null || v === "") return 0;
  const s = String(v).trim();
  // Formato BR: 1.234.567,89
  if (s.includes(",")) {
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return parseFloat(s) || 0;
}

/** Normaliza nome para matching: lowercase, sem acento, espaços simples. */
export function normalizarNome(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
