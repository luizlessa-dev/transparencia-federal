/**
 * Job: ingere lista de deputados em exercício na ALMG → public.almg_deputados.
 *
 * Idempotente via upsert por id_almg. Marca como `ativo=false` qualquer deputado
 * que sumiu da lista da API (suplente que saiu, etc).
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

export async function jobIngestaoDeputadosAlmg(
  opts: JobDeputadosOpts,
): Promise<JobDeputadosResult> {
  const supabase = createClient(opts.supabaseUrl, opts.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
  const legislatura = opts.legislatura ?? 20;

  try {
    const deputados = await fetchDeputadosEmExercicio();
    if (deputados.length === 0) {
      return { status: "erro", total: 0, upsertados: 0, desativados: 0, erro: "lista vazia da API" };
    }

    const nowIso = new Date().toISOString();
    const rows = deputados.map((d) => ({
      id_almg: d.id_almg,
      nome: d.nome,
      partido: d.partido,
      tag_localizacao: d.tag_localizacao,
      ativo: true,
      legislatura,
      updated_at: nowIso,
    }));

    const { error: upErr } = await supabase
      .from("almg_deputados")
      .upsert(rows, { onConflict: "id_almg" });
    if (upErr) {
      return { status: "erro", total: rows.length, upsertados: 0, desativados: 0, erro: upErr.message };
    }

    // Desativa deputados da legislatura atual que sumiram da lista.
    // Implementação: busca todos os ativos e desativa os que não estão no set.
    const idsAtivos = new Set(rows.map((r) => r.id_almg));
    const { data: existentes, error: selErr } = await supabase
      .from("almg_deputados")
      .select("id_almg")
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
      .map((r) => r.id_almg as number)
      .filter((id) => !idsAtivos.has(id));

    let desativados = 0;
    if (aDesativar.length > 0) {
      const { error: deErr } = await supabase
        .from("almg_deputados")
        .update({ ativo: false, updated_at: nowIso })
        .in("id_almg", aDesativar);
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
