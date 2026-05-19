/**
 * job_ingestao_votacoes
 * Coleta votações do plenário da Câmara dos Deputados (57ª legislatura).
 *
 * Estratégia VOTAÇÃO-FIRST:
 *  1. Busca lista de votações de /votacoes?siglaOrgao=PLEN&idLegislatura=57
 *  2. Para cada votação nova (não está no DB ou é para reprocessar):
 *     a. Busca votos individuais em /votacoes/{id}/votos
 *     b. Busca orientações em /votacoes/{id}/orientacoes
 *  3. Upsert votacoes → votos_parlamentar → votacoes_orientacoes
 *
 * Por que votação-first?
 *  - 1 votação → ~500 votos → ~3 páginas de API por votação
 *  - Deputy-first → 513 deputados × N páginas cada = 10x mais chamadas
 *  - Votação-first é resumível: verifica votos já existentes antes de re-fetch
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CamaraClient,
  type VotacaoResumo,
  type VotoIndividual,
  type OrientacaoBancada,
} from "./camara-client.js";
import {
  createSupabaseClient,
  inserirExecucao,
  atualizarExecucao,
  inserirEtapa,
  atualizarEtapa,
} from "./db.js";

// ─── Configuração ─────────────────────────────────────────────────────────────
const JOB_NOME      = "job_ingestao_votacoes";
const ETAPA_NOME    = "ingestao_votacoes";
const LEGISLATURA   = 57;
const DELAY_MS      = 300;   // ms entre chamadas de API (evitar rate limit)
const LOTE_VOTOS    = 200;   // linhas por upsert no Supabase

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface JobIngestaoVotacoesConfig {
  supabaseUrl:             string;
  supabaseServiceRoleKey:  string;
  /** Se true, refaz votos mesmo de votações já existentes (default: false) */
  forcarReprocessamento?:  boolean;
  /** Só busca votações a partir desta data (YYYY-MM-DD) */
  dataInicio?:             string;
}

