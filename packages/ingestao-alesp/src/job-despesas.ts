/**
 * Job: ingere despesas de gabinete ALESP → public.gastos_parlamentares.
 *
 * Estratégia (download-first):
 *   1. Resolve casa_id ALESP.
 *   2. Baixa `despesas_gabinetes.xml` (~170 MB) pra arquivo local em /tmp.
 *      Stream HTTP curto e contínuo — evita o keep-alive timeout do Apache
 *      da ALESP que cortava conexões quando o onBatch era lento.
 *   3. Pré-carrega mapa matricula → parlamentar_id (UUID).
 *   4. Processa o XML local via saxes: a cada lote (default 500), faz
 *      backfill de parlamentares "fantasma" + upsert em gastos_parlamentares.
 *
 * Filtros opcionais (delegados ao processador): anoExato, mesesExatos,
 * anoMin, anoMax — úteis pra incremental ou re-load parcial. Mesmo com
 * filtros, baixa o arquivo inteiro (não há paginação por ano na fonte).
 *
 * Caching: se `cachePath` apontar pra um arquivo que existe e não está
 * vazio, pula o download — útil pra reprocessar localmente sem re-baixar.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync } from "fs";
import { stat, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  baixarDespesasParaArquivo,
  processarArquivoDespesas,
  URL_DESPESAS,
} from "./despesas.js";
import { parseCategoriaAlesp } from "./types.js";
import type { DespesaAlesp, GastoCanonico, JobResult } from "./types.js";

export type JobDespesasAlespOpts = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  /** Default: 'ALESP' */
  siglaCasa?: string;
  /** Filtros de período. */
  anoExato?: number;
  anoMin?: number;
  anoMax?: number;
  mesesExatos?: number[];
  /** Tamanho do lote pra upsert. Default 500. */
  batchSize?: number;
  /**
   * Path do arquivo XML local (cache do download). Default:
   * `/tmp/alesp_despesas_YYYYMMDD.xml`. Se existir e não estiver vazio,
   * pula o download.
   */
  cachePath?: string;
  /** Se true, força re-download mesmo se cachePath existir. Default: false. */
  forcarDownload?: boolean;
  /** Se true, remove o arquivo após processar com sucesso. Default: false. */
  removerAposProcessar?: boolean;
};

export type JobDespesasAlespResult = JobResult & {
  /** Matrículas que apareceram nas despesas mas não existem em parlamentares. */
  matriculas_sem_parlamentar?: string[];
};

