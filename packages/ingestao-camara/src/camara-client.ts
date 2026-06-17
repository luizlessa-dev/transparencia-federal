/**
 * Cliente da API de Dados Abertos da Câmara dos Deputados.
 * Docs: https://dadosabertos.camara.leg.br/api/v2
 * Sem autenticação. Paginação via links.last.
 */

const DEFAULT_BASE_URL = "https://dadosabertos.camara.leg.br/api/v2";

export interface ProposicaoResumo {
  id: number;
  uri: string;
  siglaTipo: string;
  codTipo: number;
  numero: number | null;
  ano: number | null;
  ementa: string | null;
  dataApresentacao: string | null;
  [key: string]: unknown;
}

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

/** Evento de votação (endpoint /votacoes) — campos reais retornados pela API */
export interface VotacaoResumo {
  id: string;
  uri: string;
  data: string;                   // "YYYY-MM-DD"
  dataHoraRegistro: string;       // ISO datetime
  siglaOrgao: string;             // "PLEN" | "CCJC" | "CFT" | ...
  uriOrgao: string;
  uriEvento: string;
  proposicaoObjeto: string | null;    // ex: "PL 1234/2023" (campo real da API)
  uriProposicaoObjeto: string | null; // URI da proposição (campo real da API)
  descricao: string | null;
  aprovacao: number | null;       // 1=aprovada, 0=rejeitada, null=sem resultado
}

/** Voto individual de um deputado em uma votação (endpoint /votacoes/{id}/votos) */
export interface VotoIndividual {
  tipoVoto: string;              // "Sim" | "Não" | "Abstenção" | "Obstrução" | "Art. 17"
  dataRegistroVoto: string | null;
  deputado_: {
    id: number;
    uri: string;
    nome: string;
    siglaPartido: string;
    uriPartido: string;
    siglaUf: string;
    idLegislatura: number;
    urlFoto: string;
  };
}

/** Orientação de bancada em uma votação (endpoint /votacoes/{id}/orientacoes) */
export interface OrientacaoBancada {
  orientacaoVoto: string;        // "Sim" | "Não" | "Abstenção" | "Obstrução" | "Liberado"
  codTipoLideranca: string;
  siglaPartidoBloco: string;     // sigla do partido ou bancada (PT, PL, GOVERNO, etc.)
  codPartidoBloco: number | null;
  uriPartidoBloco: string | null;
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

  private async get<T>(
    path: string,
    params: Record<string, string> = {},
    retries = 3
  ): Promise<RespostaCamara<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    for (let tentativa = 1; tentativa <= retries; tentativa++) {
      // AbortController explícito (em vez de AbortSignal.timeout) para que o
      // erro tenha name="AbortError" — o catch do job-ingestao-votacoes trata
      // como erro recuperável (skip da votação). API da Câmara ocasionalmente
      // pendura a conexão; sem isso, o job já travou 2h num único fetch.
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 30_000);

