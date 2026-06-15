import { getSupabase } from "../lib/supabase-server";

export interface ScorecarFornecedorFederal {
  cnpj: string | null;
  convenente_nome: string | null;
  qtd_convenios: number | null;
  valor_total: string | null;
  valor_liberado: string | null;
  primeiro_convenio: string | null;
  ultimo_convenio: string | null;
  ufs_distintas: number | null;
  orgaos_distintos: number | null;
  qtd_sancoes: number | null;
  sancoes_ativas: number | null;
  primeira_sancao: string | null;
  ultima_sancao: string | null;
  is_sancionado: boolean | null;
  is_sancionado_ativo: boolean | null;
}

export type RecorteFornecedorFederal = "faturamento" | "sancionados";

export async function getFornecedoresFederaisLista(
  recorte: RecorteFornecedorFederal = "faturamento",
  limit = 200
) {
  const sb = getSupabase();
  let q = sb
    .from("mv_scorecard_fornecedor_federal")
    .select("*")
    .order("valor_total", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (recorte === "sancionados") {
    q = q.eq("is_sancionado_ativo", true);
  }

  return q;
}

export async function getFornecedoresFederaisResumo() {
  const sb = getSupabase();
  const { data, error } = await sb.from("mv_scorecard_fornecedor_federal").select(
    "cnpj,valor_total,is_sancionado_ativo,qtd_sancoes,sancoes_ativas"
  );

  if (error || !data) return { total: 0, sancionadosAtivos: 0, valorSancionados: 0, totalConvenios: 0 };

  const rows = data as { cnpj: string; valor_total: string | null; is_sancionado_ativo: boolean | null }[];
  const sancionados = rows.filter((r) => r.is_sancionado_ativo);

  return {
    total: rows.length,
    sancionadosAtivos: sancionados.length,
    valorSancionados: sancionados.reduce((s, r) => s + Number(r.valor_total ?? 0), 0),
    totalConvenios: rows.reduce((s, r) => s + Number(r.valor_total ?? 0), 0),
  };
}