export async function jobIngestaoDespesasAlesp(
  opts: JobDespesasAlespOpts,
): Promise<JobDespesasAlespResult> {
  const inicio = Date.now();
  const sigla = opts.siglaCasa ?? "ALESP";
  const batchSize = opts.batchSize ?? 500;

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
        total: 0,
        processados: 0,
        upsertados: 0,
        ignorados: 0,
        erro: `casa ${sigla} não encontrada: ${casaErr?.message ?? "vazio"}`,
        duracao_ms: Date.now() - inicio,
      };
    }
    const casaId = casa.id as number;

    // 2. Pré-carrega mapa matricula → parlamentar_id
    const mapaMatricula = await carregarMapaMatricula(supabase, casaId);
    if (mapaMatricula.size === 0) {
      return {
        status: "erro",
        total: 0,
        processados: 0,
        upsertados: 0,
        ignorados: 0,
        erro: "nenhum parlamentar ALESP em `parlamentares` — rodar deputados:ts primeiro",
        duracao_ms: Date.now() - inicio,
      };
    }
    console.log(`▶ ${mapaMatricula.size} parlamentares ALESP carregados pro mapeamento.`);

    // 3. Download → arquivo local (rápido, contínuo — evita timeout do Apache ALESP)
    const cachePath = opts.cachePath ?? defaultCachePath();
    const precisaBaixar = opts.forcarDownload || !(await arquivoUtil(cachePath));
    if (precisaBaixar) {
      console.log(`▶ Baixando despesas_gabinetes.xml → ${cachePath}`);
      const dlRes = await baixarDespesasParaArquivo({
        path: cachePath,
        onProgress: ({ bytes }) => {
          const mb = (bytes / 1024 / 1024).toFixed(1);
          process.stdout.write(`\r  ↓ ${mb} MB baixados`);
        },
      });
      process.stdout.write("\n");
      if (dlRes.status === "erro") {
        return {
          status: "erro",
          total: 0,
          processados: 0,
          upsertados: 0,
          ignorados: 0,
          erro: `download: ${dlRes.erro}`,
          duracao_ms: Date.now() - inicio,
        };
      }
      console.log(`▶ Download OK — ${(dlRes.bytes / 1024 / 1024).toFixed(1)} MB em ${(dlRes.duracao_ms / 1000).toFixed(1)}s`);
    } else {
      const s = await stat(cachePath);
      console.log(`▶ Reusando cache local — ${cachePath} (${(s.size / 1024 / 1024).toFixed(1)} MB)`);
    }

    // 4. Processa arquivo local + upsert em batches
    let upsertados = 0;
    let ignoradosPorMatricula = 0;
    let parlamentaresFantasmaCriados = 0;
    const matriculasFaltantes = new Set<string>();
    let erroBatch: string | null = null;

    const result = await processarArquivoDespesas({
      path: cachePath,
      anoExato: opts.anoExato,
      anoMin: opts.anoMin,
      anoMax: opts.anoMax,
      mesesExatos: opts.mesesExatos,
      batchSize,
      onProgress: ({ lidos, emitidos, bytes }) => {
        const mb = (bytes / 1024 / 1024).toFixed(1);
        console.log(`  ${lidos.toLocaleString("pt-BR")} despesas lidas · ${emitidos.toLocaleString("pt-BR")} emitidas · ${mb} MB processados`);
      },
      onBatch: async (lote: DespesaAlesp[]) => {
        if (erroBatch) return;  // skip restante após erro

        // 3a. Backfill: cria parlamentares "fantasma" pra matrículas desconhecidas
        //     (deputados de legislaturas anteriores que aparecem no histórico
        //     de despesas mas não estão no `deputados.xml` atual).
        try {
          const criados = await backfillParlamentaresFantasma(
            supabase, casaId, lote, mapaMatricula,
          );
          parlamentaresFantasmaCriados += criados;
        } catch (err) {
          erroBatch = `backfill parlamentares: ${err instanceof Error ? err.message : String(err)}`;
          return;
        }

        // 3b. Mapeia DespesaAlesp → GastoCanonico
        const canonico: GastoCanonico[] = [];
        for (const d of lote) {
          const parlamentar_id = mapaMatricula.get(d.matricula);
          if (!parlamentar_id) {
            // Pós-backfill ainda faltando? Só se houve erro silencioso no INSERT.
            matriculasFaltantes.add(d.matricula);
            ignoradosPorMatricula++;
            continue;
          }
          const { cod, label } = parseCategoriaAlesp(d.tipo);
          canonico.push({
            parlamentar_id,
            casa_id: casaId,
            ano: d.ano,
            mes: d.mes,
            cod_categoria: cod,
            categoria: label,
            fornecedor: d.fornecedor || null,
            cnpj_cpf: d.cnpj,
            num_documento: "",        // ALESP não publica
            data_emissao: null,       // ALESP não publica
            valor_bruto: d.valor,
            valor_reembolso: d.valor, // ALESP não distingue — paga o valor da nota
            url_origem: URL_DESPESAS,
            metadata: { nome_deputado_xml: d.nome_deputado },
          });
        }

        if (canonico.length === 0) return;

        const { error } = await supabase
          .from("gastos_parlamentares")
          .upsert(canonico, {
            onConflict: "parlamentar_id,ano,mes,num_documento,cnpj_cpf,categoria,valor_bruto",
            ignoreDuplicates: true,
          });

        if (error) {
          erroBatch = `upsert batch (${canonico.length} regs): ${error.message}`;
          return;
        }
        upsertados += canonico.length;
      },
    });

    if (parlamentaresFantasmaCriados > 0) {
      console.log(`\n  ⓘ ${parlamentaresFantasmaCriados} parlamentares fantasma criados (legislaturas anteriores).`);
    }

    if (erroBatch) {
      return {
        status: "erro",
        total: result.lidos,
        processados: result.emitidos,
        upsertados,
        ignorados: ignoradosPorMatricula,
        erro: erroBatch,
        duracao_ms: Date.now() - inicio,
        matriculas_sem_parlamentar: Array.from(matriculasFaltantes).slice(0, 50),
      };
    }

    if (result.status === "erro") {
      return {
        status: "erro",
        total: result.lidos,
        processados: result.emitidos,
        upsertados,
        ignorados: ignoradosPorMatricula,
        erro: `processador: ${result.erro}`,
        duracao_ms: Date.now() - inicio,
        matriculas_sem_parlamentar: Array.from(matriculasFaltantes).slice(0, 50),
      };
    }

    // Sucesso — opcionalmente remove o cache local
    if (opts.removerAposProcessar) {
      try {
        await unlink(cachePath);
        console.log(`▶ Cache removido: ${cachePath}`);
      } catch (err) {
        console.warn(`  aviso: falha ao remover cache (${err instanceof Error ? err.message : String(err)})`);
      }
    } else {
      console.log(`▶ Cache mantido em ${cachePath} — passe removerAposProcessar:true pra remover.`);
    }

    return {
      status: "ok",
      total: result.lidos,
      processados: result.emitidos,
      upsertados,
      ignorados: ignoradosPorMatricula,
      duracao_ms: Date.now() - inicio,
      matriculas_sem_parlamentar:
        matriculasFaltantes.size > 0
          ? Array.from(matriculasFaltantes).slice(0, 50)
          : undefined,
    };
  } catch (err) {
    return {
      status: "erro",
      total: 0,
      processados: 0,
      upsertados: 0,
      ignorados: 0,
      erro: err instanceof Error ? err.message : String(err),
      duracao_ms: Date.now() - inicio,
    };
  }
}