      try {
        const res = await fetch(url.toString(), {
          headers: { Accept: "application/json" },
          signal:  controller.signal,
        });

        if (res.ok) return await (res.json() as Promise<RespostaCamara<T>>);

        // Retry em 5xx (instabilidade do servidor da Câmara)
        if (res.status >= 500 && tentativa < retries) {
          const espera = tentativa * 2000; // 2s, 4s
          await new Promise((r) => setTimeout(r, espera));
          continue;
        }

        throw new Error(`Câmara API erro ${res.status} em ${path}: ${res.statusText}`);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new Error(`Câmara API timeout (30s) em ${path}`);
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw new Error(`Câmara API: esgotadas ${retries} tentativas em ${path}`);
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

  /**
   * Busca todas as votações do plenário (siglaOrgao="PLEN") de uma legislatura.
   *
   * Restrições da API /votacoes:
   *  - NÃO suporta: siglaOrgao, idLegislatura, dataFim (isolado funciona, combinado com dataInicio = 400)
   *  - Suporta: dataInicio sozinho
   *  - Range longo (>~2 anos) com DESC ordering causa 504
   *
   * Estratégia: por ano, com ordem=ASC, coletando páginas até a data cruzar o próximo ano.
   * Isso limita cada request ao período do ano + evita 504.
   */
  async buscarVotacoesPlenario(opts?: {
    itens?: number;
    dataInicio?: string; // "YYYY-MM-DD" — define o ano inicial
    anos?: number[];     // override manual de anos
  }): Promise<VotacaoResumo[]> {
    const itens = opts?.itens ?? 100;

    // Determina quais anos buscar
    let anos: number[];
    if (opts?.anos) {
      anos = opts.anos;
    } else {
      const anoInicio = opts?.dataInicio ? parseInt(opts.dataInicio.slice(0, 4), 10) : 2023;
      const anoFim    = new Date().getFullYear();
      anos = Array.from({ length: anoFim - anoInicio + 1 }, (_, i) => anoInicio + i);
    }

    const todas: VotacaoResumo[] = [];

    for (const ano of anos) {
      // No primeiro ano, respeita o dia de início se foi passado (ex: 2026-04-01).
      // Caso contrário, default é 1º de fev pra 2023 (início legislatura) ou 1º de janeiro.
      // Motivo: a API /votacoes trunca em ~21 páginas (~2.100 votações de TODOS os órgãos
      // combinados) — janelas grandes perdem o final do período. Filtrar a janela inicial
      // empurra o resultado para depois do bug de paginação.
      const isPrimeiroAno = ano === anos[0];
      let dataInicio: string;
      if (isPrimeiroAno && opts?.dataInicio && opts.dataInicio.slice(0, 4) === String(ano)) {
        dataInicio = opts.dataInicio;
      } else {
        dataInicio = ano === 2023 ? "2023-02-01" : `${ano}-01-01`;
      }
      const proxAno    = `${ano + 1}-01-01`;

      const params: Record<string, string> = {
        pagina:     "1",
        itens:      String(itens),
        ordem:      "ASC",           // ASC: começa pelo início do ano — menos dados por página
        ordenarPor: "dataHoraRegistro",
        dataInicio,
      };

      const plenAno: VotacaoResumo[] = [];
      let pagina = 1;

      while (true) {
        const resp = await this.get<VotacaoResumo>("/votacoes", { ...params, pagina: String(pagina) });
        if (!resp.dados || resp.dados.length === 0) break;

        let encerrou = false;
        for (const v of resp.dados) {
          // Para quando cruza para o próximo ano
          if (v.data >= proxAno) { encerrou = true; break; }
          if (v.siglaOrgao === "PLEN") plenAno.push(v);
        }

        if (encerrou) break;

        // Verifica última página
        const ultima = extrairUltimaPagina(resp.links);
        if (pagina >= ultima) break;
        pagina++;
      }

      console.log(`  [${ano}] ${plenAno.length} votações PLEN`);
      todas.push(...plenAno);
    }

    return todas;
  }

  /**
   * Busca todos os votos individuais de uma votação específica.
   * Retorna os deputados presentes e como votaram.
   */
  async buscarVotosDeVotacao(votacaoId: string): Promise<VotoIndividual[]> {
    // Nota: /votacoes/{id}/votos NÃO aceita parâmetros pagina/itens — retorna tudo em um único response
    const resp = await this.get<VotoIndividual>(`/votacoes/${votacaoId}/votos`, {});
    return resp.dados;
  }

  /**
   * Busca as orientações de bancadas para uma votação.
   * Permite calcular disciplina partidária.
   */
  async buscarOrientacoesDeVotacao(votacaoId: string): Promise<OrientacaoBancada[]> {
    // Nota: /votacoes/{id}/orientacoes NÃO aceita parâmetros pagina/itens — retorna tudo em um único response
    const resp = await this.get<OrientacaoBancada>(`/votacoes/${votacaoId}/orientacoes`, {});
    return resp.dados;
  }

  /** Busca todas as proposições de autoria de um deputado. */
  async buscarProposicoesDeputado(deputadoId: number, opts?: { itens?: number }): Promise<ProposicaoResumo[]> {
    const itens = opts?.itens ?? 100;
    const primeira = await this.get<ProposicaoResumo>("/proposicoes", {
      idDeputadoAutor: String(deputadoId),
      pagina: "1",
      itens: String(itens),
      ordem: "DESC",
      ordenarPor: "ano",
    });

    const ultimaPagina = extrairUltimaPagina(primeira.links);
    const todas: ProposicaoResumo[] = [...primeira.dados];

    for (let p = 2; p <= ultimaPagina; p++) {
      const resp = await this.get<ProposicaoResumo>("/proposicoes", {
        idDeputadoAutor: String(deputadoId),
        pagina: String(p),
        itens: String(itens),
        ordem: "DESC",
        ordenarPor: "ano",
      });
      todas.push(...resp.dados);
      if (resp.dados.length === 0) break;
    }

    return todas;
  }
}
