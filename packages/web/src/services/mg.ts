import "server-only";
import { getSupabase } from "~/lib/supabase-server";

// ── Gated (paywall cut done in the page) ─────────────────────────────────

export async function getMgSupersalarios() {
  return getSupabase()
    .from("mg_supersalarios")
    .select("servidor_nome,orgao,cargo,situacao,remuneracao_bruta,remuneracao_liquida,abate_teto,servidor_id_externo,ano,mes");
}

export async function getMgObrasList() {
  return getSupabase()
    .from("mg_obras")
    .select("contrato,objeto,empresa,orgao,situacao,municipios,dias_paralisados,valor_total,total_medido,percentual_execucao,cnpj_norm");
}

export async function getMgObrasSancionadas() {
  return getSupabase()
    .from("mg_obras_sancionadas")
    .select("empresa,orgao,valor_total,situacao,dias_paralisados,conduta,condenada");
}

export async function getMgContratosSancionados() {
  return getSupabase()
    .from("mg_contratos_sancionados")
    .select("fornecedor,cnpj_fmt,cnpj_norm,orgao,objeto,valor_total,situacao,conduta,decisao,fase,condenada");
}

export async function getMgCovidCount() {
  return getSupabase()
    .from("mg_covid_compras")
    .select("*", { count: "exact", head: true });
}

export async function getMgCovidSobrepreco() {
  return getSupabase()
    .from("mg_covid_sobrepreco")
    .select("contratado,orgao_demandante,objeto,item,procedimento,quantidade,valor_ref_unit,valor_hom_unit,valor_homologado,sobrepreco_pct")
    .limit(500);
}

export async function getMgCovidSancionados() {
  return getSupabase()
    .from("mg_covid_sancionados")
    .select("contratado,orgao_demandante,valor_homologado,conduta,condenada");
}

export async function getMgTerceirizadosList() {
  return getSupabase()
    .from("mg_terceirizados")
    .select("empresa,cnpj_norm,orgao,mes_referencia,qtd_trabalhadores");
}

export async function getMgTerceirizadosSancionados() {
  return getSupabase()
    .from("mg_terceirizados_sancionados")
    .select("empresa,cnpj_norm,orgao,mes_referencia,qtd_trabalhadores,conduta,condenada");
}

export async function getMgConveniosCount() {
  return getSupabase()
    .from("mg_convenios")
    .select("*", { count: "exact", head: true });
}

export async function getMgConveniosComEmendaCount() {
  return getSupabase()
    .from("mg_convenios")
    .select("*", { count: "exact", head: true })
    .gt("vr_emenda_parl", 0);
}

export async function getMgConveniosMaiores(limit = 200) {
  return getSupabase()
    .from("mg_convenios")
    .select("convenente,ano,orgao_id,vr_total,vr_emenda_parl")
    .order("vr_total", { ascending: false })
    .limit(limit);
}

export async function getMgConveniosComEmenda(limit = 200) {
  return getSupabase()
    .from("mg_convenios")
    .select("convenente,ano,orgao_id,vr_total,vr_emenda_parl")
    .gt("vr_emenda_parl", 0)
    .order("vr_emenda_parl", { ascending: false })
    .limit(limit);
}

export async function getMgConveniosSancionados() {
  return getSupabase()
    .from("mg_convenios_sancionados")
    .select("convenente,ano,vr_total,conduta,condenada");
}

export async function getMgPagamentosCondenadas() {
  return getSupabase()
    .from("mg_pagamentos_condenadas")
    .select("credor,orgao,cnpj_norm,elemento_despesa,valor_pago,ano,conduta,decisao,fase");
}

export async function getMgLicitacaoSobrepreco(ano: number | null) {
  const q = getSupabase()
    .from("mg_licitacao_sobrepreco_rel")
    .select("ano,orgao,fornecedor,item_descricao,numero_processo,vr_unit_referencia,vr_unit_homologado,sobrepreco_valor,sobrepreco_pct")
    .order("sobrepreco_valor", { ascending: false })
    .limit(120);
  return ano ? q.eq("ano", ano) : q;
}

