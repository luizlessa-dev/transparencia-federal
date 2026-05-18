/**
 * job_ingestao_emendas_completas
 * Ingere TODAS as emendas parlamentares (Individual, Bancada, Comissão, Relator/RP9)
 * da API do Portal da Transparência para a tabela emendas_completas.
 * Inclui anos históricos do orçamento secreto (2019-2022) + anos recentes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient, inserirExecucao, atualizarExecucao, inserirEtapa, atualizarEtapa } from "./db.js";

const JOB_NOME = "job_ingestao_emendas_completas";
const ETAPA_NOME = "ingestao_emendas_completas";
const TAMANHO_LOTE = 200;
const DELAY_MS = 150;
const ANOS_DEFAULT = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

const ESTADOS: Record<string, string> = {
  ACRE: "AC", ALAGOAS: "AL", AMAPÁ: "AP", AMAZONAS: "AM", BAHIA: "BA",
  CEARÁ: "CE", "DISTRITO FEDERAL": "DF", "ESPÍRITO SANTO": "ES", GOIÁS: "GO",
  MARANHÃO: "MA", "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS",
  "MINAS GERAIS": "MG", PARÁ: "PA", PARAÍBA: "PB", PARANÁ: "PR",
  PERNAMBUCO: "PE", PIAUÍ: "PI", "RIO DE JANEIRO": "RJ",
  "RIO GRANDE DO NORTE": "RN", "RIO GRANDE DO SUL": "RS",
  RONDÔNIA: "RO", RORAIMA: "RR", "SANTA CATARINA": "SC",
  "SÃO PAULO": "SP", SERGIPE: "SE", TOCANTINS: "TO",
};

const UF_SIGLAS = new Set(Object.values(ESTADOS));

/** Parseia valor no formato BR: "1.234.567,89" → 1234567.89 */
function parseBR(v: unknown): number {
  if (!v) return 0;
  const s = String(v).replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/** Extrai UF e município de localidadeDoGasto. Exemplos:
 * "SERGIPE (UF)" → { uf: "SE", municipio: null }
 * "IGARATÁ - SP"  → { uf: "SP", municipio: "Igaratá" }
 * "Nacional"      → { uf: null, municipio: null }
 */
function extrairLocalidade(localidade: string | null): { uf: string | null; municipio: string | null } {
  if (!localidade || localidade.toLowerCase() === "nacional") return { uf: null, municipio: null };

  // Formato "NOME ESTADO (UF)"
  const matchUf = localidade.match(/\(([A-Z]{2})\)\s*$/);
  if (matchUf) {
    const sig = matchUf[1];
    return { uf: UF_SIGLAS.has(sig) ? sig : null, municipio: null };
  }

  // Formato "NOME MUNICÍPIO - UF"
  const matchCidade = localidade.match(/^(.+?)\s+-\s+([A-Z]{2})\s*$/);
  if (matchCidade) {
    const [, cidade, sig] = matchCidade;
    return {
      uf: UF_SIGLAS.has(sig) ? sig : null,
      municipio: cidade.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
    };
  }

  // Tentar nome de estado sem parênteses
  for (const [nome, sig] of Object.entries(ESTADOS)) {
    if (localidade.toUpperCase().includes(nome)) return { uf: sig, municipio: null };
  }

  return { uf: null, municipio: null };
}

type EmendaRow = Record<string, unknown>;

function mapearEmenda(item: EmendaRow, ano: number): Record<string, unknown> {
  const localidade = item.localidadeDoGasto as string | null;
  const { uf, municipio } = extrairLocalidade(localidade);
  return {
    codigo_emenda: String(item.codigoEmenda ?? ""),
    ano,
    tipo_emenda: String(item.tipoEmenda ?? ""),
    autor_nome: item.autor ? String(item.autor).trim() : null,
    numero_emenda: item.numeroEmenda ? String(item.numeroEmenda).trim() : null,
    localidade: localidade ?? null,
    uf,
    municipio,
    funcao: item.funcao ? String(item.funcao).trim() : null,
    subfuncao: item.subfuncao ? String(item.subfuncao).trim() : null,
    valor_empenhado: parseBR(item.valorEmpenhado),
    valor_liquidado: parseBR(item.valorLiquidado),
    valor_pago: parseBR(item.valorPago),
    valor_resto_inscrito: parseBR(item.valorRestoInscrito),
    valor_resto_cancelado: parseBR(item.valorRestoCancelado),
    valor_resto_pago: parseBR(item.valorRestoPago),
    dados: item,
    atualizado_em: new Date().toISOString(),
  };
}

async function fetchPagina(
  apiKey: string,
  ano: number,
  pagina: number,
  baseUrl: string
): Promise<EmendaRow[]> {
  const url = `${baseUrl}/api-de-dados/emendas?ano=${ano}&pagina=${pagina}&tamanhoPagina=100`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "chave-api-dados": apiKey,
      "User-Agent": "Mozilla/5.0 (compatible; TransparenciaFederal/3.0; +https://transparenciafederal.org)",
    },
  });
  if (!res.ok) throw new Error(`API erro ${res.status} (ano=${ano} p=${pagina})`);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("json")) return [];
  const data = await res.json();
  return Array.isArray(data) ? (data as EmendaRow[]) : [];
}

