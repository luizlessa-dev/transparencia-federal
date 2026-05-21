import { getSupabase } from "../lib/supabase-server";

export interface ParlamentarRisco {
  deputado_id: number;
  nome: string;
  sigla_partido: string;
  sigla_uf: string;
  url_foto: string | null;
  score_total: number;
  dim_ceap: number;
  dim_presenca: number;
  dim_producao: number;
  dim_financiamento: number;
  dim_rp9: number;
  ceap_total_2024: number | null;
  passagens_aereas_2024: number | null;
  presenca_pct: number | null;
  concordancia_partido: number | null;
  total_proposicoes: number | null;
  total_substantivo: number | null;
  financiamento_total: number | null;
  financiamento_fefc: number | null;
  patrimonio_2022: number | null;
  fornecedores_sancionados: number;
  doadores_sancionados: number;
  total_legislaturas: number | null;
  primeira_legislatura: number | null;
  cargo_anterior: string | null;
  total_frentes: number;
  total_comissoes: number;
}

export interface RiscoPage {
  data: ParlamentarRisco[];
  total: number;
}

export async function getRiscoRanking(
  page: number,
  perPage: number,
  filters?: { partido?: string; uf?: string }
): Promise<RiscoPage> {
  const sb = getSupabase();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = sb
    .from("cam_parlamentar_risco")
    .select("*", { count: "exact" })
    .order("score_total", { ascending: false })
    .range(from, to);

  if (filters?.partido) query = query.eq("sigla_partido", filters.partido);
  if (filters?.uf) query = query.eq("sigla_uf", filters.uf);

  const { data, error, count } = await query;
  if (error) throw new Error(`getRiscoRanking: ${error.message}`);
  return { data: (data ?? []) as ParlamentarRisco[], total: count ?? 0 };
}

export async function getParlamentarRisco(deputadoId: number): Promise<ParlamentarRisco | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("cam_parlamentar_risco")
    .select("*")
    .eq("deputado_id", deputadoId)
    .single();
  if (error) return null;
  return data as ParlamentarRisco;
}

export async function getPartidosRisco(): Promise<string[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("cam_parlamentar_risco")
    .select("sigla_partido")
    .order("sigla_partido");
  if (error) return [];
  const partidos = [...new Set((data ?? []).map((r: { sigla_partido: string }) => r.sigla_partido).filter(Boolean))];
  return partidos as string[];
}

export async function getUfsRisco(): Promise<string[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("cam_parlamentar_risco")
    .select("sigla_uf")
    .order("sigla_uf");
  if (error) return [];
  const ufs = [...new Set((data ?? []).map((r: { sigla_uf: string }) => r.sigla_uf).filter(Boolean))];
  return ufs as string[];
}
