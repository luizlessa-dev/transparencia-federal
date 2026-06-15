import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PublicacaoNormalizada } from "./extratores.js";

export function createSupabaseClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

export async function upsertPublicacoesDOU(
  supabase: SupabaseClient,
  registros: PublicacaoNormalizada[]
): Promise<{ inseridos: number; erros: number }> {
  if (registros.length === 0) return { inseridos: 0, erros: 0 };

  const { data, error } = await supabase
    .from("dou_publicacoes")
    .upsert(registros, { onConflict: "id_externo", ignoreDuplicates: false })
    .select("id_externo");

  if (error) throw new Error(`Upsert dou_publicacoes: ${error.message}`);

  const inseridos = Array.isArray(data) ? data.length : 0;
  return { inseridos, erros: registros.length - inseridos };
}

/** Retorna nomes normalizados de assessores de gabinete para cruzamento. */
export async function buscarNomesFuncionarios(supabase: SupabaseClient): Promise<Set<string>> {
  const PAGE = 1000;
  const nomes: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("folha_gabinete_atual")
      .select("secretario_nome")
      .not("secretario_nome", "is", null)
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`Buscar nomes funcionarios: ${error.message}`);
    if (!data || data.length === 0) break;
    nomes.push(...data.map((r: { secretario_nome: string }) => r.secretario_nome.trim().toUpperCase()));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return new Set(nomes);
}

/** Retorna CNPJs de empresas doadoras (14 dígitos, sem formatação) para cruzamento. */
export async function buscarCNPJsDoadores(supabase: SupabaseClient): Promise<Set<string>> {
  const PAGE = 1000;
  const cnpjs: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("tse_receitas_brutas")
      .select("nr_cpf_cnpj_doador")
      .not("nr_cpf_cnpj_doador", "is", null)
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`Buscar CNPJs doadores: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data as { nr_cpf_cnpj_doador: string }[]) {
      const limpo = r.nr_cpf_cnpj_doador.replace(/\D/g, "");
      if (limpo.length === 14) cnpjs.push(limpo);
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return new Set(cnpjs);
}

export interface AlertaCruzamento {
  id_externo: string;
  titulo: string;
  data_publicacao: string;
  orgao: string;
  tipo_match: "cpf_funcionario" | "cnpj_doador";
  valor_match: string;
}

export async function upsertAlertas(
  supabase: SupabaseClient,
  alertas: AlertaCruzamento[]
): Promise<void> {
  if (alertas.length === 0) return;
  const { error } = await supabase
    .from("dou_alertas_cruzamento")
    .upsert(alertas, { onConflict: "id_externo,tipo_match,valor_match", ignoreDuplicates: true });
  if (error) throw new Error(`Upsert dou_alertas_cruzamento: ${error.message}`);
}