async function upsertLote(sb: SupabaseClient, rows: Record<string, unknown>[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { error } = await sb
    .from("emendas_completas")
    .upsert(rows, { onConflict: "codigo_emenda,ano" });
  if (error) throw new Error(`Upsert emendas_completas: ${error.message}`);
  return rows.length;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface JobIngestaoEmendasCompletasConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  portalApiKey: string;
  portalBaseUrl?: string;
  anos?: number[];
}

export interface ResultadoAnoCompletas {
  ano: number;
  total: number;
  inseridos: number;
  rp9: number;
  duracao_ms: number;
  erro?: string;
}

export interface ResultadoJobEmendasCompletas {
  execucao_id: string;
  status: "sucesso" | "erro";
  resultados_por_ano: ResultadoAnoCompletas[];
  erro?: string;
}

export async function jobIngestaoEmendasCompletas(
  config: JobIngestaoEmendasCompletasConfig
): Promise<ResultadoJobEmendasCompletas> {
  const sb = createSupabaseClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  const baseUrl = (config.portalBaseUrl ?? "https://api.portaldatransparencia.gov.br").replace(/\/$/, "");
  const anos = config.anos ?? ANOS_DEFAULT;

  const execucao_id = await inserirExecucao(sb, {
    job_nome: JOB_NOME,
    status: "em_andamento",
    detalhes: { anos },
  });

  const etapa_id = await inserirEtapa(sb, {
    execucao_id,
    etapa_nome: ETAPA_NOME,
    status: "em_andamento",
    detalhes: {},
  });

  const resultados_por_ano: ResultadoAnoCompletas[] = [];

  try {
    for (const ano of anos) {
      const t0 = Date.now();
      let total = 0, inseridos = 0, rp9 = 0, pagina = 1;

      console.log(`  [${ano}] iniciando...`);

      while (true) {
        let chunk: EmendaRow[];
        try {
          chunk = await fetchPagina(config.portalApiKey, ano, pagina, baseUrl);
        } catch (err) {
          console.error(`  [${ano}] Erro p${pagina}: ${(err as Error).message}`);
          break;
        }

        if (chunk.length === 0) break;

        const rawRows = chunk.map((item) => mapearEmenda(item, ano));

        // Deduplicar por (codigo_emenda, ano) — Portal pode retornar múltiplas
        // ações da mesma emenda na mesma página, causando conflito no upsert
        const rows = Array.from(
          new Map(rawRows.map((r) => [`${r.codigo_emenda}|${r.ano}`, r])).values()
        );

        total += rows.length;
        rp9 += rows.filter((r) => String(r.tipo_emenda).toLowerCase().includes("relator")).length;

        for (let i = 0; i < rows.length; i += TAMANHO_LOTE) {
          inseridos += await upsertLote(sb, rows.slice(i, i + TAMANHO_LOTE));
        }

        if (pagina % 100 === 0) console.log(`  [${ano}] p${pagina} → ${total} registros`);
        pagina++;
        await delay(DELAY_MS);
      }

      const duracao_ms = Date.now() - t0;
      console.log(`  [${ano}] ✓ ${total} emendas (${rp9} RP9) — ${duracao_ms}ms`);
      resultados_por_ano.push({ ano, total, inseridos, rp9, duracao_ms });
    }

    await atualizarEtapa(sb, etapa_id, {
      finalizado_em: new Date().toISOString(),
      status: "sucesso",
      detalhes: { resultados_por_ano },
    });
    await atualizarExecucao(sb, execucao_id, {
      finalizado_em: new Date().toISOString(),
      status: "sucesso",
      detalhes: { resultados_por_ano },
    });

    return { execucao_id, status: "sucesso", resultados_por_ano };
  } catch (err) {
    const erro = err instanceof Error ? err.message : String(err);
    await atualizarEtapa(sb, etapa_id, { finalizado_em: new Date().toISOString(), status: "erro", detalhes: { erro } });
    await atualizarExecucao(sb, execucao_id, { finalizado_em: new Date().toISOString(), status: "erro", detalhes: { erro } });
    return { execucao_id, status: "erro", resultados_por_ano, erro };
  }
}
