/**
 * Cliente PostgREST para APIs públicas do TransfereGov (sem autenticação).
 *
 * Módulos disponíveis:
 *  - TED  (Termos de Execução Descentralizada): api.transferegov.gestao.gov.br/ted/
 *  - FAF  (Fundo a Fundo):                      api.transferegov.gestao.gov.br/fundoafundo/
 *
 * Paginação via limit/offset (PostgREST).
 * Total de registros retornado no header Content-Range quando Prefer: count=exact.
 */

const BASE_TED = "https://api.transferegov.gestao.gov.br/ted";
const BASE_FAF = "https://api.transferegov.gestao.gov.br/fundoafundo";
const DELAY_MS = 600;
const PAGE_SIZE = 1000;

export type Modulo = "ted" | "faf";

// ──────────────────────────────────────────────
// Tipos — TED
// ──────────────────────────────────────────────

export interface TedPlanoAcao {
  id_plano_acao: number;
  id_programa: number;
  sigla_unidade_descentralizada?: string;
  unidade_descentralizada?: string;
  sigla_unidade_responsavel_execucao?: string;
  unidade_responsavel_execucao?: string;
  vl_total_plano_acao?: number;
  dt_inicio_vigencia?: string;
  dt_fim_vigencia?: string;
  tx_objeto_plano_acao?: string;
  tx_justificativa_plano_acao?: string;
  in_forma_execucao_direta?: boolean;
  in_forma_execucao_particulares?: boolean;
  in_forma_execucao_descentralizada?: boolean;
  tx_situacao_plano_acao?: string;
  aa_ano_plano_acao?: number;
  vl_beneficiario_especifico?: number;
  vl_chamamento_publico?: number;
  sq_instrumento?: number | null;
  aa_instrumento?: number | null;
}

export interface TedTermoExecucao {
  id_termo: number;
  id_plano_acao: number;
  tx_situacao_termo?: string;
  tx_num_processo_sei?: string | null;
  dt_assinatura_termo?: string | null;
  dt_divulgacao_termo?: string | null;
  in_minuta_padrao?: boolean;
  tx_numero_ns_termo?: string;
  dt_recebimento_termo?: string | null;
  dt_efetivacao_termo?: string | null;
}

// ──────────────────────────────────────────────
// Tipos — FAF
// ──────────────────────────────────────────────

export interface FafPlanoAcao {
  id_plano_acao: number;
  codigo_plano_acao?: string;
  data_inicio_vigencia_plano_acao?: string;
  data_fim_vigencia_plano_acao?: string;
  diagnostico_plano_acao?: string;
  objetivos_plano_acao?: string;
  situacao_plano_acao?: string;
  valor_repasse_emenda_plano_acao?: number;
  valor_repasse_especifico_plano_acao?: number;
  valor_repasse_voluntario_plano_acao?: number;
  valor_total_repasse_plano_acao?: number;
  valor_recursos_proprios_plano_acao?: number;
  valor_total_plano_acao?: number;
  valor_total_investimento_plano_acao?: number;
  valor_total_custeio_plano_acao?: number;
  valor_saldo_disponivel_plano_acao?: number;
  id_orgao_repassador_plano_acao?: number;
  sigla_orgao_repassador_plano_acao?: string;
  cnpj_orgao_repassador_plano_acao?: string;
  nome_orgao_repassador_plano_acao?: string;
  cnpj_ente_recebedor_plano_acao?: string;
  nome_ente_recebedor_plano_acao?: string;
  uf_ente_recebedor_plano_acao?: string;
  nome_municipio_ente_recebedor_plano_acao?: string;
  codigo_ibge_municipio_ente_recebedor_plano_acao?: number;
  cnpj_fundo_repassador_plano_acao?: string;
  nome_fundo_repassador_plano_acao?: string;
  uf_fundo_repassador_plano_acao?: string;
  cnpj_fundo_recebedor_plano_acao?: string;
  nome_fundo_recebedor_plano_acao?: string;
  uf_fundo_recebedor_plano_acao?: string;
  municipio_fundo_recebedor_plano_acao?: string;
  codigo_ibge_fundo_recebedor_plano_acao?: number;
  id_programa?: number;
}

// ──────────────────────────────────────────────
// Cliente PostgREST genérico
// ──────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPagina<T>(
  baseUrl: string,
  tabela: string,
  offset: number,
  limit = PAGE_SIZE,
  filtros: Record<string, string> = {}
): Promise<T[]> {
  const url = new URL(`${baseUrl}/${tabela}`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  for (const [k, v] of Object.entries(filtros)) {
    url.searchParams.set(k, v);
  }

  for (let tentativa = 0; tentativa < 4; tentativa++) {
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      const espera = 10_000 * 2 ** tentativa;
      console.warn(`  [TransfereGov] timeout/rede (tentativa ${tentativa + 1}), aguardando ${espera / 1000}s...`);
      await sleep(espera);
      continue;
    }

    if (res.status === 429 || res.status === 503) {
      const espera = 15_000 * 2 ** tentativa;
      console.warn(`  [TransfereGov] rate-limit ${res.status}, aguardando ${espera / 1000}s...`);
      await sleep(espera);
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`TransfereGov ${tabela} HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    return res.json() as Promise<T[]>;
  }

  throw new Error(`TransfereGov ${tabela}: máximo de tentativas atingido`);
}

async function contarRegistros(baseUrl: string, tabela: string): Promise<number> {
  const res = await fetch(`${baseUrl}/${tabela}?limit=1`, {
    headers: { Accept: "application/json", Prefer: "count=exact" },
    signal: AbortSignal.timeout(30_000),
  });
  // Content-Range: 0-0/TOTAL
  const range = res.headers.get("content-range") ?? "";
  const match = range.match(/\/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

export async function* iterarTabela<T>(
  modulo: Modulo,
  tabela: string,
  filtros: Record<string, string> = {}
): AsyncGenerator<T> {
  const baseUrl = modulo === "ted" ? BASE_TED : BASE_FAF;
  let offset = 0;

  while (true) {
    const items = await fetchPagina<T>(baseUrl, tabela, offset, PAGE_SIZE, filtros);
    for (const item of items) yield item;
    if (items.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    await sleep(DELAY_MS);
  }
}

// Atalhos tipados por tabela

export function iterarTedPlanoAcao() {
  return iterarTabela<TedPlanoAcao>("ted", "plano_acao");
}

export function iterarTedTermoExecucao() {
  return iterarTabela<TedTermoExecucao>("ted", "termo_execucao");
}

export function iterarFafPlanoAcao() {
  return iterarTabela<FafPlanoAcao>("faf", "plano_acao");
}

export async function resumoVolumes(): Promise<Record<string, number>> {
  const [
    tedPlanos,
    tedTermos,
    fafPlanos,
    fafRelatorios,
  ] = await Promise.all([
    contarRegistros(BASE_TED, "plano_acao"),
    contarRegistros(BASE_TED, "termo_execucao"),
    contarRegistros(BASE_FAF, "plano_acao"),
    contarRegistros(BASE_FAF, "relatorio_gestao"),
  ]);

  return {
    "ted/plano_acao": tedPlanos,
    "ted/termo_execucao": tedTermos,
    "faf/plano_acao": fafPlanos,
    "faf/relatorio_gestao": fafRelatorios,
  };
}
