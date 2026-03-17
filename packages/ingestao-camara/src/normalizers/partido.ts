/**
 * Normalização de sigla de partido.
 * Preserva sigla em maiúsculas; vazio se inválido.
 */

export function normalizarPartido(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const s = String(valor).trim().toUpperCase();
  return s || null;
}
