import { getSupabase } from "../lib/supabase-server";

export interface FundacaoDetalhe {
  cnpj: string;
  razao_social: string | null;
  nome_popular: string | null;
  partido_sigla: string;
  partido_cnpj: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  data_abertura: string | null;
  capital_social: number;
  natureza_juridica: string | null;
  presidente_nome: string | null;
  presidente_desde: string | null;
  mesmo_endereco_partido: boolean;
  mesmo_telefone_partido: boolean;
}

export interface RepasseMensal {
  mes: string;           // "2024-01"
  total_repassado: number;
  qtd_repasses: number;
  tipos: Record<string, number>;
}

export interface RepasseIndividual {
  sq_despesa: number;
  dt_pagamento: string | null;
  vr_pagamento: number;
  ds_gasto: string | null;
  tipo_repasse: string;
  ds_fonte_despesa: string | null;
}

export interface NFItem {
  sq_despesa: number;
  nr_documento: string | null;
  vr_documento: number;
  dt_pagamento: string | null;
  ds_tipo_despesa: string | null;
  url_pdf: string | null;
}

export interface AlertaDetalhe {
  alerta_sede_compartilhada: boolean;
  alerta_aluguel_circular: boolean;
  valor_aluguel_anual: number;
  alerta_concentracao_q4: boolean;
  pct_q4: number;
  alerta_natureza_juridica_suspeita: boolean;
  score_alertas: number;
  total_repassado: number;
  aa_exercicio: number;
}

export async function getFundacaoDetalhe(cnpj: string): Promise<FundacaoDetalhe | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("fundacoes_partidarias")
    .select("*")
    .eq("cnpj", cnpj.replace(/\D/g, ""))
    .maybeSingle();
  if (error || !data) return null;
  return data as FundacaoDetalhe;
}

export async function getRepassesMensais(cnpj: string, ano = 2024): Promise<RepasseMensal[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("fundacoes_repasses")
    .select("dt_pagamento, vr_pagamento, tipo_repasse")
    .eq("cnpj_fundacao", cnpj.replace(/\D/g, ""))
    .eq("aa_exercicio", ano)
    .order("dt_pagamento");
  if (error || !data) return [];

  const map = new Map<string, RepasseMensal>();
  for (const r of data) {
    const dt = (r.dt_pagamento as string | null) ?? "";
    const mes = dt.slice(0, 7) || "desconhecido";
    const existing = map.get(mes) ?? { mes, total_repassado: 0, qtd_repasses: 0, tipos: {} };
    existing.total_repassado += Number(r.vr_pagamento ?? 0);
    existing.qtd_repasses += 1;
    const tipo = (r.tipo_repasse as string) ?? "outros";
    existing.tipos[tipo] = (existing.tipos[tipo] ?? 0) + Number(r.vr_pagamento ?? 0);
    map.set(mes, existing);
  }
  return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
}

export async function getRepassesIndividuais(cnpj: string, ano = 2024): Promise<RepasseIndividual[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("fundacoes_repasses")
    .select("sq_despesa, dt_pagamento, vr_pagamento, ds_gasto, tipo_repasse, ds_fonte_despesa")
    .eq("cnpj_fundacao", cnpj.replace(/\D/g, ""))
    .eq("aa_exercicio", ano)
    .order("dt_pagamento");
  if (error || !data) return [];
  return data as RepasseIndividual[];
}

export async function getNFsParaFundacao(cnpj: string, ano = 2024): Promise<NFItem[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("fundacoes_nf_partidos")
    .select("sq_despesa, nr_documento, vr_documento, dt_pagamento, ds_tipo_despesa, url_pdf")
    .eq("fundacao_cnpj", cnpj.replace(/\D/g, ""))
    .eq("aa_exercicio", ano)
    .order("dt_pagamento");
  if (error || !data) return [];
  return data as NFItem[];
}

export async function getAlertasFundacao(cnpj: string): Promise<AlertaDetalhe | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("fundacoes_alertas")
    .select("*")
    .eq("cnpj", cnpj.replace(/\D/g, ""))
    .eq("aa_exercicio", 2024)
    .maybeSingle();
  if (error || !data) return null;
  return data as AlertaDetalhe;
}
