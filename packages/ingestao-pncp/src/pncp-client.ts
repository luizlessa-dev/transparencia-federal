/**
 * Cliente PNCP via dadosabertos.compras.gov.br
 * Endpoint: /modulo-contratacoes/1_consultarContratacoes_PNCP_14133
 * Sem autenticação, tamanhoPagina 10–500, datas YYYY-MM-DD
 *
 * Modalidades (Lei 14.133/2021):
 *  1 Leilão eletrônico   2 Diálogo competitivo   3 Concurso
 *  4 Concorrência eletrônica   5 Concorrência presencial
 *  6 Pregão eletrônico   7 Pregão presencial
 *  8 Dispensa eletrônica   9 Dispensa presencial
 */

const BASE = "https://dadosabertos.compras.gov.br";
const DELAY = 1000; // ms entre páginas

export const MODALIDADES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export interface PncpLicitacao {
  numeroControlePNCP: string;
  idCompra: string;
  orgaoEntidadeCnpj: string;
  orgaoEntidadeRazaoSocial: string;
  orgaoEntidadeEsferaId?: string;
  orgaoEntidadePoderId?: string;
  codigoOrgao?: number;
  unidadeOrgaoCodigoUnidade?: string;
  unidadeOrgaoNomeUnidade?: string;
  unidadeOrgaoUfSigla?: string;
  unidadeOrgaoMunicipioNome?: string;
  unidadeOrgaoCodigoIbge?: number;
  anoCompraPncp?: number;
  sequencialCompraPncp?: number;
  numeroCompra?: string;
  processo?: string;
  codigoModalidade?: number;
  modalidadeIdPncp?: number;
  modalidadeNome?: string;
  modoDisputaIdPncp?: number;
  codigoModoDisputa?: number;
  objetoCompra?: string;
  valorTotalEstimado?: number;
  valorTotalHomologado?: number;
  dataPublicacaoPncp?: string;
  dataAberturaPropostaPncp?: string;
  dataEncerramentoPropostaPncp?: string;
  dataInclusaoPncp?: string;
  dataAtualizacaoPncp?: string;
  situacaoCompraIdPncp?: number;
  situacaoCompraNomePncp?: string;
  srp?: boolean;
  existeResultado?: boolean;
  contratacaoExcluida?: boolean;
  amparoLegalNome?: string;
  amparoLegalDescricao?: string;
  informacaoComplementar?: string;
}

export interface PncpPage {
  resultado: PncpLicitacao[];
  totalRegistros: number;
  totalPaginas: number;
  paginasRestantes: number;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function buscarLicitacoesPorPeriodo(
  dataInicial: string, // YYYY-MM-DD
  dataFinal: string,   // YYYY-MM-DD
  modalidade: number,
  pagina = 1,
  tamanhoPagina = 500
): Promise<PncpPage> {
  const url = new URL(`${BASE}/modulo-contratacoes/1_consultarContratacoes_PNCP_14133`);
  url.searchParams.set("dataPublicacaoPncpInicial", dataInicial);
  url.searchParams.set("dataPublicacaoPncpFinal", dataFinal);
  url.searchParams.set("codigoModalidade", String(modalidade));
  url.searchParams.set("pagina", String(pagina));
  url.searchParams.set("tamanhoPagina", String(tamanhoPagina));

  for (let tentativa = 0; tentativa < 4; tentativa++) {
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      const espera = 10_000 * 2 ** tentativa;
      console.warn(`  [PNCP] timeout/rede (tentativa ${tentativa + 1}), aguardando ${espera / 1000}s...`);
      await sleep(espera);
      continue;
    }

    if (res.status === 429 || res.status === 503) {
      const espera = 15_000 * 2 ** tentativa;
      console.warn(`  [PNCP] rate-limit ${res.status}, aguardando ${espera / 1000}s...`);
      await sleep(espera);
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`PNCP ${res.status}: ${body.slice(0, 300)}`);
    }

    return res.json() as Promise<PncpPage>;
  }

  throw new Error("PNCP: máximo de tentativas atingido");
}

export async function* iterarLicitacoes(
  dataInicial: string,
  dataFinal: string,
  modalidade: number
): AsyncGenerator<PncpLicitacao> {
  let pagina = 1;

  while (true) {
    const page = await buscarLicitacoesPorPeriodo(dataInicial, dataFinal, modalidade, pagina, 500);
    const items = page.resultado ?? [];
    for (const item of items) yield item;

    if (items.length === 0 || page.paginasRestantes === 0) break;
    pagina++;
    await sleep(DELAY);
  }
}
