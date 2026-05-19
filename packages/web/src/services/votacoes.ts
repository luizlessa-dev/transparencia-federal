import { getSupabase } from "../lib/supabase-server";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PlenVotacao {
  id: string;
  data: string;
  data_hora_registro: string | null;
  proposicao_autora: string | null;
  descricao: string | null;
  aprovacao: number | null; // 1=aprovada, 0=rejeitada, null=sem resultado
  votos_sim: number;
  votos_nao: number;
  votos_abstencao: number;
  votos_obstrucao: number;
  votos_artigo17: number;
  id_legislatura: number;
}

export interface PlenVoto {
  deputado_id: number;
  nome: string | null;
  sigla_partido: string | null;
  sigla_uf: string | null;
  url_foto: string | null;
  tipo_voto: string;
}

export interface PlenOrientacao {
  sigla_bancada: string;
  nome_bancada: string | null;
  orientacao: string;
}

export interface DeputadoVotacaoAgg {
  deputado_id: number;
  id_legislatura: number;
  nome: string | null;
  sigla_partido: string | null;
  sigla_uf: string | null;
  url_foto: string | null;
  total_votacoes: number;
  presencas: number;
  ausencias: number;
  votos_sim: number;
  votos_nao: number;
  votos_abstencao: number;
  votos_obstrucao: number;
  votos_artigo17: number;
  pct_presenca: number | null;
  concordancia_partido: number | null;
  posicao: number | null;
  posicao_partido: number | null;
  por_tipo_voto: Record<string, number>;
}

export interface VotacoesStats {
  total_votacoes: number;
  aprovadas: number;
  rejeitadas: number;
  sem_resultado: number;
  media_presenca: number | null;
  data_mais_recente: string | null;
}

export interface VotacaoComDisciplina extends PlenVotacao {
  /** Mapa partido → { orientacao, seguiram, divergiram, total_votantes } */
  disciplina: Record<string, {
    orientacao: string;
    seguiram: number;
    divergiram: number;
    total_votantes: number;
    pct_disciplina: number;
  }>;
}

// ─── Funções de consulta ──────────────────────────────────────────────────────

/** Lista paginada de votações, mais recentes primeiro */
export async function getVotacoesListing(
  page = 1,
  perPage = 30,
  opts: { ano?: number; aprovacao?: number | null } = {}
): Promise<{ rows: PlenVotacao[]; total: number }> {
  const sb = getSupabase();
  const from = (page - 1) * perPage;
  const to   = from + perPage - 1;

  let q = sb
    .from("plen_votacoes")
    .select("*", { count: "exact" })
    .order("data_hora_registro", { ascending: false })
    .range(from, to);

  if (opts.ano) {
    q = q
      .gte("data", `${opts.ano}-01-01`)
      .lte("data", `${opts.ano}-12-31`);
  }
  if (opts.aprovacao !== undefined && opts.aprovacao !== null) {
    q = q.eq("aprovacao", opts.aprovacao);
  }

  const { data, count, error } = await q;
  if (error) throw new Error(`getVotacoesListing: ${error.message}`);
  return { rows: (data ?? []) as PlenVotacao[], total: count ?? 0 };
}

/** Detalhes de uma votação específica */
export async function getVotacao(id: string): Promise<PlenVotacao | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("plen_votacoes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as PlenVotacao;
}

/** Todos os votos de uma votação (para montar tabela + disciplina) */
export async function getVotosDeVotacao(votacaoId: string): Promise<PlenVoto[]> {
  const sb = getSupabase();
  const PAGE = 1000;
  const todos: PlenVoto[] = [];
  let pagina = 0;

  while (true) {
    const { data, error } = await sb
      .from("plen_votos")
      .select("deputado_id,nome,sigla_partido,sigla_uf,url_foto,tipo_voto")
      .eq("votacao_id", votacaoId)
      .range(pagina * PAGE, (pagina + 1) * PAGE - 1)
      .order("nome");
    if (error) throw new Error(`getVotosDeVotacao: ${error.message}`);
    todos.push(...((data ?? []) as PlenVoto[]));
    if (!data || data.length < PAGE) break;
    pagina++;
  }

  return todos;
}

/** Orientações de partidos para uma votação */
export async function getOrientacoesDeVotacao(votacaoId: string): Promise<PlenOrientacao[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("plen_orientacoes")
    .select("sigla_bancada,nome_bancada,orientacao")
    .eq("votacao_id", votacaoId)
    .order("sigla_bancada");
  if (error) return [];
  return (data ?? []) as PlenOrientacao[];
}

