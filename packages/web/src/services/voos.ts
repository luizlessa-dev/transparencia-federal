import "server-only";
import { getSupabase } from "~/lib/supabase-server";

/**
 * Eixo Voos (#1) — passagens aéreas da cota do Senado.
 * Lê as tabelas _agg materializadas por @transparencia/analytics → job_voos_senado.
 * A página agrega por entidade (soma os anos) e faz a apresentação.
 */

export async function getVoosParlamentarAgg() {
  return getSupabase()
    .from("voos_senado_parlamentar_agg")
    .select(
      "senador_normalizado,ano,total_gasto,n_documentos,n_trechos,n_trechos_terceiros"
    )
    .order("total_gasto", { ascending: false });
}

export async function getVoosCompanhiaAgg() {
  return getSupabase()
    .from("voos_senado_companhia_agg")
    .select("companhia,ano,total_gasto,n_documentos,n_trechos");
}

export async function getVoosTerceiros() {
  return getSupabase()
    .from("voos_senado_terceiros_agg")
    .select("passageiro,vinculo,senador_normalizado,n_trechos")
    .order("n_trechos", { ascending: false })
    .limit(100);
}

// ── Resumos para a ficha do parlamentar (/parlamentares/[id]) ──

export interface VoosFichaResumo {
  gasto: number;
  trechos: number;
  terceiros: number; // só Senado (Câmara não tem passageiro)
  documentos: number;
  anos: number;
  temTrechoTerceiros: boolean; // true no Senado (dado de passageiro existe)
}

/** Resumo de voos de um senador (match por senador_normalizado = normalizarNome). */
export async function getVoosSenadorFicha(
  senadorNormalizado: string
): Promise<VoosFichaResumo | null> {
  const { data } = await getSupabase()
    .from("voos_senado_parlamentar_agg")
    .select("ano,total_gasto,n_trechos,n_trechos_terceiros,n_documentos")
    .eq("senador_normalizado", senadorNormalizado);
  if (!data || data.length === 0) return null;
  return {
    gasto: data.reduce((s, r) => s + Number(r.total_gasto ?? 0), 0),
    trechos: data.reduce((s, r) => s + Number(r.n_trechos ?? 0), 0),
    terceiros: data.reduce((s, r) => s + Number(r.n_trechos_terceiros ?? 0), 0),
    documentos: data.reduce((s, r) => s + Number(r.n_documentos ?? 0), 0),
    anos: data.length,
    temTrechoTerceiros: true,
  };
}

/** Resumo de voos de um deputado (match por deputado_id_externo = id_camara; 2023+). */
export async function getVoosDeputadoFicha(
  idCamara: string | number
): Promise<VoosFichaResumo | null> {
  const { data } = await getSupabase()
    .from("voos_camara_deputado_agg")
    .select("ano,total_gasto,n_documentos")
    .eq("deputado_id_externo", String(idCamara));
  if (!data || data.length === 0) return null;
  return {
    gasto: data.reduce((s, r) => s + Number(r.total_gasto ?? 0), 0),
    trechos: 0,
    terceiros: 0,
    documentos: data.reduce((s, r) => s + Number(r.n_documentos ?? 0), 0),
    anos: data.length,
    temTrechoTerceiros: false,
  };
}

// ── Câmara dos Deputados (só gasto + companhia; 2023+, ver nota na página) ──

export async function getVoosCamaraDeputado() {
  return getSupabase()
    .from("voos_camara_deputado_agg")
    .select("deputado_id_externo,nome,sigla_partido,sigla_uf,ano,total_gasto,n_documentos")
    .order("total_gasto", { ascending: false });
}

export async function getVoosCamaraCompanhia() {
  return getSupabase()
    .from("voos_camara_companhia_agg")
    .select("companhia,companhia_eh_aerea,ano,total_gasto,n_documentos");
}

/** Marca se a companhia é aérea conhecida (vs agência) — espelha a normalização
 * do job analytics, usada só para rotular na página. */
const AEREAS = new Set([
  "AZUL",
  "AZUL CONECTA",
  "GOL",
  "LATAM",
  "AVIANCA",
  "VOEPASS",
  "ITA",
  "MAP",
  "WEBJET",
  "TRIP",
  "AEROLINEAS ARGENTINAS",
  "TAP",
  "AMERICAN AIRLINES",
  "IBERIA",
]);

export function ehAereaConhecida(companhia: string): boolean {
  return AEREAS.has(companhia.toUpperCase().trim());
}
