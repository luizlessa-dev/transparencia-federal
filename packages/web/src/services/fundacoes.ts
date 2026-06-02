import { getSupabase } from "../lib/supabase-server";

export interface FundacaoRanking {
  cnpj: string;
  nome_popular: string | null;
  partido_sigla: string;
  presidente_nome: string | null;
  presidente_desde: string | null;
  municipio: string | null;
  uf: string | null;
  data_abertura: string | null;
  mesmo_endereco_partido: boolean;
  mesmo_telefone_partido: boolean;
  total_repassado_2024: number;
  qtd_repasses_2024: number;
  total_aluguel_2024: number;
  pct_q4_2024: number;
  score_alertas: number;
}

export interface FundacoesStats {
  total_fundacoes: number;
  total_repassado: number;
  com_sede_compartilhada: number;
  com_aluguel_circular: number;
  com_concentracao_q4: number;
}

export async function getFundacoesRanking(): Promise<FundacaoRanking[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("fundacoes_ranking_publico")
    .select("*")
    .order("total_repassado_2024", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FundacaoRanking[];
}

export async function getFundacoesStats(): Promise<FundacoesStats> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("fundacoes_ranking_publico")
    .select("total_repassado_2024, mesmo_endereco_partido, total_aluguel_2024, pct_q4_2024");
  if (error) throw error;
  const rows = data ?? [];
  return {
    total_fundacoes: rows.length,
    total_repassado: rows.reduce((s, r) => s + Number(r.total_repassado_2024 ?? 0), 0),
    com_sede_compartilhada: rows.filter(r => r.mesmo_endereco_partido).length,
    com_aluguel_circular: rows.filter(r => Number(r.total_aluguel_2024 ?? 0) > 0).length,
    com_concentracao_q4: rows.filter(r => Number(r.pct_q4_2024 ?? 0) > 40).length,
  };
}