/** Stats gerais para o painel principal */
export async function getVotacoesStats(): Promise<VotacoesStats> {
  const sb = getSupabase();

  const [{ count: total }, { count: aprovadas }, { count: rejeitadas }, { count: semRes }, presInfo, recente] =
    await Promise.all([
      sb.from("plen_votacoes").select("*", { count: "exact", head: true }),
      sb.from("plen_votacoes").select("*", { count: "exact", head: true }).eq("aprovacao", 1),
      sb.from("plen_votacoes").select("*", { count: "exact", head: true }).eq("aprovacao", 0),
      sb.from("plen_votacoes").select("*", { count: "exact", head: true }).is("aprovacao", null),
      sb.from("plen_deputado_agg").select("pct_presenca").eq("id_legislatura", 57),
      sb.from("plen_votacoes").select("data").order("data_hora_registro", { ascending: false }).limit(1),
    ]);

  const presencas = (presInfo.data ?? []) as { pct_presenca: number | null }[];
  const validos   = presencas.filter((r) => r.pct_presenca !== null);
  const media_presenca =
    validos.length > 0
      ? validos.reduce((s, r) => s + Number(r.pct_presenca), 0) / validos.length
      : null;

  return {
    total_votacoes:    total   ?? 0,
    aprovadas:         aprovadas ?? 0,
    rejeitadas:        rejeitadas ?? 0,
    sem_resultado:     semRes  ?? 0,
    media_presenca:    media_presenca !== null ? Math.round(media_presenca * 100) / 100 : null,
    data_mais_recente: (recente.data?.[0] as { data: string } | undefined)?.data ?? null,
  };
}

/** Ranking de deputados por presença */
export async function getDeputadosVotacaoListing(
  page = 1,
  perPage = 50,
  opts: { partido?: string; uf?: string } = {}
): Promise<{ rows: DeputadoVotacaoAgg[]; total: number }> {
  const sb = getSupabase();
  const from = (page - 1) * perPage;
  const to   = from + perPage - 1;

  let q = sb
    .from("plen_deputado_agg")
    .select("*", { count: "exact" })
    .eq("id_legislatura", 57)
    .order("posicao", { ascending: true })
    .range(from, to);

  if (opts.partido) q = q.eq("sigla_partido", opts.partido);
  if (opts.uf)      q = q.eq("sigla_uf", opts.uf);

  const { data, count, error } = await q;
  if (error) throw new Error(`getDeputadosVotacaoListing: ${error.message}`);
  return { rows: (data ?? []) as DeputadoVotacaoAgg[], total: count ?? 0 };
}

/** Perfil de votação de um deputado */
export async function getDeputadoVotacaoAgg(
  deputadoId: number
): Promise<DeputadoVotacaoAgg | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("plen_deputado_agg")
    .select("*")
    .eq("deputado_id", deputadoId)
    .eq("id_legislatura", 57)
    .single();
  if (error) return null;
  return data as DeputadoVotacaoAgg;
}

/** Últimas N votações de um deputado (com resultado e orientação do partido) */
export async function getUltimasVotacoesDeDeputado(
  deputadoId: number,
  limite = 30
): Promise<Array<{
  votacao_id: string;
  data: string;
  descricao: string | null;
  proposicao_autora: string | null;
  tipo_voto: string;
  aprovacao: number | null;
  orientacao_partido: string | null;
  concordou: boolean | null;
}>> {
  const sb = getSupabase();

  // 1. Últimas votações do deputado
  const { data: votos, error } = await sb
    .from("plen_votos")
    .select("votacao_id, tipo_voto, sigla_partido")
    .eq("deputado_id", deputadoId)
    .order("data_registro_voto", { ascending: false })
    .limit(limite);

  if (error || !votos || votos.length === 0) return [];

  const ids = votos.map((v) => (v as { votacao_id: string }).votacao_id);

  // 2. Metadados das votações
  const { data: votacoesInfo } = await sb
    .from("plen_votacoes")
    .select("id,data,descricao,proposicao_autora,aprovacao")
    .in("id", ids);

  const votacoesMap = new Map(
    (votacoesInfo ?? []).map((v) => [
      (v as { id: string }).id,
      v as { id: string; data: string; descricao: string | null; proposicao_autora: string | null; aprovacao: number | null },
    ])
  );

  // 3. Orientações do partido para essas votações
  const siglaPartido = (votos[0] as { sigla_partido: string | null }).sigla_partido;
  let orientacoesMap = new Map<string, string>();
  if (siglaPartido) {
    const { data: ors } = await sb
      .from("plen_orientacoes")
      .select("votacao_id,orientacao")
      .in("votacao_id", ids)
      .eq("sigla_bancada", siglaPartido);
    for (const o of ors ?? []) {
      orientacoesMap.set(
        (o as { votacao_id: string }).votacao_id,
        (o as { orientacao: string }).orientacao
      );
    }
  }

  return (votos as Array<{ votacao_id: string; tipo_voto: string; sigla_partido: string | null }>).map((v) => {
    const meta    = votacoesMap.get(v.votacao_id);
    const orient  = orientacoesMap.get(v.votacao_id) ?? null;
    const concordou =
      orient && orient !== "Liberado" && orient !== "Art. 17"
        ? v.tipo_voto === orient
        : null;
    return {
      votacao_id:         v.votacao_id,
      data:               meta?.data ?? "",
      descricao:          meta?.descricao ?? null,
      proposicao_autora:  meta?.proposicao_autora ?? null,
      tipo_voto:          v.tipo_voto,
      aprovacao:          meta?.aprovacao ?? null,
      orientacao_partido: orient,
      concordou,
    };
  });
}

/** Lista de partidos disponíveis (para filtro) */
export async function getPartidosDisponíveis(): Promise<string[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("plen_deputado_agg")
    .select("sigla_partido")
    .eq("id_legislatura", 57)
    .not("sigla_partido", "is", null)
    .order("sigla_partido");
  const set = new Set((data ?? []).map((r) => (r as { sigla_partido: string }).sigla_partido));
  return Array.from(set).sort();
}
