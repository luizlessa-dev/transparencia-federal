import "server-only";
import { getSupabase } from "~/lib/supabase-server";

export async function getViagensResumo() {
  const { data, error } = await getSupabase()
    .from("viagens")
    .select("valor_total,valor_diarias,valor_passagens")
    .not("valor_total", "is", null);
  if (error) return { total: 0, totalDiarias: 0, totalPassagens: 0, count: 0 };
  const count = data?.length ?? 0;
  const total = data?.reduce((s, r) => s + Number(r.valor_total ?? 0), 0) ?? 0;
  const totalDiarias = data?.reduce((s, r) => s + Number(r.valor_diarias ?? 0), 0) ?? 0;
  const totalPassagens = data?.reduce((s, r) => s + Number(r.valor_passagens ?? 0), 0) ?? 0;
  return { total, totalDiarias, totalPassagens, count };
}

export async function getViagens(
  page = 1,
  perPage = 50,
  filtros?: { q?: string; orgao?: string; ano?: string }
) {
  let query = getSupabase()
    .from("viagens")
    .select(
      "id_portal,nome_beneficiario,cargo,orgao_sigla,orgao_nome,data_inicio,data_fim,motivo,tipo_viagem,situacao,valor_diarias,valor_passagens,valor_total,urgente,ano",
      { count: "exact" }
    );

  if (filtros?.q) {
    query = query.or(
      `nome_beneficiario.ilike.%${filtros.q}%,orgao_nome.ilike.%${filtros.q}%,motivo.ilike.%${filtros.q}%`
    );
  }
  if (filtros?.orgao) query = query.ilike("orgao_sigla", filtros.orgao);
  if (filtros?.ano) query = query.eq("ano", parseInt(filtros.ano));

  return query.order("valor_total", { ascending: false }).range((page - 1) * perPage, page * perPage - 1);
}
