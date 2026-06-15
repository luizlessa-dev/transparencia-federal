import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

Deno.serve(async (req: Request) => {
  const { view } = await req.json().catch(() => ({})) as { view?: string }
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  // Usa exec_readonly não — precisa de DDL. Chama SQL direto via função que aceita queries arbitrárias.
  // Workaround: criar função específica por view
  const fnMap: Record<string, string> = {
    'ceap_dep':       'refresh_ask_ceap_dep',
    'ceap_forn':      'refresh_ask_ceap_forn',
    'ceap_tipo':      'refresh_ask_ceap_tipo',
    'emendas_autor':  'refresh_ask_emendas_autor',
    'all':            'refresh_ask_views',
  }

  const fn = fnMap[view ?? 'all'] ?? 'refresh_ask_views'
  const { error } = await sb.rpc(fn)

  return new Response(JSON.stringify({ ok: !error, fn, erro: error?.message ?? null }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
