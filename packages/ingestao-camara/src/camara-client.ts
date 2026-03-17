/**
 * Cliente da API de Dados Abertos da Câmara dos Deputados.
 * Docs: https://dadosabertos.camara.leg.br/api/v2
 * Sem autenticação. Paginação via links.last.
 */

const DEFAULT_BASE_URL = "https://dadosabertos.camara.leg.br/api/v2";

export interface DeputadoResumo {
  id: number;
  uri: string;
  nome: string;
  siglaPartido: string;
  uriPartido: string;
  siglaUf: string;
  idLegislatura: number;
  urlFoto: string;
  email: string;
}

export interface DespesaDeputado {
  ano: number;
  mes: number;
  tipoDespesa: string;
  codDocumento: string;
  tipoDocumento: string;
  codTipoDocumento: number;
  dataDocumento: string;
  numDocumento: string;
  valorDocumento: number;
  urlDocumento: string;
  nomeFornecedor: string;
  cnpjCpfFornecedor: string;
  valorLiquido: number;
  valorGlosa: number;
  numRessarcimento: string;
  codLote: number;
  parcela: number;
  [key: string]: unknown;
}

export interface Senador {
  id: number;
  uri: string;
  nome: string;
  siglaPartido: string;
  uriPartido: string;
  siglaUf: string;
  urlFoto: string;
  email: string;
  [key: string]: unknown;
}

export interface Voto {
  id: number;
  uri: string;
  idVotacao: number;
  descricaoVoto: string;
  [key: string]: unknown;
}

interface RespostaCamara<T> {
  dados: T[];
  links: Array<{ rel: string; href: string }>;
}

/** Extrai o número da última página a partir dos links de paginação. */
function extrairUltimaPagina(links: Array<{ rel: string; href: string }>): number {
  const lastLink = links.find((l) => l.rel === "last");
  if (!lastLink) return 1;
  const match = lastLink.href.match(/pagina=(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

export class CamaraClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<RespostaCamara<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Câmara API erro ${res.status} em ${path}: ${res.statusText}`);
    }
    return res.json() as Promise<RespostaCamara<T>>;
  }

  /** Busca todos os deputados da legislatura atual. */
  async buscarDeputados(opts?: { itens?: number }): Promise<DeputadoResumo[]> {
    const itens = opts?.itens ?? 100;
    const primeira = await this.get<DeputadoResumo>("/deputados", {
      pagina: "1",
      itens: String(itens),
      ordem: "ASC",
      ordenarPor: "nome",
    });

    const ultimaPagina = extrairUltimaPagina(primeira.links);
    const todos: DeputadoResumo[] = [...primeira.dados];

    for (let p = 2; p <= ultimaPagina; p++) {
      const resp = await this.get<DeputadoResumo>("/deputados", {
        pagina: String(p),
        itens: String(itens),
        ordem: "ASC",
        ordenarPor: "nome",
      });
      todos.push(...resp.dados);
      if (resp.dados.length === 0) break;
    }

    return todos;
  }

  /** Busca despesas CEAPS de um deputado para um ano. */
  async buscarDespesasDeputado(
    deputadoId: number,
    ano: number,
    opts?: { itens?: number }
  ): Promise<DespesaDeputado[]> {
    const itens = opts?.itens ?? 100;
    const primeira = await this.get<DespesaDeputado>(
      `/deputados/${deputadoId}/despesas`,
      { ano: String(ano), pagina: "1", itens: String(itens) }
    );

    const ultimaPagina = extrairUltimaPagina(primeira.links);
    const todos: DespesaDeputado[] = [...primeira.dados];

    for (let p = 2; p <= ultimaPagina; p++) {
      const resp = await this.get<DespesaDeputado>(
        `/deputados/${deputadoId}/despesas`,
        { ano: String(ano), pagina: String(p), itens: String(itens) }
      );
      todos.push(...resp.dados);
      if (resp.dados.length === 0) break;
    }

    return todos;
  }

  /** Busca todos os senadores em exercício. */
  async buscarSenadores(opts?: { itens?: number }): Promise<Senador[]> {
    const itens = opts?.itens ?? 100;
    const primeira = await this.get<Senador>("/senadores", {
      pagina: "1",
      itens: String(itens),
      ordem: "ASC",
      ordenarPor: "nome",
    });

    const ultimaPagina = extrairUltimaPagina(primeira.links);
    const todos: Senador[] = [...primeira.dados];

    for (let p = 2; p <= ultimaPagina; p++) {
      const resp = await this.get<Senador>("/senadores", {
        pagina: String(p),
        itens: String(itens),
        ordem: "ASC",
        ordenarPor: "nome",
      });
      todos.push(...resp.dados);
      if (resp.dados.length === 0) break;
    }

    return todos;
  }

  /** Busca votações de um deputado. */
  async buscarVotacoesDeputado(deputadoId: number, opts?: { itens?: number }): Promise<Voto[]> {
    const itens = opts?.itens ?? 100;
    const primeira = await this.get<Voto>(
      `/deputados/${deputadoId}/votacoes`,
      { pagina: "1", itens: String(itens) }
    );

    const ultimaPagina = extrairUltimaPagina(primeira.links);
    const todos: Voto[] = [...primeira.dados];

    for (let p = 2; p <= ultimaPagina; p++) {
      const resp = await this.get<Voto>(
        `/deputados/${deputadoId}/votacoes`,
        { pagina: String(p), itens: String(itens) }
      );
      todos.push(...resp.dados);
      if (resp.dados.length === 0) break;
    }

    return todos;
  }
}
