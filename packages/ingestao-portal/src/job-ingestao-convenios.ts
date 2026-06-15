/**
 * job_ingestao_convenios
 * Coleta convênios do Portal da Transparência por UF.
 * A API exige ao menos um filtro: UF, órgão, convenente ou número.
 * Itera pelas 27 UFs para cobertura nacional.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inserirExecucao, atualizarExecucao, inserirEtapa, atualizarEtapa } from "./db.js";

const PORTAL_BASE_URL = "https://api.portaldatransparencia.gov.br/api-de-dados";
const TAMANHO_PAGINA = 100;
const DELAY_MS = 400;

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

export interface JobIngestaoConveniosConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  portalApiKey: string;
  portalBaseUrl?: string;
  ufs?: string[];
}

export interface ResultadoUFConvenios {
  uf: string;
  total: number;
  inseridos: number;
}

export interface ResultadoJobConvenios {
  execucao_id: string;
  status: "sucesso" | "erro";
  resultados_por_uf: ResultadoUFConvenios[];
  erro?: string;
}

async function buscarConveniosPorUF(
  apiKey: string,
  uf: string,
  baseUrl = PORTAL_BASE_URL
): Promise<Record<string, unknown>[]> {
  const todos: Record<string, unknown>[] = [];
  let pagina = 1;

  while (true) {
    const url =
      `${baseUrl}/convenios` +
      `?pagina=${pagina}&tamanhoPagina=${TAMANHO_PAGINA}` +
      `&uf=${uf}`;

    const res = await fetch(url, {
      headers: { "chave-api-dados": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.error(`  UF ${uf} pág ${pagina}: HTTP ${res.status}`);
      break;
    }

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || data.length === 0) break;

    todos.push(...(data as Record<string, unknown>[]));
    if (data.length < TAMANHO_PAGINA) break;
    pagina++;
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  return todos;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function parseData(v: unknown): string | null {
  if (!v) return null;
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function mapearConvenio(item: Record<string, unknown>): Record<string, unknown> | null {
  if (!item.id) return null;

  const dim = (item.dimConvenio ?? {}) as Record<string, unknown>;
  const convenente = (item.convenente ?? {}) as Record<string, unknown>;
  const municipio = (item.municipioConvenente ?? {}) as Record<string, unknown>;
  const ufObj = (municipio.uf ?? {}) as Record<string, unknown>;
  const orgao = (item.orgao ?? {}) as Record<string, unknown>;
  const orgaoMax = (orgao.orgaoMaximo ?? {}) as Record<string, unknown>;
  const ug = (item.unidadeGestora ?? {}) as Record<string, unknown>;
  const tipo = (item.tipoInstrumento ?? {}) as Record<string, unknown>;
  const subfuncao = (item.subfuncao ?? {}) as Record<string, unknown>;
  const funcao = (subfuncao.funcao ?? {}) as Record<string, unknown>;

  return {
    id_portal: Number(item.id),
    numero: str(dim.numero),
    codigo: str(dim.codigo),
    objeto: str(dim.objeto),
    situacao: str(item.situacao),
    tipo_instrumento: str(tipo.descricao),
    numero_processo: str(item.numeroProcesso),

    data_publicacao: parseData(item.dataPublicacao),
    data_inicio_vigencia: parseData(item.dataInicioVigencia),
    data_final_vigencia: parseData(item.dataFinalVigencia),
    data_ultima_liberacao: parseData(item.dataUltimaLiberacao),
    data_conclusao: parseData(item.dataConclusao),

    convenente_cnpj: str(convenente.cnpjFormatado),
    convenente_cpf: str(convenente.cpfFormatado),
    convenente_nome: str(convenente.nome),
    convenente_tipo: str(convenente.tipo),

    municipio_ibge: str(municipio.codigoIBGE),
    municipio_nome: str(municipio.nomeIBGE),
    uf: str(ufObj.nome),

    orgao_siafi: str(orgao.codigoSIAFI),
    orgao_cnpj: str(orgao.cnpj),
    orgao_sigla: str(orgao.sigla),
    orgao_nome: str(orgao.nome),
    orgao_poder: str(orgao.descricaoPoder),
    orgao_maximo_codigo: str(orgaoMax.codigo),
    orgao_maximo_sigla: str(orgaoMax.sigla),
    orgao_maximo_nome: str(orgaoMax.nome),

    ug_codigo: str(ug.codigo),
    ug_nome: str(ug.nome),

    subfuncao_codigo: str(subfuncao.codigoSubfuncao),
    subfuncao_descricao: str(subfuncao.descricaoSubfuncap),
    funcao_codigo: str(funcao.codigoFuncao),
    funcao_descricao: str(funcao.descricaoFuncao),

    valor: num(item.valor),
    valor_liberado: num(item.valorLiberado),
    valor_contrapartida: num(item.valorContrapartida),
    valor_ultima_liberacao: num(item.valorDaUltimaLiberacao),

    dados: item,
    atualizado_em: new Date().toISOString(),
  };
}

async function upsertLote(sb: SupabaseClient, rows: Record<string, unknown>[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { error } = await sb
    .from("convenios")
    .upsert(rows, { onConflict: "id_portal", ignoreDuplicates: false });
  if (error) {
    console.error(`  Upsert erro: ${error.message}`);
    return 0;
  }
  return rows.length;
}

export async function jobIngestaoConvenios(
  config: JobIngestaoConveniosConfig
): Promise<ResultadoJobConvenios> {
  const sb = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  const ufs = config.ufs ?? UFS;
  const apiKey = config.portalApiKey;
  const baseUrl = config.portalBaseUrl ?? PORTAL_BASE_URL;

  const execucao_id = await inserirExecucao(sb, {
    job_nome: "job_ingestao_convenios",
    status: "em_andamento",
    detalhes: { ufs },
  });
  const etapa_id = await inserirEtapa(sb, {
    execucao_id,
    etapa_nome: "ingestao_convenios",
    status: "em_andamento",
    detalhes: { ufs },
  });

  const resultados_por_uf: ResultadoUFConvenios[] = [];

  try {
    for (const uf of ufs) {
      process.stdout.write(`\r  Buscando UF ${uf}...`);
      const itens = await buscarConveniosPorUF(apiKey, uf, baseUrl);
      const rows = itens
        .map(mapearConvenio)
        .filter((r): r is Record<string, unknown> => r !== null);

      const inseridos = await upsertLote(sb, rows);
      resultados_por_uf.push({ uf, total: rows.length, inseridos });
      console.log(`\r  UF ${uf}: ${rows.length} convênios, ${inseridos} inseridos/atualizados`);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    const finalizado_em = new Date().toISOString();
    await atualizarEtapa(sb, etapa_id, { finalizado_em, status: "sucesso", detalhes: { resultados_por_uf } });
    await atualizarExecucao(sb, execucao_id, { finalizado_em, status: "sucesso", detalhes: { resultados_por_uf } });

    return { execucao_id, status: "sucesso", resultados_por_uf };
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    const finalizado_em = new Date().toISOString();
    await atualizarEtapa(sb, etapa_id, { finalizado_em, status: "erro", detalhes: { erro: mensagem } });
    await atualizarExecucao(sb, execucao_id, { finalizado_em, status: "erro", detalhes: { erro: mensagem } });
    return { execucao_id, status: "erro", resultados_por_uf, erro: mensagem };
  }
}
