/**
 * Serviços da API pública — uso apenas destes no frontend.
 * Ref: docs/04-API-PUBLICA.md
 */

import { apiGet, type ApiResult } from "./client.js";
import type { RankingItem, Parlamentar, CoberturaItem, MetodologiaResponse } from "./types.js";

/** GET ranking (opcional: ?ano=YYYY) */
export async function getRanking(ano?: number): Promise<ApiResult<RankingItem[]>> {
  const params = ano != null ? { ano: String(ano) } : undefined;
  return apiGet<RankingItem[]>("/ranking", params);
}

/** GET parlamentar/:id */
export async function getParlamentar(id: string): Promise<ApiResult<Parlamentar | null>> {
  const res = await apiGet<Parlamentar | null>(`/parlamentar/${encodeURIComponent(id)}`);
  if (res.ok && res.data === null) {
    return { ok: false, error: "Parlamentar não encontrado", status: 404 };
  }
  return res;
}

/** GET cobertura (ou /status) */
export async function getCobertura(): Promise<ApiResult<CoberturaItem[]>> {
  const res = await apiGet<CoberturaItem[]>("/cobertura");
  if (res.ok) return res;
  const fallback = await apiGet<CoberturaItem[]>("/status");
  return fallback;
}

/** GET metodologia */
export async function getMetodologia(): Promise<ApiResult<MetodologiaResponse>> {
  return apiGet<MetodologiaResponse>("/metodologia");
}

export type { RankingItem, Parlamentar, CoberturaItem, MetodologiaResponse, ApiResult };
export { apiGet } from "./client.js";
