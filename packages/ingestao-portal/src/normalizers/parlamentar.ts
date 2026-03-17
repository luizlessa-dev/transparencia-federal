/**
 * Normalização de nome de parlamentar.
 * Garante string não vazia e trim.
 */

export function normalizarParlamentar(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const s = String(valor).trim();
  return s || "";
}
