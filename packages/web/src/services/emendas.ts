import { getSupabase } from "../lib/supabase-server";

export interface EmendaCompleta {
  id: string;
  codigo_emenda: string;
  ano: number;
  tipo_emenda: string;
  eh_rp9: boolean;
  autor_nome: string | null;
  numero_emenda: string | null;
  localidade: string | null;
  uf: string | null;
  municipio: string | null;
  funcao: string | null;
  subfuncao: string | null;
  valor_empenhado: number;
  valor_liquidado: number;
  valor_pago: number;
  valor_resto_inscrito: number;
  valor_resto_cancelado: number;
  valor_resto_pago: number;
}

export interface Rp9Stats {
  ano: number;
  total_emendas: number;
  total_empenhado: number;
  total_pago: number;
  total_cancelado: number;
  por_funcao: { funcao: string; empenhado: number }[];
  por_uf: { uf: string; empenhado: number }[];
}

export interface EmendasPage {
  data: EmendaCompleta[];
  total: number;
}

const ANOS_VALIDOS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

// O Portal da Transparência grava autor_nome em CAIXA ALTA e SEM ACENTO
// ("AECIO NEVES"), mas parlamentares.nome_parlamentar tem acento ("Aécio Neves").
// ilike é case-insensitive mas não accent-insensitive, então o vínculo por nome
// falha para qualquer parlamentar com acento. Removemos o acento do termo de busca.
function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export async function getEmendasRp9(ano: number, page: number, perPage = 50): Promise<EmendasPage> {
  if (!ANOS_VALIDOS.includes(ano)) return { data: [], total: 0 };

  const sb = getSupabase();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await sb
    .from("emendas_completas")
    .select("*", { count: "exact" })
    .eq("eh_rp9", true)
    .eq("ano", ano)
    .order("valor_empenhado", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data: (data ?? []) as EmendaCompleta[], total: count ?? 0 };
}

export async function getRp9StatsPorAno(): Promise<Rp9Stats[]> {
  const sb = getSupabase();

  const { data, error } = await sb
    .from("emendas_completas")
    .select("ano, valor_empenhado, valor_pago, valor_resto_cancelado, funcao, uf")
    .eq("eh_rp9", true)
    .order("ano");

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Agrega em memória por ano
  const porAno = new Map<number, {
    total_emendas: number;
    total_empenhado: number;
    total_pago: number;
    total_cancelado: number;
    funcoes: Map<string, number>;
    ufs: Map<string, number>;
  }>();

  for (const row of data) {
    const ano = row.ano as number;
    if (!porAno.has(ano)) {
      porAno.set(ano, { total_emendas: 0, total_empenhado: 0, total_pago: 0, total_cancelado: 0, funcoes: new Map(), ufs: new Map() });
    }
    const agg = porAno.get(ano)!;
    const emp = Number(row.valor_empenhado ?? 0);
    const pago = Number(row.valor_pago ?? 0);
    const canc = Number(row.valor_resto_cancelado ?? 0);
    agg.total_emendas++;
    agg.total_empenhado += emp;
    agg.total_pago += pago;
    agg.total_cancelado += canc;
    if (row.funcao) agg.funcoes.set(row.funcao, (agg.funcoes.get(row.funcao) ?? 0) + emp);
    if (row.uf) agg.ufs.set(row.uf, (agg.ufs.get(row.uf) ?? 0) + emp);
  }

  return Array.from(porAno.entries())
    .sort(([a], [b]) => a - b)
    .map(([ano, agg]) => ({
      ano,
      total_emendas: agg.total_emendas,
      total_empenhado: agg.total_empenhado,
      total_pago: agg.total_pago,
      total_cancelado: agg.total_cancelado,
      por_funcao: Array.from(agg.funcoes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([funcao, empenhado]) => ({ funcao, empenhado })),
      por_uf: Array.from(agg.ufs.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([uf, empenhado]) => ({ uf, empenhado })),
    }));
}

export async function getEmendasParlamentar(
  autorNome: string,
  ano: number,
  page: number,
  perPage = 30
): Promise<EmendasPage> {
  const sb = getSupabase();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await sb
    .from("emendas_completas")
    .select("*", { count: "exact" })
    .ilike("autor_nome", semAcento(autorNome))
    .eq("ano", ano)
    .order("valor_empenhado", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data: (data ?? []) as EmendaCompleta[], total: count ?? 0 };
}

export async function getEmendaById(id: string): Promise<EmendaCompleta | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("emendas_completas")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as EmendaCompleta;
}

export async function getTopEmendasParlamentar(
  autorNome: string,
  limit = 10
): Promise<EmendaCompleta[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("emendas_completas")
    .select("*")
    .ilike("autor_nome", `%${semAcento(autorNome)}%`)
    .order("valor_empenhado", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as EmendaCompleta[];
}

/**
 * Lista todas as emendas de um parlamentar (até `limit`) para
 * agregações em memória (KPIs, por tipo, por ano, por função, etc.).
 * Pagina internamente para superar o limite de 1000 do Supabase.
 */
export async function getEmendasParlamentarFull(
  autorNome: string,
  limit = 2000
): Promise<EmendaCompleta[]> {
  const sb = getSupabase();
  const PAGE = 1000;
  const out: EmendaCompleta[] = [];

  for (let offset = 0; offset < limit; offset += PAGE) {
    const to = Math.min(offset + PAGE - 1, limit - 1);
    const { data, error } = await sb
      .from("emendas_completas")
      .select("*")
      .ilike("autor_nome", `%${semAcento(autorNome)}%`)
      .order("ano", { ascending: false })
      .order("valor_empenhado", { ascending: false })
      .range(offset, to);
    if (error) throw error;
    const rows = (data ?? []) as EmendaCompleta[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function getEmendasListing(
  ano: number,
  page: number,
  perPage = 50,
  filters?: { tipoEmenda?: string; uf?: string; funcao?: string }
): Promise<EmendasPage> {
  if (!ANOS_VALIDOS.includes(ano)) return { data: [], total: 0 };

  const sb = getSupabase();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = sb
    .from("emendas_completas")
    .select("*", { count: "exact" })
    .eq("ano", ano)
    .order("valor_empenhado", { ascending: false })
    .range(from, to);

  if (filters?.tipoEmenda) query = query.ilike("tipo_emenda", `%${filters.tipoEmenda}%`);
  if (filters?.uf) query = query.eq("uf", filters.uf);
  if (filters?.funcao) query = query.ilike("funcao", `%${filters.funcao}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as EmendaCompleta[], total: count ?? 0 };
}
