import "server-only";
import { getSupabase } from "~/lib/supabase-server";

// ── ALMG ─────────────────────────────────────────────────────────────────

export async function getAlmgVerbaResumo() {
  return getSupabase()
    .from("almg_verba_resumo_mensal")
    .select("id_almg,nome,partido,ano,mes,qtd_notas,qtd_fornecedores,total_reembolsado,total_despesa")
    .order("total_reembolsado", { ascending: false });
}

export async function getAlmgDeputado(idAlmg: string) {
  return getSupabase()
    .from("almg_deputados")
    .select("id_almg,nome,partido,tag_localizacao")
    .eq("id_almg", idAlmg)
    .single();
}

export async function getAlmgVerbaDeputado(idAlmg: string) {
  return getSupabase()
    .from("almg_verba_indenizatoria")
    .select("id,ano,mes,categoria,categoria_total,emitente,cnpj_cpf,num_documento,data_emissao,valor_despesa,valor_reembolso")
    .eq("deputado_id_almg", idAlmg)
    .order("data_emissao", { ascending: false });
}

export async function getAlmgFornecedoresIntersetados() {
  return getSupabase()
    .from("almg_fornecedores_intersetados")
    .select("cnpj,nome,total_almg,notas_almg,deps_almg,total_alesp,notas_alesp,deps_alesp,total_camara,notas_camara,deps_camara,em_almg,em_alesp,em_camara,n_casas,total_geral")
    .gt("n_casas", 1)
    .order("total_geral", { ascending: false });
}

// ── ALESP ────────────────────────────────────────────────────────────────

export async function getAlespRanking() {
  return getSupabase()
    .from("alesp_despesas_resumo_mensal")
    .select("matricula,nome,partido,ativo,legislatura,ano,mes,qtd_despesas,qtd_fornecedores,total")
    .order("total", { ascending: false });
}

export async function getAlespDeputado(matricula: string) {
  return getSupabase()
    .from("alesp_deputados")
    .select("matricula,nome,partido,tag_localizacao,ativo,legislatura")
    .eq("matricula", matricula)
    .single();
}

export async function getAlespDespesasDeputado(matricula: string) {
  return getSupabase()
    .from("alesp_despesas_gabinete")
    .select("id,ano,mes,categoria,cod_categoria,fornecedor,cnpj_cpf,valor")
    .eq("matricula", matricula)
    .order("valor", { ascending: false });
}

// ── ALEPE ────────────────────────────────────────────────────────────────

export async function getAlepeRanking() {
  return getSupabase()
    .from("alepe_verba_resumo_mensal")
    .select("id_alepe,nome,partido,ativo,legislatura,ano,mes,qtd_notas,qtd_fornecedores,total")
    .order("total", { ascending: false });
}

export async function getAlepeDeputado(idAlepe: string) {
  return getSupabase()
    .from("alepe_deputados")
    .select("id_alepe,nome,partido,ativo,legislatura")
    .eq("id_alepe", idAlepe)
    .single();
}

export async function getAlEpeDespesasDeputado(idAlepe: string) {
  return getSupabase()
    .from("alepe_verba_indenizatoria")
    .select("id,ano,mes,cod_categoria,categoria,fornecedor,cnpj_cpf,data_emissao,valor")
    .eq("id_alepe", idAlepe)
    .order("data_emissao", { ascending: false });
}

export async function getAlepeFornecedoresIntersetados() {
  return getSupabase()
    .from("fornecedores_intersetados")
    .select("cnpj,nome,total_alepe,notas_alepe,deps_alepe,total_alesp,notas_alesp,deps_alesp,total_camara,notas_camara,deps_camara,em_alepe,em_alesp,em_camara,n_casas,total_geral")
    .gt("n_casas", 1)
    .order("total_geral", { ascending: false });
}

// ── ALESC ────────────────────────────────────────────────────────────────

export async function getAlescDeputados() {
  return getSupabase()
    .from("alesc_deputados")
    .select("id_alesc,nome")
    .order("nome", { ascending: true });
}

export async function getAlescDespesasResumo() {
  return getSupabase()
    .from("alesc_despesas")
    .select("nome_deputado,ano,valor")
    .order("valor", { ascending: false });
}

export async function getAlescDespesas(page = 1, perPage = 50, filtros?: { q?: string; ano?: string }) {
  let query = getSupabase()
    .from("alesc_despesas")
    .select("id,nome_deputado,ano,mes,verba,descricao,favorecido,valor", { count: "exact" });

  if (filtros?.q) {
    query = query.or(`nome_deputado.ilike.%${filtros.q}%,favorecido.ilike.%${filtros.q}%`);
  }
  if (filtros?.ano) {
    query = query.eq("ano", parseInt(filtros.ano));
  }

  return query
    .order("valor", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);
}
