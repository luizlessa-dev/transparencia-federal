/**
 * Job: ingere despesas (verba indenizatória) ALEPE → public.gastos_parlamentares.
 *
 * Estratégia:
 *   1. Resolve casa_id ALEPE.
 *   2. Pré-carrega mapa id_externo → parlamentar_id (UUID).
 *   3. Para cada deputado/ano/mês: busca headers → busca notas → upsert em batch.
 *
 * A API ALEPE não tem bulk download — requer ~3-4 GETs por dep/mês:
 *   meses disponíveis → header(s) → notas por docid.
 *
 * Throttle: 300 ms entre chamadas (conservative, sem rate limit documentado).
 *
 * Idempotente via UNIQUE (parlamentar_id, ano, mes, num_documento, cnpj_cpf, categoria, valor_bruto).
 * `num_documento` = "{docid}_{rubrica}_{cnpj}_{valorCentavos}" — estável e único.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchDeputadosAlepe, fetchMesesDisponiveis, fetchVerbaHeaders, fetchVerbaNotas } from "./api.js";
import { categoriaAlepe, numDocumentoAlepe } from "./types.js";
import type { VerbaNota, GastoCanonico, JobResult } from "./types.js";

const BASE_URL = "https://www.alepe.pe.gov.br/servicos/transparencia";

export type JobDespesasAlepeOpts = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  /** Default: 'ALEPE' */
  siglaCasa?: string;
  /**
   * Anos a processar. Default: [ano corrente].
   * Pra histórico completo: Array.from({length: 12}, (_, i) => 2015 + i)
   */
  anos?: number[];
  /**
   * Meses a processar (1–12). Default: todos os meses disponíveis na API.
   * Útil pra incremental: passar só [mesAnterior, mesCorrente].
   */
  mesesExatos?: number[];
  /** Tamanho do lote pra upsert. Default 300. */
  batchSize?: number;
  /** Throttle entre chamadas HTTP (ms). Default 300. */
  throttleMs?: number;
  /**
   * Légitura dos deputados a processar. Default 17 (atual).
   * Para histórico completo, usar -16 (retorna todos os 163).
   */
  legDeputados?: number;
};

export type JobDespesasAlepeResult = JobResult & {
  /** Ids de deputados sem match em parlamentares_estaduais. */
  ids_sem_parlamentar?: string[];
};