export async function getMgLicitacaoPorAno() {
  return getSupabase()
    .from("mg_licitacao_sobrepreco_por_ano")
    .select("ano,n,total");
}

export async function getMgLicitacaoPorOrgao() {
  return getSupabase()
    .from("mg_licitacao_sobrepreco_por_orgao")
    .select("orgao,n,total")
    .limit(12);
}

export async function getMgEmendasFederais() {
  return getSupabase()
    .from("mg_emendas_federais")
    .select("modalidade,autoria,ano,valor_indicado,valor_repassado,objeto,funcao_governo,orgao_executor");
}

// ── Public (no paywall cut needed) ──────────────────────────────────────

export async function getMgDiarias(ano: number) {
  return getSupabase()
    .from("mg_diarias_orgao")
    .select("orgao,sigla,vr_empenhado,vr_pago,qtd_registros")
    .eq("ano", ano)
    .order("vr_pago", { ascending: false });
}

export async function getMgRestos(ano: number) {
  return getSupabase()
    .from("mg_restos_orgao")
    .select("orgao,sigla,vr_inscrito,vr_pago")
    .eq("ano", ano)
    .order("vr_inscrito", { ascending: false });
}

export async function getMgLrfLimites() {
  return getSupabase()
    .from("mg_lrf_limites")
    .select("periodo,ano_ref,rcl_ajustada,dtp,limite_maximo,limite_prudencial,limite_alerta,pct_dtp,pct_maximo,pct_prudencial")
    .order("periodo", { ascending: false });
}

export async function getMgLrfPessoal() {
  return getSupabase()
    .from("mg_lrf_pessoal")
    .select("mes_ano,ano,mes,despesa_liquida")
    .order("mes_ano", { ascending: false });
}

export async function getMgReparacao() {
  return getSupabase()
    .from("mg_reparacao_vale")
    .select("iniciativa,anexo,valor")
    .order("valor", { ascending: false });
}

export async function getMgDoacoes() {
  return getSupabase()
    .from("mg_doacoes")
    .select("doador,objeto,orgao_recebedor,natureza_doador,categoria_valor,ano")
    .order("ano", { ascending: false });
}

export async function getMgVoos() {
  return getSupabase()
    .from("mg_voos_governador")
    .select("data_voo,aeronave,origem,destino,passageiro,cargo_passageiro")
    .order("data_voo", { ascending: false });
}

export async function getMgIpsemg() {
  return getSupabase()
    .from("mg_ipsemg_contratos")
    .select("nome,cnpj_norm,ramo_atividade,municipio");
}

export async function getMgEmendasEstaduaisResumo() {
  return getSupabase()
    .from("mg_emendas_estaduais_resumo")
    .select("total,emendas,autores")
    .maybeSingle();
}

export async function getMgEmendasEstaduaisPorAutor() {
  return getSupabase()
    .from("mg_emendas_estaduais_por_autor")
    .select("autor,n,total")
    .order("total", { ascending: false });
}

export async function getMgEmendasEstaduais() {
  return getSupabase()
    .from("mg_emendas_estaduais")
    .select("autor,ano,objeto,uo_beneficiada,vr_emenda")
    .order("vr_emenda", { ascending: false });
}

export async function getMgOrganizacoesSociais() {
  return getSupabase()
    .from("mg_os_parcerias")
    .select("id_instrumento,tipo_instrumento,entidade,cnpj_norm,objeto,situacao,vr_repasse_atualizado")
    .order("vr_repasse_atualizado", { ascending: false });
}

export async function getMgConveniosEntrada() {
  return getSupabase()
    .from("mg_convenios_entrada")
    .select("concedente,ano,vr_concedente")
    .order("vr_concedente", { ascending: false });
}

export async function getMgPessoalVale() {
  return getSupabase()
    .from("mg_despesa_pessoal_vale")
    .select("ano_mes,orgao_sigla,orgao,nome,valor,cargo_descricao")
    .order("ano_mes", { ascending: false });
}

export async function getMgNotasResumo() {
  return getSupabase()
    .from("mg_notas_resumo")
    .select("total,fornecedores")
    .maybeSingle();
}

