/**
 * Lista de deputados em exercício na ALESP.
 *
 * Fonte: `https://www.al.sp.gov.br/repositorioDados/deputados/deputados.xml`
 * Formato: XML único, ~300 KB. Cabe em memória, JSDOM é suficiente.
 */
import { JSDOM } from "jsdom";
import type { DeputadoAlesp } from "./types.js";

export const URL_DEPUTADOS =
  "https://www.al.sp.gov.br/repositorioDados/deputados/deputados.xml";

export async function fetchDeputadosAlesp(): Promise<DeputadoAlesp[]> {
  const res = await fetch(URL_DEPUTADOS, {
    headers: {
      accept: "application/xml",
      "user-agent": "TransparenciaFederal/alesp-ingest (luiz@gastronomizae.com)",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${URL_DEPUTADOS}`);
  const xml = await res.text();

  // jsdom tolera XML simples como esse via o parser HTML
  const dom = new JSDOM(xml, { contentType: "text/xml" });
  const doc = dom.window.document;
  const out: DeputadoAlesp[] = [];

  for (const dep of doc.querySelectorAll("Deputado, deputado")) {
    const matricula = textOf(dep, "Matricula");
    const id_deputado = textOf(dep, "IdDeputado");
    const nome = textOf(dep, "NomeParlamentar");

    // Sem matricula ou id_deputado não dá pra cruzar com despesas
    if (!matricula || !id_deputado || !nome) continue;

    out.push({
      id_deputado,
      id_spl: textOf(dep, "IdSPL") || null,
      id_ua: textOf(dep, "IdUA") || null,
      matricula,
      nome,
      partido: textOf(dep, "Partido") || null,
      situacao: textOf(dep, "Situacao") || null,
      email: textOf(dep, "Email") || null,
      telefone: textOf(dep, "Telefone") || null,
      andar: textOf(dep, "Andar") || null,
      sala: textOf(dep, "Sala") || null,
      placa_veiculo: textOf(dep, "PlacaVeiculo") || null,
      aniversario: textOf(dep, "Aniversario") || null,
      area_atuacao: textOf(dep, "txtAreaAtuacao") || null,
      base_eleitoral: textOf(dep, "txtBaseEleitoral") || null,
      biografia: textOf(dep, "Biografia") || null,
    });
  }

  return out;
}

function textOf(parent: Element, selector: string): string {
  // Tenta tag em PascalCase (Deputado) e em lowercase (deputado) por segurança
  const a = parent.querySelector(selector);
  if (a?.textContent) return a.textContent.trim();
  const b = parent.querySelector(selector.toLowerCase());
  return b?.textContent?.trim() ?? "";
}