export interface ResultadoJobVotacoes {
  execucao_id:          string;
  status:               "sucesso" | "erro";
  total_votacoes:       number;
  votacoes_novas:       number;
  total_votos:          number;
  total_orientacoes:    number;
  duracao_ms:           number;
  erro?:                string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function contarPorTipo(votos: VotoIndividual[]): {
  sim: number; nao: number; abstencao: number; obstrucao: number; artigo17: number;
} {
  const c = { sim: 0, nao: 0, abstencao: 0, obstrucao: 0, artigo17: 0 };
  for (const v of votos) {
    switch (v.tipoVoto) {
      case "Sim":       c.sim++;       break;
      case "Não":       c.nao++;       break;
      case "Abstenção": c.abstencao++; break;
      case "Obstrução": c.obstrucao++; break;
      case "Art. 17":   c.artigo17++;  break;
    }
  }
  return c;
}

// ─── Upserts ─────────────────────────────────────────────────────────────────
async function upsertVotacao(
  sb: SupabaseClient,
  v: VotacaoResumo,
  contagem: ReturnType<typeof contarPorTipo>
): Promise<void> {
  const { error } = await sb.from("plen_votacoes").upsert(
    {
      id:                 v.id,
      uri:                v.uri,
      data:               v.data,
      data_hora_registro: v.dataHoraRegistro || null,
      sigla_orgao:        v.siglaOrgao,
      uri_evento:         v.uriEvento || null,
      proposicao_autora:  v.proposicaoObjeto || null,
      uri_proposicao:     v.uriProposicaoObjeto || null,
      descricao:          v.descricao || null,
      aprovacao:          v.aprovacao ?? null,
      votos_sim:          contagem.sim,
      votos_nao:          contagem.nao,
      votos_abstencao:    contagem.abstencao,
      votos_obstrucao:    contagem.obstrucao,
      votos_artigo17:     contagem.artigo17,
      id_legislatura:     LEGISLATURA,
      atualizado_em:      new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) throw new Error(`upsert votacoes ${v.id}: ${error.message}`);
}

async function upsertVotos(
  sb: SupabaseClient,
  votacaoId: string,
  votos: VotoIndividual[]
): Promise<void> {
  // Deduplica por (votacao_id, deputado_id) — mesmo deputado pode aparecer 2x
  const mapa = new Map<string, Record<string, unknown>>();
  for (const v of votos) {
    const dep = v.deputado_;
    const chave = `${votacaoId}|${dep.id}`;
    mapa.set(chave, {
      votacao_id:          votacaoId,
      deputado_id:         dep.id,
      nome:                dep.nome,
      sigla_partido:       dep.siglaPartido || null,
      sigla_uf:            dep.siglaUf || null,
      id_legislatura:      dep.idLegislatura || LEGISLATURA,
      url_foto:            dep.urlFoto || null,
      data_registro_voto:  v.dataRegistroVoto || null,
      tipo_voto:           v.tipoVoto,
      atualizado_em:       new Date().toISOString(),
    });
  }

  const rows = Array.from(mapa.values());
  for (let i = 0; i < rows.length; i += LOTE_VOTOS) {
    const lote = rows.slice(i, i + LOTE_VOTOS);
    const { error } = await sb
      .from("plen_votos")
      .upsert(lote, { onConflict: "votacao_id,deputado_id" });
    if (error) throw new Error(`upsert votos_parlamentar ${votacaoId}: ${error.message}`);
  }
}

async function upsertOrientacoes(
  sb: SupabaseClient,
  votacaoId: string,
  orientacoes: OrientacaoBancada[]
): Promise<void> {
  if (orientacoes.length === 0) return;

  // Deduplica por (votacao_id, sigla_bancada)
  const mapa = new Map<string, Record<string, unknown>>();
  for (const o of orientacoes) {
    // API real: {orientacaoVoto, siglaPartidoBloco, ...} — sem objeto bancada aninhado
    const sigla = o.siglaPartidoBloco?.trim();
    if (!sigla) continue;
    mapa.set(`${votacaoId}|${sigla}`, {
      votacao_id:    votacaoId,
      sigla_bancada: sigla,
      nome_bancada:  null,           // API não retorna nome por extenso neste endpoint
      orientacao:    o.orientacaoVoto,
    });
  }

  const rows = Array.from(mapa.values());
  if (rows.length === 0) return;

  const { error } = await sb
    .from("plen_orientacoes")
    .upsert(rows, { onConflict: "votacao_id,sigla_bancada" });
  if (error) throw new Error(`upsert votacoes_orientacoes ${votacaoId}: ${error.message}`);
}

// ─── Job principal ────────────────────────────────────────────────────────────
export async function jobIngestaoVotacoes(
  config: JobIngestaoVotacoesConfig
): Promise<ResultadoJobVotacoes> {
  const t0 = Date.now();
  const sb     = createSupabaseClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  const camara = new CamaraClient();

  const execucao_id = await inserirExecucao(sb, {
    job_nome: JOB_NOME,
    status:   "em_andamento",
    detalhes: { legislatura: LEGISLATURA, dataInicio: config.dataInicio },
  });
  const etapa_id = await inserirEtapa(sb, {
    execucao_id,
    etapa_nome: ETAPA_NOME,
    status:     "em_andamento",
    detalhes:   {},
  });

  try {
    // ── 1. Busca lista completa de votações ─────────────────────────────────
    console.log(`  Buscando votações PLEN desde ${config.dataInicio ?? "2023-02-01"} (filtra siglaOrgao=PLEN em código)...`);
    const votacoes = await camara.buscarVotacoesPlenario({
      itens:      100,
      dataInicio: config.dataInicio, // default no cliente: "2023-02-01"
    });
    console.log(`  → ${votacoes.length} votações encontradas na API`);

    if (votacoes.length === 0) {
      throw new Error("Nenhuma votação retornada pela API");
    }

    // ── 2. Descobre quais votações já têm votos no DB (para skip) ───────────
    const idsNaAPI = votacoes.map((v) => v.id);
    let idsJaComVotos = new Set<string>();

    if (!config.forcarReprocessamento) {
      // Busca em lotes de 200 IDs (Supabase .in() tem limite)
      for (let i = 0; i < idsNaAPI.length; i += 200) {
        const loteIds = idsNaAPI.slice(i, i + 200);
        const { data } = await sb
          .from("plen_votos")
          .select("votacao_id")
          .in("votacao_id", loteIds)
          .limit(1000);
        for (const row of data ?? []) {
          idsJaComVotos.add(row.votacao_id as string);
        }
      }
      console.log(`  → ${idsJaComVotos.size} votações já processadas (serão puladas)`);
    }

    // ── 3. Processa cada votação ─────────────────────────────────────────────
    let totalVotos        = 0;
    let totalOrientacoes  = 0;
    let votacoesNovas     = 0;

    for (let idx = 0; idx < votacoes.length; idx++) {
      const v = votacoes[idx];

      if (!config.forcarReprocessamento && idsJaComVotos.has(v.id)) {
        continue;
      }

      try {
        // a. Busca votos individuais
        await delay(DELAY_MS);
        const votos = await camara.buscarVotosDeVotacao(v.id);
        await delay(DELAY_MS);

        // b. Busca orientações
        let orientacoes: OrientacaoBancada[] = [];
        try {
          orientacoes = await camara.buscarOrientacoesDeVotacao(v.id);
        } catch {
          // Orientações são opcionais — algumas votações não têm
        }
        await delay(DELAY_MS);

        // c. Upserts
        const contagem = contarPorTipo(votos);
        await upsertVotacao(sb, v, contagem);
        await upsertVotos(sb, v.id, votos);
        await upsertOrientacoes(sb, v.id, orientacoes);

        totalVotos       += votos.length;
        totalOrientacoes += orientacoes.length;
        votacoesNovas++;

        const pct = ((idx + 1) / votacoes.length * 100).toFixed(1);
        const suf = v.aprovacao === 1 ? "✓APR" : v.aprovacao === 0 ? "✗REJ" : "   ";
        if (votacoesNovas % 10 === 0 || votacoesNovas === 1) {
          console.log(
            `  [${idx + 1}/${votacoes.length}] ${pct}% | ${v.data} ${suf} — ` +
            `${votos.length} votos, ${orientacoes.length} orientações | total: ${totalVotos} votos`
          );
        }
      } catch (err) {
        console.warn(`  ⚠ votação ${v.id} (${v.data}) ignorada: ${(err as Error).message}`);
      }
    }

    const duracao_ms = Date.now() - t0;
    console.log(`\n  ✓ ${votacoesNovas} novas votações | ${totalVotos} votos | ${totalOrientacoes} orientações — ${duracao_ms}ms`);

    await atualizarEtapa(sb, etapa_id, {
      finalizado_em: new Date().toISOString(),
      status:        "sucesso",
      detalhes:      { total_votacoes: votacoes.length, votacoes_novas: votacoesNovas, total_votos: totalVotos },
    });
    await atualizarExecucao(sb, execucao_id, {
      finalizado_em: new Date().toISOString(),
      status:        "sucesso",
      detalhes:      { total_votacoes: votacoes.length, votacoes_novas: votacoesNovas, total_votos: totalVotos },
    });

    return {
      execucao_id,
      status:             "sucesso",
      total_votacoes:     votacoes.length,
      votacoes_novas:     votacoesNovas,
      total_votos:        totalVotos,
      total_orientacoes:  totalOrientacoes,
      duracao_ms,
    };
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    const duracao_ms = Date.now() - t0;
    await atualizarEtapa(sb, etapa_id, {
      finalizado_em: new Date().toISOString(),
      status:        "erro",
      detalhes:      { erro: mensagem },
    });
    await atualizarExecucao(sb, execucao_id, {
      finalizado_em: new Date().toISOString(),
      status:        "erro",
      detalhes:      { erro: mensagem },
    });
    return { execucao_id, status: "erro", total_votacoes: 0, votacoes_novas: 0, total_votos: 0, total_orientacoes: 0, duracao_ms, erro: mensagem };
  }
}
