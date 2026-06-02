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
