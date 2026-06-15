import "server-only";
import { getSupabase } from "~/lib/supabase-server";

export async function getSiafiStats() {
  const { data, error } = await getSupabase().rpc("siafi_stats");
  if (error || !data?.[0]) return { totalCnpjs: 0, totalPagamentos: 0, somaBrl: 0 };
  const row = data[0] as { total_cnpjs: number; total_pagamentos: number; soma_brl: number };
  return {
    totalCnpjs: Number(row.total_cnpjs),
    totalPagamentos: Number(row.total_pagamentos),
    somaBrl: Number(row.soma_brl),
  };
}

export async function getSiafiFornecedores(page = 1, perPage = 50, filtros?: { q?: string }) {
  let query = getSupabase()
    .from("mv_siafi_fornecedores")
    .select(
      "cnpj_favorecido,nome_favorecido,n_pagamentos,valor_total,primeira_aparicao,ultima_aparicao",
      { count: "exact" }
    );

  if (filtros?.q) {
    query = query.or(
      `nome_favorecido.ilike.%${filtros.q}%,cnpj_favorecido.ilike.%${filtros.q}%`
    );
  }

  return query
    .order("valor_total", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);
}
