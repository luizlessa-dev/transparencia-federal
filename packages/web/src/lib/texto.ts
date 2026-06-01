/** Normaliza nome para comparação: sem acento, maiúsculo, só letras e espaço.
 *  Casa com `senador_normalizado` (CEAPS) e demais vínculos por nome. */
export function normalizarNome(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
