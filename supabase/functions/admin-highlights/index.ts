/**
 * admin-highlights — CRUD de highlights curados
 *
 * Autenticação: Authorization: Bearer <ADMIN_SECRET>
 *
 * GET    /admin-highlights          → lista todos (incluindo inativos)
 * POST   /admin-highlights          → cria novo highlight
 * PUT    /admin-highlights?id=<id>  → atualiza highlight
 * DELETE /admin-highlights?id=<id>  → remove highlight
 * GET    /admin-highlights?ping=1   → valida senha (retorna {ok:true})
 *
 * Body do POST/PUT aceita o formato legado (`tribunal: "STF"`) e o canônico
 * (`tribunal_id: 1`). Se vier `tribunal` como string, é resolvido pra
 * tribunal_id antes do insert/update.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { carregarTribunais, type TribunalInfo } from '../_shared/tribunais.ts'

const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function unauthorized() {
  return json({ error: 'Senha incorreta' }, 401)
}

function err(msg: string, status = 500) {
  return json({ error: msg }, status)
}

/**
 * Aceita body legado (tribunal: "STF") ou canônico (tribunal_id: 1).
 * Sempre devolve com tribunal_id; remove `tribunal` se veio como string.
 */
function normalizarTribunal(
  body: Record<string, unknown>,
  cache: Map<string, TribunalInfo>,
): Record<string, unknown> {
  const normalized = { ...body }
  if (typeof normalized.tribunal === 'string') {
    const sigla = (normalized.tribunal as string).toUpperCase()
    const t = cache.get(sigla)
    if (!t) {
      throw new Error(`Tribunal "${sigla}" não existe em public.tribunais.`)
    }
    normalized.tribunal_id = t.id
    delete normalized.tribunal
  } else if (normalized.tribunal === null) {
    // Highlight sem tribunal específico — explicit null permitido
    normalized.tribunal_id = null
    delete normalized.tribunal
  }
  return normalized
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!ADMIN_SECRET || token !== ADMIN_SECRET) return unauthorized()

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const ping = url.searchParams.get('ping')

  if (ping) return json({ ok: true })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // GET — listar todos (com sigla do tribunal pra UI legada)
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('judiciario_highlights')
      .select('*, tribunais(sigla)')
      .order('semana_referencia', { ascending: false })
      .order('posicao', { ascending: true })

    if (error) return err(error.message)

    // Flatten: substitui objeto `tribunais` por string `tribunal` (compat front)
    const flat = (data ?? []).map((h: Record<string, unknown>) => {
      const t = h.tribunais as { sigla: string } | null | undefined
      const { tribunais: _drop, ...rest } = h
      return { ...rest, tribunal: t?.sigla ?? null }
    })

    return json(flat)
  }

  // POST — criar
  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    if (!body) return err('Body inválido', 400)

    try {
      const cache = await carregarTribunais(supabase)
      const normalized = normalizarTribunal(body as Record<string, unknown>, cache)

      const { data, error } = await supabase
        .from('judiciario_highlights')
        .insert(normalized)
        .select()
        .single()
      if (error) return err(error.message)
      return json(data, 201)
    } catch (e) {
      return err(String(e), 400)
    }
  }

  // PUT — atualizar
  if (req.method === 'PUT') {
    if (!id) return err('Parâmetro id obrigatório', 400)
    const body = await req.json().catch(() => null)
    if (!body) return err('Body inválido', 400)

    const updates = { ...(body as Record<string, unknown>) }
    delete updates.id
    delete updates.created_at

    try {
      const cache = await carregarTribunais(supabase)
      const normalized = normalizarTribunal(updates, cache)

      const { data, error } = await supabase
        .from('judiciario_highlights')
        .update(normalized)
        .eq('id', id)
        .select()
        .single()

      if (error) return err(error.message)
      return json(data)
    } catch (e) {
      return err(String(e), 400)
    }
  }

  // DELETE — remover
  if (req.method === 'DELETE') {
    if (!id) return err('Parâmetro id obrigatório', 400)
    const { error } = await supabase.from('judiciario_highlights').delete().eq('id', id)
    if (error) return err(error.message)
    return json({ deleted: id })
  }

  return err('Método não suportado', 405)
})
