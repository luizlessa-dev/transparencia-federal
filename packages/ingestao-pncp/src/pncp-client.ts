/**
 * Cliente PNCP — Portal Nacional de Contratações Públicas
 * Base: https://pncp.gov.br/api/consulta/v1/
 *
 * Modalidades (Lei 14.133/2021):
 *  1 Leilão eletrônico   2 Diálogo competitivo   3 Concurso
 *  4 Concorrência eletrônica   5 Concorrência presencial
 *  6 Pregão eletrônico   7 Pregão presencial
 *  8 Dispensa eletrônica   9 Dispensa presencial
 */

const BASE = "https://pncp.gov.br/api/consulta/v1";
const DELAY = 800; // ms entre requisições (PNCP limita ~2 req/s)

export const MODALIDADES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export interface PncpLicitacao {
  numeroControlePNCP: string;
  orgaoEntidade: { cnpj: string; razaoSocial: string; poderId: string; esferaId: string };
  unidadeOrgao: { ufSigla: string; municipioNome: string; codigoIbge: string; codigoUnidade: string; nomeUnidade: string };
  anoCompra: number;
  sequencialCompra: number;
  numeroCompra: string;
  processo: string;
  modalidadeId: number;
  modalidadeNome: string;
  modoDisputaId?: number;
  modoDisputaNome?: string;
  objetoCompra: string;
  valorTotalEstimado?: number;
  valorTotalHomologado?: number;
  dataPublicacaoPncp?: string;
  dataAberturaProposta?: string;
  dataEncerramentoProposta?: string;
  dataInclusao?: string;
  dataAtualizacao?: string;
  situacaoCompraId?: number;
  situacaoCompraNome?: string;
  emendaParlamentar?: boolean;
  srp?: boolean;
  existeResultado?: boolean;
  linkSistemaOrigem?: string;
}

export interface PncpPage {
  data: PncpLicitacao[];
  totalRegistros: number;
  totalPaginas: number;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function buscarLicitacoesPorPeriodo(
  dataInicial: string,
  dataFinal: string,
  modalidade: number,
  pagina = 1,
  tamanhoPagina = 50
): Promise<PncpPage> {
  const url = new URL(`${BASE}/contratacoes/publicacao`);
  url.searchParams.set("dataInicial", dataInicial);
  url.searchParams.set("dataFinal", dataFinal);
  url.searchParams.set("codigoModalidadeContratacao", String(modalidade));
  url.searchParams.set("pagina", String(pagina));
  url.searchParams.set("tamanhoPagina", String(tamanhoPagina));

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PNCP ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<PncpPage>;
}

export async function* iterarLicitacoes(
  dataInicial: string,
  dataFinal: string,
  modalidade: number
): AsyncGenerator<PncpLicitacao> {
  let pagina = 1;
  const tamanho = 50;

  while (true) {
    const page = await buscarLicitacoesPorPeriodo(dataInicial, dataFinal, modalidade, pagina, tamanho);
    const items = page.data ?? [];
    for (const item of items) yield item;

    if (!page.totalPaginas || pagina >= page.totalPaginas) break;
    pagina++;
    await sleep(DELAY);
  }
}
