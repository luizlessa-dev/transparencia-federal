/**
 * Helper compartilhado entre os edge functions sync-* / admin-highlights.
 *
 * Centraliza:
 *   - lookup sigla → tribunal_id (FK em judiciario_processos / judiciario_highlights)
 *   - lookup sigla → endpoint DataJud (fonte da verdade é a coluna
 *     `tribunais.endpoint_datajud`, não mais um Record hardcoded em cada sync).
 *
 * Cache no escopo do request; cada invocação faz 1 round-trip ao Supabase.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface TribunalInfo {
  id: number
  sigla: string
  endpoint_datajud: string | null
  categoria: string
}

/** Carrega lookup completo de tribunais. Lança erro se a tabela estiver vazia. */
export async function carregarTribunais(
  supabase: SupabaseClient,
): Promise<Map<string, TribunalInfo>> {
  const { data, error } = await supabase
    .from('tribunais')
    .select('id, sigla, endpoint_datajud, categoria')
    .eq('ativo', true)

  if (error) throw new Error(`Falha ao carregar tribunais: ${error.message}`)
  if (!data || data.length === 0) {
    throw new Error('Tabela tribunais vazia — aplicou a migration canônica?')
  }

  return new Map(data.map((t) => [t.sigla.toUpperCase(), t as TribunalInfo]))
}

/** Retorna tribunal_id para a sigla, ou lança erro se desconhecida. */
export function resolverTribunalId(
  cache: Map<string, TribunalInfo>,
  sigla: string,
): number {
  const t = cache.get(sigla.toUpperCase())
  if (!t) throw new Error(`Tribunal "${sigla}" não está em public.tribunais`)
  return t.id
}
