/**
 * Validação e normalização de valores financeiros.
 * Retorna número >= 0 ou NaN se inválido.
 */

export function normalizarValor(valor: unknown): number {
  if (valor === null || valor === undefined) return 0;
  if (typeof valor === "number") {
    if (Number.isNaN(valor) || valor < 0) return 0;
    return valor;
  }
  const s = String(valor).trim().replace(",", ".");
  const n = parseFloat(s);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

export function valorNumericoValido(valor: unknown): boolean {
  const n = normalizarValor(valor);
  return !Number.isNaN(n) && n >= 0;
}
