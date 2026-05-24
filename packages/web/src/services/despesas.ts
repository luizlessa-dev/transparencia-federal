import { getSupabase } from "../lib/supabase-server";

export interface DespesaRankingEntry {
  posicao: number;
  total_liquido: number;
  total_documentos: number;
  por_categoria: Record<string, number>;
  ano: number;
  deputados_brutas: {
    nome: string;
    sigla_partido: string | null;
    sigla_uf: string | null;
  };
  deputado_id_externo: string;
}

export interface DespesaDeputadoDetalhe {
  deputado_id_externo: string;
  nome: string;
  sigla_partido: string | null;
  sigla_uf: string | null;
  historico: {
    ano: number;
    posicao: number;
    total_liquido: number;
    total_documentos: number;
    por_categoria: Record<string, number>;
  }[];
}

const ANOS_VALIDOS = [2023, 2024, 2025, 2026];

export async function getDespesasRanking(
  ano: number,
  page: number,
  perPage = 50,
  filters?: { search?: string; partido?: string; uf?: string }
): Promise<{ data: DespesaRankingEntry[]; total: number }> {
  if (!ANOS_VALIDOS.includes(ano)) return { data: [], total: 0 };

  const sb = getSupabase();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = sb
    .from("ceaps_ranking")
    .select(
      `posicao, total_liquido, total_documentos, por_categoria, ano, deputado_id_externo,
       deputados_brutas!inner(nome, sigla_partido, sigla_uf)`,
      { count: "exact" }
    )
    .eq("ano", ano);

  // Filtros aplicados na tabela joined (PostgREST sintaxe)
  if (filters?.partido) {
    query = query.eq("deputados_brutas.sigla_partido", filters.partido);
  }
  if (filters?.uf) {
    query = query.eq("deputados_brutas.sigla_uf", filters.uf);
  }
  if (filters?.search) {
    query = query.ilike("deputados_brutas.nome", `%${filters.search}%`);
  }

  const { data, error, count } = await query
    .order("posicao")
    .range(from, to);

  if (error) throw error;
  return { data: (data ?? []) as unknown as DespesaRankingEntry[], total: count ?? 0 };
}

/**
 * Lista distinct de partidos e UFs presentes no ranking do ano.
 * Usado pra montar chips de filtro na página /expenses.
 */
export async function getDespesasFiltrosDisponiveis(
  ano: number
): Promise<{ partidos: string[]; ufs: string[] }> {
  if (!ANOS_VALIDOS.includes(ano)) return { partidos: [], ufs: [] };

  const sb = getSupabase();
  const { data } = await sb
    .from("ceaps_ranking")
    .select("deputados_brutas!inner(sigla_partido, sigla_uf)")
    .eq("ano", ano)
    .limit(1000);

  const partidos = new Set<string>();
  const ufs = new Set<string>();
  // Supabase devolve `deputados_brutas` como array quando usa join via
  // `select("deputados_brutas!inner(...)")` — mesmo em relações 1:1 que
  // visualmente parecem retornar objeto. Normalizamos via Array.isArray
  // pra suportar ambos os formatos (defensivo contra mudanças do supabase-js).
  type DepRow = { sigla_partido: string | null; sigla_uf: string | null };
  for (const r of (data ?? []) as unknown as Array<{ deputados_brutas: DepRow | DepRow[] | null }>) {
    const dep = Array.isArray(r.deputados_brutas) ? r.deputados_brutas[0] : r.deputados_brutas;
    if (dep?.sigla_partido) partidos.add(dep.sigla_partido);
    if (dep?.sigla_uf) ufs.add(dep.sigla_uf);
  }
  return {
    partidos: Array.from(partidos).sort(),
    ufs: Array.from(ufs).sort(),
  };
}

export interface CeapNota {
  id: string;
  parlamentar_uid: string | null;
  deputado_id: string;
  ano: number;
  mes: number;
  tipo_despesa: string;
  valor: number;
  valor_liquido: number;
  valor_glosa: number;
  fornecedor: string | null;
  cnpj_cpf: string | null;
  url_documento: string | null;
  num_documento: string | null;
  data_documento: string | null;
}

