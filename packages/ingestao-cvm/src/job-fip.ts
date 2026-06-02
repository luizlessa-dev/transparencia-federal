/**
 * Ingestão dos informes de FIP → cvm_fip_informe (nível fundo) + nós em
 * cvm_fundo (FIPs não estão no cad_fi).
 *
 * Fontes (latin-1, `;`):
 *   trimestral   2021-2023: inf_trimestral_fip_YYYY.csv   (1ª col CNPJ_FUNDO)
 *   quadrimestral 2024+    : inf_quadrimestral_fip_YYYY.csv (1ª col CNPJ_FUNDO_CLASSE + TP_FUNDO_CLASSE)
 * Os dois layouts diferem só nas primeiras colunas — colFinder por nome cobre.
 *
 * % de cotistas vêm POR TIPO (PF/PJ/banco/RPPS/EFPC…), já em escala 0-100.
 * Identidade nominal de cotista NÃO existe na fonte (limite legal). Valores em
 * decimal anglo (ponto) — parseValorBR cobre.
 */
import { carregarCSV, colFinder, flushUpsert, finalizar, sb, type IngestResult } from "./ingest-util.js";
import { parseValorBR, normCNPJ } from "./csv.js";
import { type SupabaseClient } from "@supabase/supabase-js";

const intFrom = (v: string): number | null => {
  const n = parseValorBR(v);
  return n == null ? null : Math.round(n);
};

export async function ingestFipInforme(
  resourceUrl: string,
  fonte: "trimestral" | "quadrimestral",
  client: SupabaseClient,
  nodes: Map<string, string>,
): Promise<IngestResult> {
  const erros: string[] = [];
  let header: string[] = [];
  let linhas: string[][] = [];
  try {
    ({ header, linhas } = await carregarCSV(resourceUrl, "latin1"));
  } catch (e) {
    return { status: "erro", total: 0, inseridos: 0, header, erros: [`carga ${resourceUrl}: ${e instanceof Error ? e.message : e}`] };
  }
  const c = colFinder(header);
  const C = {
    cnpj: c("cnpj_fundo_classe", "cnpj_fundo"),
    denom: c("denom_social"),
    tipo: c("tp_fundo_classe"),
    classe: c("classe_cota"),
    dt: c("dt_comptc"),
    pl: c("vl_patrim_liq"),
    qtCota: c("qt_cota", "qt_cota_integr"),
    vlCota: c("vl_patrim_cota", "vl_quota_classe"),
    nrCotst: c("nr_total_cotst_subscr", "nr_cotst"),
    capCompr: c("vl_cap_comprom"),
    capIntegr: c("vl_cap_integr"),
    prPf: c("pr_cota_subscr_pf"),
    prPjNfin: c("pr_cota_subscr_pj_nao_financ"),
    prBanco: c("pr_cota_subscr_banco"),
    prPjFin: c("pr_cota_subscr_pj_financ"),
    prRpps: c("pr_cota_subscr_rpps"),
    prEfpc: c("pr_cota_subscr_efpc"),
  };
  const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");
  let inseridos = 0;
  let buffer: Record<string, unknown>[] = [];
  for (const l of linhas) {
    const cnpj = normCNPJ(at(l, C.cnpj));
    const dt = at(l, C.dt);
    if (!cnpj || !dt) continue;
    const denom = at(l, C.denom) || null;
    if (denom && !nodes.has(cnpj)) nodes.set(cnpj, denom);
    buffer.push({
      cnpj_norm: cnpj,
      denom,
      tipo: at(l, C.tipo) || "FIP",
      classe_cota: at(l, C.classe) || null,
      dt_comptc: dt.slice(0, 10),
      vl_patrim_liq: parseValorBR(at(l, C.pl)),
      qt_cota: parseValorBR(at(l, C.qtCota)),
      vl_patrim_cota: parseValorBR(at(l, C.vlCota)),
      nr_cotst: intFrom(at(l, C.nrCotst)),
      vl_cap_compr: parseValorBR(at(l, C.capCompr)),
      vl_cap_integr: parseValorBR(at(l, C.capIntegr)),
      pr_pf: parseValorBR(at(l, C.prPf)),
      pr_pj_nfin: parseValorBR(at(l, C.prPjNfin)),
      pr_banco: parseValorBR(at(l, C.prBanco)),
      pr_pj_fin: parseValorBR(at(l, C.prPjFin)),
      pr_rpps: parseValorBR(at(l, C.prRpps)),
      pr_efpc: parseValorBR(at(l, C.prEfpc)),
      fonte,
    });
    if (buffer.length >= 500) { inseridos += await flushUpsert(client, "cvm_fip_informe", "cnpj_norm,classe_cota,dt_comptc", buffer, erros); buffer = []; }
  }
  inseridos += await flushUpsert(client, "cvm_fip_informe", "cnpj_norm,classe_cota,dt_comptc", buffer, erros);
  return finalizar(linhas.length, inseridos, erros, header);
}

/** Garante nós em cvm_fundo pros FIPs vistos (não sobrescreve dados do cad_fi). */
export async function upsertNodesFip(client: SupabaseClient, nodes: Map<string, string>, erros: string[]): Promise<number> {
  const rows = [...nodes].map(([cnpj_norm, denom]) => ({ cnpj_norm, denom, tipo: "FIP", fonte: "fip_informe" }));
  let n = 0;
  for (let i = 0; i < rows.length; i += 500) {
    n += await flushUpsert(client, "cvm_fundo", "cnpj_norm", rows.slice(i, i + 500), erros);
  }
  return n;
}

export function novoClient(): SupabaseClient { return sb(); }
