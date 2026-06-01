/**
 * Parsing de competência (ano/mês) a partir do NOME DO ARQUIVO de um resource.
 * Módulo sem efeito colateral (importável em testes — diferente de run-mensal,
 * que é um CLI e executa na importação).
 *
 * ⚠️ Parsear SEMPRE o nome do arquivo, NUNCA a URL inteira: a URL do CKAN contém
 * o UUID do resource (ex. ...-9977-84be...), cujos dígitos casariam com o regex
 * e dariam mês/ano lixo (84/9977).
 */

/** Extrai o nome do arquivo de uma URL (sem querystring). */
export function nomeArquivo(urlOrName: string | null | undefined): string {
  const s = (urlOrName ?? "").split("?")[0];
  return s.split("/").pop() ?? "";
}

/**
 * {ano, mes} a partir do nome do arquivo. Cobre os dois padrões do dataset:
 *   servidores-YYYY-MM.csv(.gz)   (histórico)
 *   servidores_MMYYYY.csv         (recente)
 * Valida mês 1–12 e ano 2000–2100 — rejeita falsos positivos.
 */
export function parseAnoMes(nome: string): { ano: number; mes: number } | null {
  const valido = (ano: number, mes: number) =>
    mes >= 1 && mes <= 12 && ano >= 2000 && ano <= 2100 ? { ano, mes } : null;

  let m = nome.match(/(\d{4})-(\d{2})(?!\d)/); // servidores-2015-12
  if (m) {
    const r = valido(Number(m[1]), Number(m[2]));
    if (r) return r;
  }
  m = nome.match(/_(\d{2})(\d{4})(?!\d)/); // servidores_032026
  if (m) {
    const r = valido(Number(m[2]), Number(m[1]));
    if (r) return r;
  }
  return null;
}