/**
 * Lista todas as notas fiscais (CEAP) de um deputado, paginando internamente
 * para passar do limite de 1000 do Supabase. Usado pra agregações no detalhe.
 *
 * Fonte: `ceaps_brutas` (atualizada até 2026, ~570k linhas). A tabela legada
 * `despesas_gabinete_raw` foi abandonada em 2025 — não tem dados de 2026.
 */
export async function getCeapNotas(
  deputadoId: string,
  limit = 3000
): Promise<CeapNota[]> {
  const sb = getSupabase();
  const PAGE = 1000;
  const out: CeapNota[] = [];

  type CeapsBrutasRow = {
    id: string;
    deputado_id_externo: string;
    ano: number;
    tipo_despesa: string | null;
    valor_documento: number | null;
    valor_liquido: number | null;
    valor_glosa: number | null;
    nome_fornecedor: string | null;
    cnpj_cpf_fornecedor: string | null;
    url_documento: string | null;
    cod_documento: string | null;
    data_documento: string | null;
  };

  for (let offset = 0; offset < limit; offset += PAGE) {
    const to = Math.min(offset + PAGE - 1, limit - 1);
    const { data, error } = await sb
      .from("ceaps_brutas")
      .select(
        "id, deputado_id_externo, ano, tipo_despesa, valor_documento, valor_liquido, valor_glosa, nome_fornecedor, cnpj_cpf_fornecedor, url_documento, cod_documento, data_documento"
      )
      .eq("deputado_id_externo", deputadoId)
      .order("data_documento", { ascending: false, nullsFirst: false })
      .order("valor_liquido", { ascending: false })
      .range(offset, to);
    if (error) throw error;

    const rows = (data ?? []) as CeapsBrutasRow[];

    // Mapeia colunas de ceaps_brutas pra interface CeapNota.
    // Mês extraído da data_documento (ceaps_brutas não tem coluna mes).
    for (const r of rows) {
      const mes = r.data_documento
        ? parseInt(r.data_documento.slice(5, 7), 10) || 0
        : 0;
      out.push({
        id: r.id,
        parlamentar_uid: null,
        deputado_id: r.deputado_id_externo,
        ano: r.ano,
        mes,
        tipo_despesa: r.tipo_despesa ?? "",
        valor: Number(r.valor_documento) || 0,
        valor_liquido: Number(r.valor_liquido) || 0,
        valor_glosa: Number(r.valor_glosa) || 0,
        fornecedor: r.nome_fornecedor,
        cnpj_cpf: r.cnpj_cpf_fornecedor,
        url_documento: r.url_documento,
        num_documento: r.cod_documento,
        data_documento: r.data_documento,
      });
    }

    if (rows.length < PAGE) break;
  }
  return out;
}

export async function getDespesaDeputado(
  id: string
): Promise<DespesaDeputadoDetalhe | null> {
  const sb = getSupabase();

  const [{ data: dep, error: e1 }, { data: hist, error: e2 }] = await Promise.all([
    sb
      .from("deputados_brutas")
      .select("id_externo, nome, sigla_partido, sigla_uf")
      .eq("id_externo", id)
      .single(),
    sb
      .from("ceaps_ranking")
      .select("ano, posicao, total_liquido, total_documentos, por_categoria")
      .eq("deputado_id_externo", id)
      .order("ano", { ascending: false }),
  ]);

  if (e1?.code === "PGRST116") return null;
  if (e1) throw e1;
  if (e2) throw e2;
  if (!dep) return null;

  return {
    deputado_id_externo: dep.id_externo,
    nome: dep.nome,
    sigla_partido: dep.sigla_partido,
    sigla_uf: dep.sigla_uf,
    historico: (hist ?? []) as DespesaDeputadoDetalhe["historico"],
  };
}