/**
 * Caminho default do cache local: /tmp/alesp_despesas_YYYYMMDD.xml.
 * Inclui a data pra que mudanças diárias do XML upstream (atualização
 * publicada pela ALESP) gerem cache novo automaticamente.
 */
function defaultCachePath(): string {
  const d = new Date();
  const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return join(tmpdir(), `alesp_despesas_${yyyymmdd}.xml`);
}

/**
 * Considera o arquivo "útil" pro skip de download se existe e tem tamanho
 * razoável (> 100 MB). XML completo da ALESP é ~170 MB; ficheiro menor que
 * isso provavelmente é truncado de um run anterior que falhou.
 */
async function arquivoUtil(path: string): Promise<boolean> {
  if (!existsSync(path)) return false;
  try {
    const s = await stat(path);
    return s.size > 100 * 1024 * 1024;
  } catch {
    return false;
  }
}

/**
 * Carrega mapa Matricula → UUID parlamentar_id pra todos os deputados
 * ALESP existentes em `parlamentares_estaduais`. Paginado (Supabase limita 1000/query).
 */
async function carregarMapaMatricula(
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

/**
 * Cria entradas "fantasma" em `parlamentares_estaduais` pra matrículas que
 * aparecem em despesas históricas mas não estão na lista atual (deputados de
 * legislaturas anteriores). Marca `ativo=false` e `metadata.source='despesas_backfill'`.
 *
 * Atualiza o mapa em memória após o INSERT (via SELECT subsequente). Retorna
 * a quantidade real de novas linhas criadas (excluindo conflitos ignorados).
 *
 * Custo: 1-2 round-trips Supabase por batch que contenha matrículas novas
 * (UPSERT + SELECT). Batches sem matrículas novas pulam ambos.
 */
async function backfillParlamentaresFantasma(
  supabase: SupabaseClient,
  casaId: number,
  lote: DespesaAlesp[],
  mapa: Map<string, string>,
): Promise<number> {
  // Identifica matrículas desconhecidas neste batch.
  // Mantém o último `nome_deputado` visto pra usar como nome do fantasma.
  const novas = new Map<string, string>();  // matricula → nome
  for (const d of lote) {
    if (!mapa.has(d.matricula) && !novas.has(d.matricula)) {
      novas.set(d.matricula, d.nome_deputado || `(sem nome) ${d.matricula}`);
    }
  }
  if (novas.size === 0) return 0;

  // INSERT idempotente em parlamentares_estaduais
  const nowIso = new Date().toISOString();
  const rows = Array.from(novas.entries()).map(([matricula, nome]) => ({
    casa_id: casaId,
    id_externo: matricula,
    nome,
    ativo: false,                 // legislatura passada — não é mais ativo
    legislatura: null,            // desconhecida (não temos o mapeamento)
    metadata: {
      source: "despesas_backfill",
      criado_em: nowIso,
      observacao: "Criado automaticamente a partir de despesas históricas. Nome derivado do campo <Deputado> do XML.",
    },
    updated_at: nowIso,
  }));

  const { error: upErr } = await supabase
    .from("parlamentares_estaduais")
    .upsert(rows, { onConflict: "casa_id,id_externo", ignoreDuplicates: true });
  if (upErr) throw new Error(`upsert fantasmas: ${upErr.message}`);

  // SELECT pra atualizar o mapa em memória.
  // `in()` aceita centenas — batches têm no máx ~500 matrículas únicas.
  const matriculas = Array.from(novas.keys());
  const { data, error: selErr } = await supabase
    .from("parlamentares_estaduais")
    .select("id, id_externo")
    .eq("casa_id", casaId)
    .in("id_externo", matriculas);
  if (selErr) throw new Error(`reload mapa: ${selErr.message}`);

  let novosNoMapa = 0;
  for (const row of data ?? []) {
    const key = String(row.id_externo);
    if (!mapa.has(key)) {
      mapa.set(key, String(row.id));
      novosNoMapa++;
    }
  }
  return novosNoMapa;
}
