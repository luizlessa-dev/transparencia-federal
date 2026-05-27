/**
 * Parser do HTML de verba indenizatória da ALMG.
 *
 * Endpoint canônico:
 *   GET  https://www.almg.gov.br/transparencia/prestacao-de-contas/deputados/verba-indenizatoria/detalhe.html?id=<IDdeputado>
 *   + body POST `periodo=MMYYYY` (form-urlencoded) — filtro de mês via POST,
 *     GET com `?mes=&ano=` NÃO funciona (responde, mas devolve sempre o mês default).
 *
 * Estrutura DOM (validada em múltiplas amostras):
 *   <h2.accordion-header>
 *     <button data-bs-target="#collapseVerbaN">
 *       <div.me-auto>CATEGORIA</div>
 *       <span.badge.bg-khaki>R$ TOTAL</span>
 *     </button>
 *   </h2>
 *   <div#collapseVerbaN>
 *     <table>
 *       <thead> Emitente | CNPJ/CPF | Data | Número | Valor | Reembolsável </thead>
 *       <tbody><tr><td>...</td>...</tr>...</tbody>
 *     </table>
 *   </div>
 */
import { JSDOM } from "jsdom";

// Em produção (GHA), ALMG_PROXY_URL aponta para o Cloudflare Worker proxy.
// Sem a variável, usa a URL direta (funciona localmente).
const BASE = process.env.ALMG_PROXY_URL
  ? `${process.env.ALMG_PROXY_URL}/verba-detalhe`
  : "https://www.almg.gov.br/transparencia/prestacao-de-contas/deputados/verba-indenizatoria/detalhe.html";

export type GastoVerba = {
  deputadoIdAlmg: number;
  ano: number;
  mes: number;
  categoria: string;
  categoriaTotal: number;
  emitente: string;
  cnpjCpf: string;
  dataEmissao: string | null; // ISO YYYY-MM-DD ou null
  numeroDocumento: string;
  valorDespesa: number;
  valorReembolso: number;
  urlOrigem: string;
};

export function detalheUrl(deputadoId: number) {
  return `${BASE}?id=${deputadoId}`;
}

export function periodoMMYYYY(mes: number, ano: number) {
  return `${String(mes).padStart(2, "0")}${ano}`;
}

function parseValorBRL(s: string): number {
  // "R$ 2.941,66" → 2941.66; "R$\xa01.169,80" → 1169.80
  const cleaned = s
    .replace(/R\$/g, "")
    .replace(/ /g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function parseDataBR(s: string): string | null {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function txt(el: Element | null | undefined): string {
  return (el?.textContent ?? "").trim().replace(/\s+/g, " ");
}

/**
 * Faz POST no endpoint detalhe.html com periodo=MMYYYY e retorna o HTML.
 */
export async function fetchDetalhe(
  deputadoId: number,
  mes: number,
  ano: number,
  init?: { signal?: AbortSignal },
): Promise<{ html: string; url: string; periodo: string }> {
  const url = detalheUrl(deputadoId);
  const periodo = periodoMMYYYY(mes, ano);
  const body = new URLSearchParams({ periodo });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "TransparenciaFederal/almg-ingest (luiz@gastronomizae.com)",
    },
    body,
    signal: init?.signal,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} em ${url} (periodo=${periodo})`);
  }
  const html = await res.text();
  return { html, url, periodo };
}

/**
 * Extrai gastos da página detalhe.html já fetched.
 */
export function parseDetalhe(
  html: string,
  meta: { deputadoIdAlmg: number; mes: number; ano: number; urlOrigem: string },
): GastoVerba[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const out: GastoVerba[] = [];

  const headers = doc.querySelectorAll("h2.accordion-header");
  for (const h2 of headers) {
    const nome = txt(h2.querySelector(".me-auto"));
    const badge = txt(h2.querySelector(".badge.bg-khaki"));
    if (!nome) continue;
    const categoriaTotal = parseValorBRL(badge);

    const btn = h2.querySelector("button[data-bs-target]");
    const targetSel = btn?.getAttribute("data-bs-target") ?? "";
    const collapse = targetSel ? doc.querySelector(targetSel) : null;
    const tbody = collapse?.querySelector("table tbody");
    if (!tbody) continue;

    for (const tr of tbody.querySelectorAll("tr")) {
      const tds = tr.querySelectorAll("td");
      if (tds.length < 6) continue;
      const emitente = txt(tds[0]);
      const cnpjCpf = txt(tds[1]);
      const dataEmissao = parseDataBR(txt(tds[2]));
      const numeroDocumento = txt(tds[3]);
      const valorDespesa = parseValorBRL(txt(tds[4]));
      const valorReembolso = parseValorBRL(txt(tds[5]));
      if (!emitente && !cnpjCpf) continue;
      out.push({
        deputadoIdAlmg: meta.deputadoIdAlmg,
        ano: meta.ano,
        mes: meta.mes,
        categoria: nome,
        categoriaTotal,
        emitente,
        cnpjCpf,
        dataEmissao,
        numeroDocumento,
        valorDespesa,
        valorReembolso,
        urlOrigem: meta.urlOrigem,
      });
    }
  }
  return out;
}
