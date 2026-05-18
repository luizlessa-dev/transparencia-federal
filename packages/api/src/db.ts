import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function criarCliente(url: string, key: string): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getRanking(
  sb: SupabaseClient,
  ano: number,
  page: number,
  perPage: number
) {
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await sb
    .from("ranking_parlamentar")
    .select(
      `posicao, valor_total, metricas, ano,
       parlamentares!inner(id, nome, nome_parlamentar, partido, uf, foto_url, casa_legislativa)`,
      { count: "exact" }
    )
    .eq("ano", ano)
    .order("posicao")
    .range(from, to);

  if (error) throw error;
  return { data, total: count ?? 0 };
}

export async function getParlamentar(sb: SupabaseClient, id: string) {
  const [{ data: parl, error: e1 }, { data: hist, error: e2 }] =
    await Promise.all([
      sb
        .from("parlamentares")
        .select("id, nome, nome_parlamentar, partido, uf, foto_url, casa_legislativa, ativo")
        .eq("id", id)
        .single(),
      sb
        .from("ranking_parlamentar")
        .select("ano, posicao, valor_total, metricas")
        .eq("parlamentar_id", id)
        .order("ano", { ascending: false }),
    ]);

  if (e1) throw e1;
  if (e2) throw e2;
  return { parlamentar: parl, historico: hist };
}

export async function getCobertura(sb: SupabaseClient) {
  const [{ count: totalFin }, { count: totalParl }, { count: matchados }] =
    await Promise.all([
      sb.from("emendas_financeiro").select("*", { count: "exact", head: true }),
      sb.from("parlamentares").select("*", { count: "exact", head: true }),
      sb
        .from("emendas_financeiro")
        .select("*", { count: "exact", head: true })
        .not("parlamentar_id", "is", null),
    ]);

  return {
    total_registros_financeiro: totalFin ?? 0,
    total_parlamentares: totalParl ?? 0,
    registros_vinculados: matchados ?? 0,
    taxa_cobertura:
      totalFin && totalFin > 0
        ? Math.round(((matchados ?? 0) / totalFin) * 100)
        : 0,
  };
}
