/**
 * Job: ingere lista de deputados ALEPE → public.parlamentares_estaduais.
 *
 * - `id_externo` = campo `id` da API (chave de junção com verbas de cada dep)
 * - `ativo` = deputado está na legislatura atual (leg=17)
 * - Campos extras (email, foto, partido) vão pra `metadata`
 *
 * Idempotente via upsert em (casa_id, id_externo).
 */
import { createClient } from "@supabase/supabase-js";
import { fetchDeputadosAlepe } from "./api.js";
import type { JobResult } from "./types.js";

export type JobDeputadosAlepeOpts = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  /** Default: 'ALEPE' */
  siglaCasa?: string;
  /** Legislatura atual (default 17 — 2023-2026) */
  legislatura?: number;
};

export async function jobIngestaoDeputadosAlepe(
  opts: JobDeputadosAlepeOpts,
): Promise<JobResult> {
  const inicio = Date.now();
  const sigla = opts.siglaCasa ?? "ALEPE";
  const legislatura = opts.legislatura ?? 17;

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

    // 2. Fetch todos os deputados históricos (leg=-16, ~163 entradas)
    //    e os atuais (leg=17) pra marcar ativo corretamente.
    const [historicos, atuais] = await Promise.all([
      fetchDeputadosAlepe(-16),
      fetchDeputadosAlepe(17),
    ]);

    if (historicos.length === 0) {
      return {
        status: "erro",
        total: 0, processados: 0, upsertados: 0, ignorados: 0,
        erro: "lista de deputados históricos vazia da API ALEPE",
        duracao_ms: Date.now() - inicio,
      };
    }

    const idsAtivos = new Set(atuais.map((d) => d.id));

    // 3. Monta linhas pro upsert (todos os históricos como base)
    const nowIso = new Date().toISOString();
    const rows = historicos.map((d) => ({
      casa_id: casaId,
      id_externo: d.id,
      nome: d.nome,
      partido: d.partido,
      ativo: idsAtivos.has(d.id),
      legislatura: idsAtivos.has(d.id) ? legislatura : null,
      metadata: {
        email: d.email,
        foto_url: d.foto
          ? `https://www.alepe.pe.gov.br${d.foto}`
          : null,
      },
      updated_at: nowIso,
    }));

    // 4. Upsert em batches de 200
    const BATCH = 200;
    let upsertados = 0;
    let erroBatch: string | null = null;

    for (let i = 0; i < rows.length; i += BATCH) {
      const lote = rows.slice(i, i + BATCH);
      const { error } = await supabase
        .from("parlamentares_estaduais")
        .upsert(lote, { onConflict: "casa_id,id_externo" });
      if (error) {
        erroBatch = `upsert parlamentares (offset ${i}): ${error.message}`;
        break;
      }
      upsertados += lote.length;
    }

    if (erroBatch) {
      return {
        status: "erro",
        total: rows.length, processados: upsertados, upsertados, ignorados: 0,
        erro: erroBatch,
        duracao_ms: Date.now() - inicio,
      };
    }

    return {
      status: "ok",
      total: historicos.length,
      processados: rows.length,
      upsertados,
      ignorados: 0,
      duracao_ms: Date.now() - inicio,
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
