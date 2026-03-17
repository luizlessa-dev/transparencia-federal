/**
 * Normalização de UF/estado.
 * Preserva 2 caracteres em maiúsculas quando fizer sentido.
 */

export function normalizarEstado(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const s = String(valor).trim().toUpperCase();
  if (s.length === 2) return s;
  if (s.length > 0) return s;
  return null;
}
