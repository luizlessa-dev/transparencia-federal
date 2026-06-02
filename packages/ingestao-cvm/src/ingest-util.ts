/** Helpers compartilhados de ingestão (mesma família dos demais ingestao-*). */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchResourceText } from "./ckan-client.js";
import { parseCSV, mapColunas } from "./csv.js";

export function sb(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes (.env da raiz)");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function carregarCSV(
  url: string,
  encoding: "utf-8" | "latin1" = "latin1",
): Promise<{ header: string[]; linhas: string[][] }> {
  const txt = await fetchResourceText(url, encoding);
  return parseCSV(txt);
}

/** Resolvedor de coluna por nome (case/acento-insensitive), 1ª que existir. */
export function colFinder(header: string[]) {
  const idx = mapColunas(header);
  return (...cands: string[]) => {
    for (const c of cands) {
      const i = idx(c);
      if (i >= 0) return i;
    }
    return -1;
  };
}

/** Upsert de um lote; acumula erro em `erros` e devolve quantos foram enviados. */
export async function flushUpsert(
  client: SupabaseClient,
  tabela: string,
  onConflict: string,
  buffer: Record<string, unknown>[],
  erros: string[],
): Promise<number> {
  if (!buffer.length) return 0;
  const { error } = await client.from(tabela).upsert(buffer, { onConflict, ignoreDuplicates: true });
  if (error) {
    erros.push(`upsert ${tabela}: ${error.message}`);
    return 0;
  }
  return buffer.length;
}

export type IngestResult = {
  status: "ok" | "parcial" | "erro";
  total: number;
  inseridos: number;
  erros: string[];
  header: string[];
};

export function finalizar(total: number, inseridos: number, erros: string[], header: string[]): IngestResult {
  return { status: erros.length === 0 ? "ok" : inseridos > 0 ? "parcial" : "erro", total, inseridos, erros, header };
}

/** "S"/"N"/"SIM"/"NAO" → boolean | null. */
export function parseSN(v: string | undefined | null): boolean | null {
  const t = (v ?? "").trim().toUpperCase();
  if (t === "S" || t === "SIM") return true;
  if (t === "N" || t === "NAO" || t === "NÃO") return false;
  return null;
}
