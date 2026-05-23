/**
 * Job: ingere lista de deputados em exercício na ALMG → public.parlamentares.
 *
 * REFACTOR (2026-05-23): após a migration `20260523000000_create_canonical_casas_schema`,
 * `almg_deputados` virou VIEW sobre `parlamentares`. Este job agora escreve
 * direto na tabela canônica `parlamentares` com casa_id = ALMG.
 *
 * - id_externo = id_almg (cast pra TEXT)
 * - casa_id = lookup de casas WHERE sigla='ALMG'
 *
 * Idempotente via upsert por (casa_id, id_externo). Marca como `ativo=false`
 * qualquer deputado que sumiu da lista da API.
 */
import { createClient } from "@supabase/supabase-js";
import { fetchDeputadosEmExercicio } from "./deputados.js";

export type JobDeputadosOpts = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  legislatura?: number; // default 20 (atual em 2026)
};

export type JobDeputadosResult = {
  status: "ok" | "erro";
  total: number;
  upsertados: number;
  desativados: number;
  erro?: string;
};

const SIGLA_CASA = "ALMG";

export async function jobIngestaoDeputadosAlmg(
  opts: JobDeputadosOpts,
): Promise<JobDeputadosResult> {
  const supabase = createClient(opts.supabaseUrl, opts.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
  const legislatura = opts.legislatura ?? 20;

  try {
    // 1. Resolve casa_id ALMG
    const { data: casa, error: casaErr } = await supabase
      .from("casas")
      .select("id")
      .eq("sigla", SIGLA_CASA)
      .maybeSingle();

    if (casaErr || !casa) {
      return {
        status: "erro",
        total: 0,
        upsertados: 0,
        desativados: 0,
        erro: `casa ${SIGLA_CASA} não encontrada: ${casaErr?.message ?? "vazio"}`,
      };
    }
    const casaId = casa.id as number;

    // 2. Fetch da API XML da ALMG
    const deputados = await fetchDeputadosEmExercicio();
    if (deputados.length === 0) {
      return { status: "erro", total: 0, upsertados: 0, desativados: 0, erro: "lista vazia da API" };
    }

    // 3. Upsert em parlamentares (canônica)
    const nowIso = new Date().toISOString();
    const rows = deputados.map((d) => ({
      casa_id: casaId,
      id_externo: String(d.id_almg),
      nome: d.nome,
      partido: d.partido,
      tag_localizacao: d.tag_localizacao,
      ativo: true,
      legislatura,
      updated_at: nowIso,
    }));

    const { error: upErr } = await supabase
      .from("parlamentares_estaduais")
      .upsert(rows, { onConflict: "casa_id,id_externo" });
    if (upErr) {
      return { status: "erro", total: rows.length, upsertados: 0, desativados: 0, erro: upErr.message };
    }

    // 4. Desativa deputados da legislatura atual que sumiram da lista
    const idsAtivos = new Set(rows.map((r) => r.id_externo));
    const { data: existentes, error: selErr } = await supabase
      .from("parlamentares_estaduais")
      .select("id_externo")
      .eq("casa_id", casaId)
      .eq("legislatura", legislatura)
      .eq("ativo", true);
    if (selErr) {
      return {
        status: "erro",
        total: rows.length,
        upsertados: rows.length,
        desativados: 0,
        erro: `select ativos: ${selErr.message}`,
      };
    }

    const aDesativar = (existentes ?? [])
      .map((r) => String(r.id_externo))
      .filter((id) => !idsAtivos.has(id));

    let desativados = 0;
    if (aDesativar.length > 0) {
      const { error: deErr } = await supabase
        .from("parlamentares_estaduais")
        .update({ ativo: false, updated_at: nowIso })
        .eq("casa_id", casaId)
        .in("id_externo", aDesativar);
      if (deErr) {
        return {
          status: "erro",
          total: rows.length,
          upsertados: rows.length,
          desativados: 0,
          erro: `desativar: ${deErr.message}`,
        };
      }
      desativados = aDesativar.length;
    }

    return {
      status: "ok",
      total: deputados.length,
      upsertados: rows.length,
      desativados,
    };
  } catch (err) {
    return {
      status: "erro",
      total: 0,
      upsertados: 0,
      desativados: 0,
      erro: err instanceof Error ? err.message : String(err),
    };
  }
}