/** Aguarda N milissegundos. */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function jobIngestaoDespesasAlepe(
  opts: JobDespesasAlepeOpts,
): Promise<JobDespesasAlepeResult> {
  const inicio = Date.now();
  const sigla = opts.siglaCasa ?? "ALEPE";
  const batchSize = opts.batchSize ?? 300;
  const throttleMs = opts.throttleMs ?? 300;
  const legDeputados = opts.legDeputados ?? 17;

  const anoAtual = new Date().getFullYear();
  const anos = opts.anos ?? [anoAtual];

  const supabase = createClient(opts.supabaseUrl, opts.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    // 1. Resolve casa_id
    const { data: casa, error: casaErr } = await supabase
      .from("casas")
      .select("id")
      .eq("sigla", sigla)
      .maybeSingle();

    if (casaErr || !casa) {
      return {
        status: "erro",
        total: 0, processados: 0, upsertados: 0, ignorados: 0,
        erro: `casa ${sigla} não encontrada: ${casaErr?.message ?? "vazio"}`,
        duracao_ms: Date.now() - inicio,
      };
    }
    const casaId = casa.id as number;

    // 2. Pré-carrega mapa id_externo → UUID
    const mapaId = await carregarMapaId(supabase, casaId);
    if (mapaId.size === 0) {
      return {
        status: "erro",
        total: 0, processados: 0, upsertados: 0, ignorados: 0,
        erro: "nenhum parlamentar ALEPE em parlamentares_estaduais — rodar run-deputados primeiro",
        duracao_ms: Date.now() - inicio,
      };
    }
    console.log(`▶ ${mapaId.size} parlamentares ALEPE carregados.`);

    // 3. Fetch lista de deputados a processar
    const deputados = await fetchDeputadosAlepe(legDeputados);
    if (deputados.length === 0) {
      return {
        status: "erro",
        total: 0, processados: 0, upsertados: 0, ignorados: 0,
        erro: "lista de deputados vazia da API ALEPE",
        duracao_ms: Date.now() - inicio,
      };
    }
    console.log(`▶ ${deputados.length} deputados a processar · anos=${anos.join(",")}${opts.mesesExatos ? ` · meses=[${opts.mesesExatos.join(",")}]` : ""}`);

    // 4. Loop principal: dep → ano → mês → headers → notas → upsert
    let totalNotas = 0;
    let upsertados = 0;
    let ignorados = 0;
    const idsSemParlamentar = new Set<string>();
    const batch: GastoCanonico[] = [];
    let erroBatch: string | null = null;

    const flushBatch = async () => {
      if (batch.length === 0 || erroBatch) return;
      const lote = batch.splice(0);
      const { error } = await supabase
        .from("gastos_parlamentares")
        .upsert(lote, {
          onConflict: "parlamentar_id,ano,mes,num_documento,cnpj_cpf,categoria,valor_bruto",
          ignoreDuplicates: true,
        });
      if (error) {
        erroBatch = `upsert gastos (${lote.length} regs): ${error.message}`;
      } else {
        upsertados += lote.length;
      }
    };

    for (const dep of deputados) {
      if (erroBatch) break;

      const parlamentarId = mapaId.get(dep.id);
      if (!parlamentarId) {
        idsSemParlamentar.add(dep.id);
        // Cria entrada backfill
        await backfillParlamentar(supabase, casaId, dep.id, dep.nome, mapaId);
        const pid = mapaId.get(dep.id);
        if (!pid) { ignorados++; continue; }
      }

      for (const ano of anos) {
        if (erroBatch) break;
        await sleep(throttleMs);

        const mesesDisp = await fetchMesesDisponiveis(dep.id, ano);
        const mesesAlvo = opts.mesesExatos
          ? mesesDisp.filter((m) => opts.mesesExatos!.includes(m))
          : mesesDisp;

        for (const mes of mesesAlvo) {
          if (erroBatch) break;
          await sleep(throttleMs);

          const headers = await fetchVerbaHeaders(dep.id, ano, mes);

          for (const hdr of headers) {
            if (erroBatch) break;
            await sleep(throttleMs);

            const notas = await fetchVerbaNotas(hdr.docid);
            totalNotas += notas.length;

            const pid = mapaId.get(dep.id)!;
            const urlOrigem = `${BASE_URL}/adm/verbaindenizatorianotas.php?docid=${hdr.docid}`;

            for (const nota of notas) {
              batch.push(notaToGasto(nota, {
                parlamentarId: pid,
                casaId,
                ano,
                mes,
                urlOrigem,
                nomeDeputado: dep.nome,
                docNumero: hdr.numero,
              }));
            }

            if (batch.length >= batchSize) {
              await flushBatch();
            }
          }
        }
      }
    }

    // Flush final
    if (batch.length > 0 && !erroBatch) {
      await flushBatch();
    }

    if (erroBatch) {
      return {
        status: "erro",
        total: totalNotas, processados: totalNotas, upsertados, ignorados,
        erro: erroBatch,
        duracao_ms: Date.now() - inicio,
        ids_sem_parlamentar: idsSemParlamentar.size > 0
          ? Array.from(idsSemParlamentar).slice(0, 50)
          : undefined,
      };
    }

    return {
      status: "ok",
      total: totalNotas,
      processados: totalNotas,
      upsertados,
      ignorados,
      duracao_ms: Date.now() - inicio,
      ids_sem_parlamentar: idsSemParlamentar.size > 0
        ? Array.from(idsSemParlamentar).slice(0, 50)
        : undefined,
    };
  } catch (err) {
    return {
      status: "erro",
      total: 0, processados: 0, upsertados: 0, ignorados: 0,
      erro: err instanceof Error ? err.message : String(err),
      duracao_ms: Date.now() - inicio,
    };
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Converte uma VerbaNota em GastoCanonico. */
function notaToGasto(
  nota: VerbaNota,
  ctx: {
    parlamentarId: string;
    casaId: number;
    ano: number;
    mes: number;
    urlOrigem: string;
    nomeDeputado: string;
    docNumero: string;
  },
): GastoCanonico {
  return {
    parlamentar_id: ctx.parlamentarId,
    casa_id: ctx.casaId,
    ano: ctx.ano,
    mes: ctx.mes,
    cod_categoria: nota.rubrica,
    categoria: categoriaAlepe(nota.rubrica),
    fornecedor: nota.empresa || null,
    cnpj_cpf: nota.cnpj,
    num_documento: numDocumentoAlepe(nota),
    data_emissao: nota.data,
    valor_bruto: nota.valor,
    valor_reembolso: nota.valor,
    url_origem: ctx.urlOrigem,
    metadata: {
      nome_deputado: ctx.nomeDeputado,
      doc_numero: ctx.docNumero,
      rubrica_raw: nota.rubrica,
    },
  };
}

/** Carrega mapa id_externo → UUID pra casa ALEPE (paginado). */
async function carregarMapaId(
  supabase: SupabaseClient,
  casaId: number,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const pageSize = 1000;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("parlamentares_estaduais")
      .select("id, id_externo")
      .eq("casa_id", casaId)
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`carregar parlamentares: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      out.set(String(row.id_externo), String(row.id));
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return out;
}

/** Cria entrada "fantasma" pra dep sem match e atualiza o mapa. */
async function backfillParlamentar(
  supabase: SupabaseClient,
  casaId: number,
  idExterno: string,
  nome: string,
  mapa: Map<string, string>,
): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("parlamentares_estaduais")
    .upsert([{
      casa_id: casaId,
      id_externo: idExterno,
      nome: nome || `(sem nome) ${idExterno}`,
      ativo: false,
      legislatura: null,
      metadata: { source: "despesas_backfill", criado_em: nowIso },
      updated_at: nowIso,
    }], { onConflict: "casa_id,id_externo", ignoreDuplicates: true });

  if (error) return;

  // Recarrega o UUID recém criado
  const { data } = await supabase
    .from("parlamentares_estaduais")
    .select("id")
    .eq("casa_id", casaId)
    .eq("id_externo", idExterno)
    .maybeSingle();

  if (data) mapa.set(idExterno, String(data.id));
}
