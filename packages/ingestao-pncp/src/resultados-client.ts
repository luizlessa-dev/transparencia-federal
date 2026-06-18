/**
 * Cliente PNCP — Resultados de licitações (vencedores por item)
 * Endpoint: /modulo-contratacoes/3_consultarResultadoItensContratacoes_PNCP_14133
 * Chave investigativa: niFornecedor = CNPJ/CPF do vencedor
 */

const BASE = "https://dadosabertos.compras.gov.br";
const DELAY = 1000;

export interface PncpResultado {
  idCompraItem: string;
  idCompra: string;
  numeroControlePNCPCompra: string;
  orgaoEntidadeCnpj: string;
  unidadeOrgaoCodigoUnidade?: string;
  unidadeOrgaoUfSigla?: string;
  numeroItemPncp?: number;
  sequencialResultado?: number;
  niFornecedor?: string;
  tipoPessoa?: string;
  nomeRazaoSocialFornecedor?: string;
  quantidadeHomologada?: number;
  valorUnitarioHomologado?: number;
  valorTotalHomologado?: number;
  percentualDesconto?: number;
  situacaoCompraItemResultadoId?: number;
  situacaoCompraItemResultadoNome?: string;
  porteFornecedorId?: number;
  porteFornecedorNome?: string;
  naturezaJuridicaId?: string;
  naturezaJuridicaNome?: string;
  dataResultadoPncp?: string;
  dataInclusaoPncp?: string;
  dataAtualizacaoPncp?: string;
  aplicacaoMargemPreferencia?: boolean;
  aplicacaoBeneficioMeepp?: boolean;
}

interface ResultadoPage {
  resultado: PncpResultado[];
  totalRegistros: number;
  totalPaginas: number;
  paginasRestantes: number;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPagina(
  dataInicial: string,
  dataFinal: string,
  pagina: number
): Promise<ResultadoPage> {
  const url = new URL(`${BASE}/modulo-contratacoes/3_consultarResultadoItensContratacoes_PNCP_14133`);
  url.searchParams.set("dataResultadoPncpInicial", dataInicial);
  url.searchParams.set("dataResultadoPncpFinal", dataFinal);
  url.searchParams.set("pagina", String(pagina));
  url.searchParams.set("tamanhoPagina", "500");

  for (let tentativa = 0; tentativa < 4; tentativa++) {
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      const espera = 10_000 * 2 ** tentativa;
      console.warn(`  [PNCP-res] timeout (tentativa ${tentativa + 1}), aguardando ${espera / 1000}s...`);
      await sleep(espera);
      continue;
    }

    if (res.status === 429 || res.status === 503) {
      const espera = 15_000 * 2 ** tentativa;
      console.warn(`  [PNCP-res] rate-limit ${res.status}, aguardando ${espera / 1000}s...`);
      await sleep(espera);
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`PNCP-res ${res.status}: ${body.slice(0, 300)}`);
    }

    return res.json() as Promise<ResultadoPage>;
  }

  throw new Error("PNCP-res: máximo de tentativas atingido");
}

export async function* iterarResultados(
  dataInicial: string,
  dataFinal: string
): AsyncGenerator<PncpResultado> {
  let pagina = 1;

  while (true) {
    const page = await fetchPagina(dataInicial, dataFinal, pagina);
    const items = page.resultado ?? [];
    for (const item of items) yield item;

    if (items.length === 0 || page.paginasRestantes === 0) break;
    pagina++;
    await sleep(DELAY);
  }
}
