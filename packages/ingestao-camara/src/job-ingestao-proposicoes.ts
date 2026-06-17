/**
 * job_ingestao_proposicoes
 * Para cada deputado em plen_deputado_agg, busca todas as suas proposições
 * e upserta em cam_proposicoes. Depois computa cam_proposicoes_agg em memória.
 *
 * Estratégia DEPUTADO-FIRST com resume:
 *  - Verifica quais deputado_ids já têm dados em cam_proposicoes
 *  - Pula os já processados (a menos que --forcar)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { CamaraClient } from "./camara-client.js";
import { createSupabaseClient, inserirExecucao, atualizarExecucao } from "./db.js";

const JOB_NOME  = "job_ingestao_proposicoes";
const DELAY_MS  = 400;   // ms entre chamadas (evitar rate limit)
const LOTE_SIZE = 200;   // proposições por upsert

// Tipos não-substantivos (excluídos do total_substantivo)
const TIPOS_PROCEDURAIS = new Set(["REQ", "DOC", "PROC", "ESB", "EMC", "RCP"]);

export interface JobIngestaoProposicoesConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  forcarReprocessamento?: boolean;
}

export interface ResultadoJobProposicoes {
  execucao_id: string;
  status: "sucesso" | "erro";
  deputados_processados: number;
  total_proposicoes: number;
  duracao_ms: number;
  erro?: string;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function jobIngestaoProposicoes(
  cfg: JobIngestaoProposicoesConfig
): Promise<ResultadoJobProposicoes> {
  const sb = createSupabaseClient(cfg.supabaseUrl, cfg.supabaseServiceRoleKey);
  const camara = new CamaraClient();
  const t0 = Date.now();

  const execucao_id = await inserirExecucao(sb, { job_nome: JOB_NOME, status: "em_andamento" });

  try {
    // 1. Busca todos os deputados
    const { data: deputados, error: errDep } = await sb
      .from("plen_deputado_agg")
      .select("deputado_id, nome, sigla_partido, sigla_uf, url_foto")
      .eq("id_legislatura", 57)
      .order("nome");

    if (errDep || !deputados) throw new Error(`Erro ao carregar deputados: ${errDep?.message}`);
    console.log(`  ${deputados.length} deputados encontrados`);

    // 2. Quais já foram processados?
    let jaProcessados = new Set<number>();
    if (!cfg.forcarReprocessamento) {
      const { data: jaFeito } = await sb
        .from("cam_proposicoes")
        .select("deputado_id")
        .limit(10000);
      if (jaFeito) jaProcessados = new Set(jaFeito.map((r: { deputado_id: number }) => r.deputado_id));
      console.log(`  ${jaProcessados.size} deputados já processados — pulando`);
    }

    let deputados_processados = 0;
    let total_proposicoes = 0;

    // 3. Para cada deputado novo, busca e upserta
    for (const dep of deputados as Array<{ deputado_id: number; nome: string; sigla_partido: string; sigla_uf: string; url_foto: string }>) {
      if (jaProcessados.has(dep.deputado_id)) continue;

      try {
        const props = await camara.buscarProposicoesDeputado(dep.deputado_id);
        await sleep(DELAY_MS);

        if (props.length === 0) {
          // Marca como processado mesmo sem proposições (insere sentinela)
          deputados_processados++;
          continue;
        }

        // Deduplica por id (API retorna mesmo id quando deputado é coautor)
        const deduped = Array.from(
          new Map(props.map((p) => [p.id, p])).values()
        );

        // Upsert em lotes
        for (let i = 0; i < deduped.length; i += LOTE_SIZE) {
          const lote = deduped.slice(i, i + LOTE_SIZE).map((p) => ({
            id:                p.id,
            deputado_id:       dep.deputado_id,
            sigla_tipo:        p.siglaTipo ?? "?",
            numero:            p.numero ?? null,
            ano:               p.ano ?? null,
            ementa:            p.ementa ?? null,
            data_apresentacao: p.dataApresentacao ?? null,
            atualizado_em:     new Date().toISOString(),
          }));
          const { error } = await sb
            .from("cam_proposicoes")
            .upsert(lote, { onConflict: "id" });
          if (error) console.error(`    upsert erro (dep ${dep.deputado_id}): ${error.message}`);
        }

        total_proposicoes += deduped.length;
        deputados_processados++;

        if (deputados_processados % 50 === 0) {
          console.log(`    ${deputados_processados}/${deputados.length} deputados — ${total_proposicoes} proposições`);
        }
      } catch (e) {
        console.error(`    ERRO dep ${dep.deputado_id} (${dep.nome}): ${e instanceof Error ? e.message : e}`);
        await sleep(1000);
      }
    }

    // 4. Computa agregado
    console.log("\n  Computando cam_proposicoes_agg...");
    await computarAggregate(sb, deputados as Array<{ deputado_id: number; nome: string; sigla_partido: string; sigla_uf: string; url_foto: string }>);

    const duracao_ms = Date.now() - t0;
    await atualizarExecucao(sb, execucao_id, {
      finalizado_em: new Date().toISOString(),
      status: "sucesso",
      detalhes: { deputados_processados, total_proposicoes, duracao_ms },
    });

    return { execucao_id, status: "sucesso", deputados_processados, total_proposicoes, duracao_ms };

  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    await atualizarExecucao(sb, execucao_id, {
      finalizado_em: new Date().toISOString(),
      status: "erro",
      detalhes: { erro },
    });
    return { execucao_id, status: "erro", deputados_processados: 0, total_proposicoes: 0, duracao_ms: Date.now() - t0, erro };
  }
}

export async function computarAggregate(
  sb: SupabaseClient,
  deputados: Array<{ deputado_id: number; nome: string; sigla_partido: string; sigla_uf: string; url_foto: string }>
) {
  // Lê TODAS as proposições paginado (PostgREST limita a 1000 por query).
  const PAGE = 1000;
  const todas: Array<{ deputado_id: number; sigla_tipo: string; ano: number | null }> = [];
  let fromIdx = 0;
  while (true) {
    const { data, error } = await sb
      .from("cam_proposicoes")
      .select("deputado_id, sigla_tipo, ano")
      .order("id", { ascending: true })
      .range(fromIdx, fromIdx + PAGE - 1);
    if (error) {
      console.error("Erro ao ler cam_proposicoes para aggregate:", error.message);
      return;
    }
    const rows = (data ?? []) as Array<{ deputado_id: number; sigla_tipo: string; ano: number | null }>;
    todas.push(...rows);
    if (rows.length < PAGE) break;
    fromIdx += PAGE;
  }

  // Agrupa por deputado
  const porDep = new Map<number, {
    por_tipo: Record<string, number>;
    por_ano:  Record<string, number>;
  }>();

  for (const row of todas as Array<{ deputado_id: number; sigla_tipo: string; ano: number | null }>) {
    if (!porDep.has(row.deputado_id)) porDep.set(row.deputado_id, { por_tipo: {}, por_ano: {} });
    const agg = porDep.get(row.deputado_id)!;
    agg.por_tipo[row.sigla_tipo] = (agg.por_tipo[row.sigla_tipo] ?? 0) + 1;
    if (row.ano) agg.por_ano[String(row.ano)] = (agg.por_ano[String(row.ano)] ?? 0) + 1;
  }

  // Monta linhas do agg
  const depMap = new Map(deputados.map((d) => [d.deputado_id, d]));
  const rows = Array.from(porDep.entries()).map(([deputado_id, agg]) => {
    const dep = depMap.get(deputado_id);
    const total = Object.values(agg.por_tipo).reduce((s, n) => s + n, 0);
    const total_substantivo = Object.entries(agg.por_tipo)
      .filter(([tipo]) => !TIPOS_PROCEDURAIS.has(tipo))
      .reduce((s, [, n]) => s + n, 0);

    return {
      deputado_id,
      nome:             dep?.nome ?? "",
      sigla_partido:    dep?.sigla_partido ?? "",
      sigla_uf:         dep?.sigla_uf ?? "",
      url_foto:         dep?.url_foto ?? "",
      total,
      total_substantivo,
      total_pl:         agg.por_tipo["PL"] ?? 0,
      total_pec:        agg.por_tipo["PEC"] ?? 0,
      total_req:        agg.por_tipo["REQ"] ?? 0,
      por_tipo:         agg.por_tipo,
      por_ano:          agg.por_ano,
      atualizado_em:    new Date().toISOString(),
    };
  });

  // Upsert em lotes de 100
  const LOTE = 100;
  for (let i = 0; i < rows.length; i += LOTE) {
    const { error: ue } = await sb
      .from("cam_proposicoes_agg")
      .upsert(rows.slice(i, i + LOTE), { onConflict: "deputado_id" });
    if (ue) console.error("Erro upsert cam_proposicoes_agg:", ue.message);
  }
  console.log(`  cam_proposicoes_agg: ${rows.length} deputados`);
}
