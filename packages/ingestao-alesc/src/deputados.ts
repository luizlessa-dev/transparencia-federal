/**
 * Scraper de deputados em exercício da ALESC.
 * Fonte: https://transparencia.alesc.sc.gov.br/deputados
 * Extrai: id_alesc, nome, partido via HTML (sem API pública).
 */

export interface DeputadoAlesc {
  id_alesc: string;
  nome: string;
  partido: string | null;
}

const URL_DEPUTADOS = "https://transparencia.alesc.sc.gov.br/deputados";

export async function fetchDeputadosAlesc(): Promise<DeputadoAlesc[]> {
  const res = await fetch(URL_DEPUTADOS, {
    headers: { "User-Agent": "TransparenciaFederal/alesc-ingest (luiz@gastronomizae.com)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${URL_DEPUTADOS}`);
  const html = await res.text();

  const out: DeputadoAlesc[] = [];
  const seen = new Set<string>();

  // Padrão: <td class="fw-semibold">NOME</td> ... contracheque/{id}
  const rowRe = /fw-semibold">([^<]+)<\/td>[\s\S]{1,800}?contracheque\/(\d+)/g;
  let m: RegExpExecArray | null;

  while ((m = rowRe.exec(html)) !== null) {
    const nome = m[1].trim();
    const id_alesc = m[2];
    if (!id_alesc || seen.has(id_alesc)) continue;
    seen.add(id_alesc);
    out.push({ id_alesc, nome, partido: null });
  }

  return out;
}