export async function getMgNotasFornecedores() {
  return getSupabase()
    .from("mg_notas_fornecedor_total")
    .select("cnpj_norm,nome,valor_total,n_notas")
    .order("valor_total", { ascending: false });
}

export async function getMgComprasResumo() {
  return getSupabase()
    .from("mg_compras_resumo")
    .select("total,fornecedores")
    .maybeSingle();
}

export async function getMgComprasFornecedores() {
  return getSupabase()
    .from("mg_compras_fornecedor_total")
    .select("cnpj_norm,nome,vr_homologado,n_contratos")
    .order("vr_homologado", { ascending: false });
}

export async function getMgEmpresasSancionadas() {
  return getSupabase()
    .from("mg_empresas_sancionadas")
    .select("cnpj_norm,decisao,conduta");
}

export async function getMgFornecedoresResumo() {
  return getSupabase()
    .from("mg_fornecedor_perfil_resumo")
    .select("fornecedores,condenadas_faturando,pago_a_condenadas")
    .maybeSingle();
}

export async function getMgFornecedoresPerfil(recorte?: "faturamento" | "condenadas" | "sobrepreco") {
  const q = getSupabase()
    .from("mg_fornecedor_perfil")
    .select("cnpj_norm,cnpj_fmt,fornecedor,valor_faturado,valor_contratado,valor_compras_siad,valor_notas,valor_pago_sancionado,sobrepreco_itens,sobrepreco_valor,orgao_principal,concentracao_orgao,n_orgaos,condenada,processada,conduta,decisao,fase,terceirizada,organizacao_social,risco_score,risco_label");
  if (recorte === "condenadas") return q.eq("condenada", true).order("valor_faturado", { ascending: false });
  if (recorte === "sobrepreco") return q.gt("sobrepreco_valor", 0).order("sobrepreco_valor", { ascending: false });
  return q.order("valor_faturado", { ascending: false }); // faturamento (default)
}

// ── Dashboard (/mg) — todas as 23 queries agregadas ─────────────────────

export async function getMgDashboardStats() {
  const sb = getSupabase();
  return Promise.all([
    sb.from("mg_supersalarios").select("*", { count: "exact", head: true }),
    sb.from("mg_contratos_sancionados").select("valor_total,condenada"),
    sb.from("mg_obras_paradas").select("*", { count: "exact", head: true }),
    sb.from("mg_convenios").select("*", { count: "exact", head: true }),
    sb.from("mg_pagamentos_condenadas").select("valor_pago"),
    sb.from("mg_covid_sobrepreco").select("*", { count: "exact", head: true }),
    sb.from("mg_terceirizados").select("cnpj_norm"),
    sb.from("mg_reparacao_vale").select("valor"),
    sb.from("mg_lrf_limites").select("ano_ref,pct_dtp,pct_prudencial").order("ano_ref", { ascending: false }).limit(1),
    sb.from("mg_diarias_orgao").select("vr_pago").eq("ano", 2025),
    sb.from("mg_restos_orgao").select("vr_inscrito").eq("ano", 2025),
    sb.from("mg_licitacao_sobrepreco_por_ano").select("total"),
    sb.from("mg_emendas_federais").select("valor_indicado"),
    sb.from("mg_notas_resumo").select("total,fornecedores").maybeSingle(),
    sb.from("mg_compras_resumo").select("total,fornecedores").maybeSingle(),
    sb.from("mg_emendas_estaduais_resumo").select("total,autores").maybeSingle(),
    sb.from("mg_os_parcerias").select("vr_repasse_atualizado"),
    sb.from("mg_convenios_entrada").select("*", { count: "exact", head: true }),
    sb.from("mg_doacoes").select("*", { count: "exact", head: true }),
    sb.from("mg_voos_governador").select("*", { count: "exact", head: true }),
    sb.from("mg_despesa_pessoal_vale").select("*", { count: "exact", head: true }),
    sb.from("mg_ipsemg_contratos").select("*", { count: "exact", head: true }),
    sb.from("mg_fornecedor_perfil_resumo").select("fornecedores,condenadas_faturando,pago_a_condenadas").maybeSingle(),
  ]);
}
