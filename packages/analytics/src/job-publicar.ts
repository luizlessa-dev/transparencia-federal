import type { SupabaseClient } from "@supabase/supabase-js";

interface ResultadoPublicacao {
  build_id: string;
  total_publicados: number;
  duracao_ms: number;
}

async function buscarUltimoBuild(sb: SupabaseClient): Promise<string> {
  const { data, error } = await sb
    .from("ranking_parlamentar_build")
    .select("build_id")
    .order("build_id", { ascending: false })
    .limit(1)
    .single();
  if (error) throw new Error(`Erro ao buscar último build: ${error.message}`);
  return data.build_id;
}

async function contarRows(sb: SupabaseClient, buildId: string): Promise<number> {
  const { count, error } = await sb
    .from("ranking_parlamentar_build")
    .select("*", { count: "exact", head: true })
    .eq("build_id", buildId);
  if (error) throw new Error(`Erro ao contar rows: ${error.message}`);
  return count ?? 0;
}

async function publicarBuild(sb: SupabaseClient, buildId: string): Promise<number> {
  // Truncate via delete (Supabase JS não expõe TRUNCATE diretamente)
  const { error: delErr } = await sb
    .from("ranking_parlamentar")
    .delete()
    .gte("posicao", 0); // condição sempre verdadeira para apagar tudo
  if (delErr) throw new Error(`Erro ao limpar ranking_parlamentar: ${delErr.message}`);

  // Busca todas as rows do build em lotes
  const LOTE = 500;
  let offset = 0;
  let totalInseridos = 0;

  while (true) {
    const { data, error } = await sb
      .from("ranking_parlamentar_build")
      .select("parlamentar_id, ano, posicao, valor_total, metricas")
      .eq("build_id", buildId)
      .range(offset, offset + LOTE - 1);

    if (error) throw new Error(`Erro ao ler build ${buildId}: ${error.message}`);
    if (!data || data.length === 0) break;

    const rows = data.map((r) => ({
      parlamentar_id: r.parlamentar_id,
      ano: r.ano,
      posicao: r.posicao,
      valor_total: r.valor_total,
      metricas: r.metricas,
      atualizado_em: new Date().toISOString(),
    }));

    const { error: insErr } = await sb.from("ranking_parlamentar").insert(rows);
    if (insErr) throw new Error(`Erro ao inserir lote: ${insErr.message}`);

    totalInseridos += rows.length;
    if (data.length < LOTE) break;
    offset += LOTE;
  }

  return totalInseridos;
}

export async function jobPublicar(
  sb: SupabaseClient,
  buildId?: string
): Promise<ResultadoPublicacao> {
  const inicio = Date.now();
  const bid = buildId ?? (await buscarUltimoBuild(sb));

  console.log(`  Build alvo: ${bid}`);
  const total = await contarRows(sb, bid);
  console.log(`  Rows no build: ${total}`);

  const totalPublicados = await publicarBuild(sb, bid);

  return {
    build_id: bid,
    total_publicados: totalPublicados,
    duracao_ms: Date.now() - inicio,
  };
}
