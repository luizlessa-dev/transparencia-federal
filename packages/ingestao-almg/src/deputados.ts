/**
 * Lista de deputados em exercício na ALMG.
 *
 * Fonte: `https://dadosabertos.almg.gov.br/api/v2/deputados/em_exercicio`
 * Formato: XML simples (tags <deputado><id>…</id><nome>…</nome><partido>…</partido><tagLocalizacao>…</tagLocalizacao></deputado>).
 */
import { JSDOM } from "jsdom";

const URL = "https://dadosabertos.almg.gov.br/api/v2/deputados/em_exercicio";

export type DeputadoAlmg = {
  id_almg: number;
  nome: string;
  partido: string | null;
  tag_localizacao: string | null;
};

export async function fetchDeputadosEmExercicio(): Promise<DeputadoAlmg[]> {
  const res = await fetch(URL, {
    headers: {
      accept: "application/xml",
      "user-agent": "TransparenciaFederal/almg-ingest (luiz@gastronomizae.com)",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${URL}`);
  const xml = await res.text();

  // jsdom não tem um XML parser real, mas o HTML parser tolera essa estrutura
  const dom = new JSDOM(xml, { contentType: "text/xml" });
  const doc = dom.window.document;
  const out: DeputadoAlmg[] = [];
  for (const dep of doc.querySelectorAll("deputado")) {
    const id = Number(dep.querySelector("id")?.textContent?.trim());
    const nome = dep.querySelector("nome")?.textContent?.trim() ?? "";
    const partido = dep.querySelector("partido")?.textContent?.trim() ?? null;
    const tag = dep.querySelector("tagLocalizacao")?.textContent?.trim() ?? null;
    if (Number.isFinite(id) && nome) {
      out.push({ id_almg: id, nome, partido, tag_localizacao: tag });
    }
  }
  return out;
}
