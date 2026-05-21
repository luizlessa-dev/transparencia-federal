import { getSupabase } from "../lib/supabase-server";

export interface Sancionado {
  id: number;
  cpf_cnpj: string;
  nome: string | null;
  tipo_registro: string;
  tipo_sancao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  orgao_nome: string | null;
  orgao_uf: string | null;
  ativo: boolean;
  atualizado_em: string;
}

export async function getSancionados(
  page: number,
  perPage: number,
  filters?: { q?: string; tipo?: string; apenasAtivos?: boolean }
): Promise<{ data: Sancionado[]; total: number }> {
  const sb = getSupabase();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = sb
    .from("portal_sancionados")
    .select("*", { count: "exact" })
    .order("ativo", { ascending: false })
    .order("data_inicio", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (filters?.q) {
    const q = filters.q.replace(/[.\-\/]/g, "").trim();
    if (q) {
      // Busca por CPF/CNPJ limpo ou por nome (ilike)
      query = query.or(`cpf_cnpj.eq.${q},nome.ilike.%${filters.q.trim()}%`);
    }
  }

  if (filters?.tipo && filters.tipo !== "todos") {
    query = query.eq("tipo_registro", filters.tipo.toUpperCase());
  }

  if (filters?.apenasAtivos) {
    query = query.eq("ativo", true);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("getSancionados error:", error.message);
    return { data: [], total: 0 };
  }

  return { data: (data ?? []) as Sancionado[], total: count ?? 0 };
}

export async function getTotalSancionados(): Promise<{ total: number; ativos: number; atualizadoEm: string | null }> {
  const sb = getSupabase();

  const [{ count: total }, { count: ativos }, { data: ultimo }] = await Promise.all([
    sb.from("portal_sancionados").select("id", { count: "exact", head: true }),
    sb.from("portal_sancionados").select("id", { count: "exact", head: true }).eq("ativo", true),
    sb.from("portal_sancionados").select("atualizado_em").order("atualizado_em", { ascending: false }).limit(1),
  ]);

  return {
    total: total ?? 0,
    ativos: ativos ?? 0,
    atualizadoEm: (ultimo?.[0] as { atualizado_em: string } | undefined)?.atualizado_em ?? null,
  };
}
