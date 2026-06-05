import "server-only";
import { getSupabase } from "~/lib/supabase-server";

const GALO_FORTE_CNPJ = "40.908.937/0001-97";

export async function getCvmFundos() {
  return getSupabase().from("cvm_fundo").select("*");
}

export async function getCvmCarteira() {
  return getSupabase().from("cvm_carteira_edge").select("*");
}

export async function getCvmOfertas() {
  return getSupabase().from("cvm_oferta").select("*");
}

export async function getCvmFips() {
  return getSupabase().from("cvm_fundo").select("*").eq("tipo", "FIP");
}

export async function getCvmGaloForteHistorico() {
  return getSupabase()
    .from("cvm_fip_informe")
    .select("dt_comptc,vl_patrim_liq,vl_cap_integr,nr_cotst,pr_pf")
    .eq("cnpj_norm", GALO_FORTE_CNPJ.replace(/\D/g, ""))
    .order("dt_comptc", { ascending: true });
}

export async function getCvmEmissoresSancionados() {
  return getSupabase()
    .from("cvm_emissor_sancionado")
    .select("cnpj_emissor,nome_emissor,n_ofertas,valor_total,ultima_oferta,tipos_ativo,origem_sancao,sancao_orgao,sancao_ativa,condenada")
    .order("valor_total", { ascending: false });
}

export async function getCvmEmissoresSancionadosCount() {
  return getSupabase()
    .from("cvm_emissor_sancionado")
    .select("cnpj_emissor", { count: "exact", head: true });
}

// ─── FIPs monopolizados (padrão Galo Forte) ──────────────────────────────────

export async function getCvmFipMonopolioCount() {
  return getSupabase()
    .from("cvm_fip_monopolio")
    .select("cnpj_norm", { count: "exact", head: true });
}

export async function getCvmFipMonopolioLista() {
  return getSupabase()
    .from("cvm_fip_monopolio")
    .select(
      "cnpj_norm,denom,tipo,situacao,dt_comptc,vl_patrim_liq,vl_cap_integr,vl_cap_compr," +
      "nr_cotst,pr_pf,admin,gestor,controlador,tem_aresta_grafo,tem_oferta,tem_politico"
    )
    .order("vl_cap_integr", { ascending: false });
}

export async function getCvmFipMonopolioDetalhe(cnpjNorm: string) {
  return getSupabase()
    .from("cvm_fip_monopolio")
    .select("*")
    .eq("cnpj_norm", cnpjNorm)
    .single();
}

export async function getCvmFipMonopolioHistorico(cnpjNorm: string) {
  return getSupabase().rpc("cvm_fip_monopolio_historico", { p_cnpj: cnpjNorm });
}

// ─── Sócios políticos (Receita × parlamentares) ───────────────────────────────

export async function getCvmSociosPoliticos() {
  return getSupabase()
    .from("cvm_socio_politico")
    .select(
      "deputado_id,politico,sigla_partido,sigla_uf,score_total," +
      "cnpj_basico,empresa,capital_social,papel_societario,cpf_socio_mascarado,cpf_confirma"
    )
    .order("score_total", { ascending: false });
}

export async function getCvmSociosPoliticosCount() {
  return getSupabase()
    .from("cvm_socio_politico")
    .select("cnpj_basico", { count: "exact", head: true });
}

// ─── Motor de grafo ───────────────────────────────────────────────────────────

export async function getCvmGrafoVizinhanca(cnpj: string, profundidade = 3) {
  return getSupabase().rpc("cvm_grafo_vizinhanca", {
    p_cnpj: cnpj.replace(/\D/g, ""),
    p_prof: profundidade,
  });
}
