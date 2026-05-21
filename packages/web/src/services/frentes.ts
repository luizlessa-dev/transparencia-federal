import { getSupabase } from "~/lib/supabase-server";

export interface FrenteRow {
  id: number;
  titulo: string;
  id_legislatura: number;
  total_membros?: number;
}

export interface FrenteMembro {
  deputado_id: number;
  nome: string;
  sigla_partido: string | null;
  sigla_uf: string | null;
}

export interface DeputadoFrentes {
  frente_id: number;
  titulo: string;
}

/** Lista todas as frentes com contagem de membros */
export async function getFrentesLista(): Promise<FrenteRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("cam_frentes")
    .select("id, titulo, id_legislatura")
    .eq("id_legislatura", 57)
    .order("titulo");

  if (error) throw new Error(`getFrentesLista: ${error.message}`);

  // Conta membros por frente
  const { data: contagens } = await sb
    .from("cam_frentes_membros")
    .select("frente_id");

  const contagemMap = new Map<number, number>();
  for (const r of (contagens ?? []) as { frente_id: number }[]) {
    contagemMap.set(r.frente_id, (contagemMap.get(r.frente_id) ?? 0) + 1);
  }

  return (data ?? []).map((f) => ({
    ...(f as FrenteRow),
    total_membros: contagemMap.get((f as FrenteRow).id) ?? 0,
  }));
}

/** Membros de uma frente específica */
export async function getFrente(id: number): Promise<{ frente: FrenteRow | null; membros: FrenteMembro[] }> {
  const sb = getSupabase();
  const [{ data: frente }, { data: membros }] = await Promise.all([
    sb.from("cam_frentes").select("*").eq("id", id).single(),
    sb.from("cam_frentes_membros").select("deputado_id, nome, sigla_partido, sigla_uf")
      .eq("frente_id", id).order("nome"),
  ]);

  return {
    frente: frente as FrenteRow | null,
    membros: (membros ?? []) as FrenteMembro[],
  };
}

/** Frentes de um deputado específico */
export async function getFrentesDeDeputado(deputadoId: number): Promise<DeputadoFrentes[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("cam_frentes_membros")
    .select("frente_id, cam_frentes(titulo)")
    .eq("deputado_id", deputadoId);

  return (data ?? []).map((r) => ({
    frente_id: (r as { frente_id: number }).frente_id,
    titulo: ((r as unknown as { cam_frentes: { titulo: string } }).cam_frentes?.titulo) ?? "",
  }));
}

/** Comissões de um deputado */
export async function getComissoesDeDeputado(deputadoId: number): Promise<Array<{
  comissao_id: number; sigla: string | null; nome: string; titulo: string | null;
}>> {
  const sb = getSupabase();
  const { data } = await sb
    .from("cam_comissoes_membros")
    .select("comissao_id, titulo, cam_comissoes(sigla, nome)")
    .eq("deputado_id", deputadoId)
    .is("data_fim", null); // apenas membros ativos

  return (data ?? []).map((r) => {
    const row = r as unknown as {
      comissao_id: number;
      titulo: string | null;
      cam_comissoes: { sigla: string | null; nome: string } | null;
    };
    return {
      comissao_id: row.comissao_id,
      sigla: row.cam_comissoes?.sigla ?? null,
      nome: row.cam_comissoes?.nome ?? "",
      titulo: row.titulo,
    };
  });
}
