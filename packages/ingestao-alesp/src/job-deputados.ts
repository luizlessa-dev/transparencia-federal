/**
 * Job: ingere lista de deputados ALESP → public.parlamentares (canônica).
 *
 * - `id_externo` = Matricula (NÃO IdDeputado — Matricula é a chave de junção
 *   com despesas)
 * - `ativo` = (Situacao === 'EXE')
 * - Outros campos (IdDeputado, IdSPL, IdUA, Email, etc) vão pra `metadata`
 *
 * Idempotente via upsert por (casa_id, id_externo).
 */
import { createClient } from "@supabase/supabase-js";
import { fetchDeputadosAlesp } from "./deputados.js";
import type { JobResult } from "./types.js";

export type JobDeputadosAlespOpts = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  /** Default: 'ALESP' */
  siglaCasa?: string;
  /** Legislatura atual (default 19 — 2023-2026) */
  legislatura?: number;
};

export async function jobIngestaoDeputadosAlesp(
  opts: JobDeputadosAlespOpts,
): Promise<JobResult> {
  const inicio = Date.now();
  const sigla = opts.siglaCasa ?? "ALESP";
  const legislatura = opts.legislatura ?? 19;

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

    // 2. Fetch deputados ALESP
    const deputados = await fetchDeputadosAlesp();
    if (deputados.length === 0) {
      return {
        status: "erro",
        total: 0,
        processados: 0,
        upsertados: 0,
        ignorados: 0,
        erro: "lista vazia da API ALESP",
        duracao_ms: Date.now() - inicio,
      };
    }

    // 3. Monta linhas pro upsert
    const nowIso = new Date().toISOString();
    const rows = deputados.map((d) => ({
      casa_id: casaId,
      id_externo: d.matricula,
      nome: d.nome,
      partido: d.partido,
      tag_localizacao: [d.andar, d.sala ? `Sala ${d.sala}` : null]
        .filter(Boolean)
        .join(" / ") || null,
      ativo: d.situacao === "EXE",
      legislatura,
      metadata: {
        id_deputado: d.id_deputado,
        id_spl: d.id_spl,
        id_ua: d.id_ua,
        situacao: d.situacao,
        email: d.email,
        telefone: d.telefone,
        andar: d.andar,
        sala: d.sala,
        placa_veiculo: d.placa_veiculo,
        aniversario: d.aniversario,
        area_atuacao: d.area_atuacao,
        base_eleitoral: d.base_eleitoral,
        biografia: d.biografia,
      },
      updated_at: nowIso,
    }));

    // 4. Upsert por (casa_id, id_externo)
    const { error: upErr } = await supabase
      .from("parlamentares_estaduais")
      .upsert(rows, { onConflict: "casa_id,id_externo" });

    if (upErr) {
      return {
        status: "erro",
        total: rows.length,
        processados: rows.length,
        upsertados: 0,
        ignorados: 0,
        erro: `upsert parlamentares: ${upErr.message}`,
        duracao_ms: Date.now() - inicio,
      };
    }

    // 5. Desativa deputados que sumiram da lista atual (da mesma legislatura/casa)
    const idsAtivos = new Set(rows.filter((r) => r.ativo).map((r) => r.id_externo));
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
        processados: rows.length,
        upsertados: rows.length,
        ignorados: 0,
        erro: `select ativos: ${selErr.message}`,
        duracao_ms: Date.now() - inicio,
      };
    }

    const aDesativar = (existentes ?? [])
      .map((r) => String(r.id_externo))
      .filter((m) => !idsAtivos.has(m));

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
          processados: rows.length,
          upsertados: rows.length,
          ignorados: 0,
          erro: `desativar: ${deErr.message}`,
          duracao_ms: Date.now() - inicio,
        };
      }
    }

    return {
      status: "ok",
      total: deputados.length,
      processados: rows.length,
      upsertados: rows.length,
      ignorados: aDesativar.length,
      duracao_ms: Date.now() - inicio,
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
