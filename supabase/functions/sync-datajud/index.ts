/**
 * sync-datajud — Ingestão genérica via DataJud CNJ
 *
 * Suporta qualquer tribunal disponível na API pública do DataJud.
 * Usa janelas SEMANAIS para superar o limite de 10k registros/query.
 *
 * Parâmetros via POST body:
 *   tribunal        — código do tribunal (ex: "STJ", "TRF1", "TJSP")
 *   weeksBack       — quantas semanas atrás buscar (default 12)
 *   startWeekOffset — semana inicial (0 = mais recente, para paginação externa)
 *   maxPages        — páginas por semana (default 100 = 10k registros)
 *   pageSize        — tamanho da página (default 100, máx 100)
 *   classeFilter    — filtrar por classe específica (ex: "Recurso Especial")
 *
 * Action especial:
 *   { "action": "refresh_stats" } — só roda refresh_judiciario_stats()
 *
 * Env vars necessárias:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DATAJUD_API_KEY  ← antes hardcoded, agora obrigatório no projeto Supabase
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  carregarTribunais,
  resolverTribunalId,
  type TribunalInfo,
} from '../_shared/tribunais.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const DATAJUD_KEY = Deno.env.get('DATAJUD_API_KEY') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fixEncoding(str: string | undefined): string {
  if (!str) return ''
  if (!/Ã/.test(str)) return str
  try {
    const bytes = new Uint8Array(str.split('').map((c) => c.charCodeAt(0)))
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return str
  }
}

/** Extrai nome do relator de diferentes formatos de tribunal */
function extractRelator(
  src: Record<string, unknown>,
  _tribunalCode: string,
): string | null {
  const relatorDireto = fixEncoding(
    (src.relator as Record<string, string> | undefined)?.nome,
  )
  if (relatorDireto) return relatorDireto

  const orgaoNome = fixEncoding(
    (src.orgaoJulgador as Record<string, string> | undefined)?.nome ?? '',
  )
  const m = orgaoNome.match(
    /GABINETE\s+D[OA]\s+(?:MINISTRO|MINISTRA|JUIZ|JUÍZA|DESEMBARGADOR[A]?)(?:\s+CONVOCAD[OA])?\s+(.+)/i,
  )
  return m ? m[1].trim() : null
}

function buildWeeklyRanges(
  weeksBack: number,
  startOffset = 0,
): { gte: string; lte: string }[] {
  const ranges: { gte: string; lte: string }[] = []
  const now = new Date()

  for (let i = startOffset; i < startOffset + weeksBack; i++) {
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() - i * 7)

    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 6)

    const lte = endDate.toISOString().slice(0, 10)
    const gte = startDate.toISOString().slice(0, 10)
    ranges.push({ gte, lte })
  }
  return ranges
}

async function fetchPage(
  endpoint: string,
  dateRange: { gte: string; lte: string },
  from: number,
  size: number,
  classeFilter?: string,
): Promise<{ hits: unknown[]; total: number }> {
  const must: Record<string, unknown>[] = [
    {
      range: {
        dataHoraUltimaAtualizacao: { gte: dateRange.gte, lte: dateRange.lte },
      },
    },
  ]
  if (classeFilter) {
    must.push({ match_phrase: { 'classe.nome': classeFilter } })
  }

  const body = {
    query: { bool: { must } },
    sort: [{ dataHoraUltimaAtualizacao: { order: 'desc' } }],
    _source: [
      'numeroProcesso',
      'classe',
      'assuntos',
      'orgaoJulgador',
      'dataHoraUltimaAtualizacao',
      'movimentos',
      'relator',
    ],
    from,
    size,
  }

  const res = await fetch(`https://api-publica.datajud.cnj.jus.br/${endpoint}/_search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `APIKey ${DATAJUD_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DataJud HTTP ${res.status}: ${text.slice(0, 300)}`)
  }

  const json = await res.json()
  const hits = json?.hits?.hits ?? []
  const total = json?.hits?.total?.value ?? 0
  return { hits, total }
}

function mapHit(
  hit: Record<string, unknown>,
  tribunal: TribunalInfo,
): Record<string, unknown> | null {
  const src = hit._source as Record<string, unknown> | undefined
  if (!src) return null

  const numeroProcesso = fixEncoding(src.numeroProcesso as string)
  if (!numeroProcesso) return null

  const classeObj = src.classe as Record<string, unknown> | undefined
  const classe = fixEncoding(classeObj?.nome as string)

  const movimentos = (src.movimentos as Record<string, unknown>[] | undefined) ?? []
  const decisao = movimentos
    .filter((m) => {
      const nome = String((m.nome as string) ?? '').toLowerCase()
      return (
        nome.includes('acordao') ||
        nome.includes('acórdão') ||
        nome.includes('decisao') ||
        nome.includes('decisão') ||
        nome.includes('julgamento')
      )
    })
    .sort(
      (a, b) =>
        new Date(b.dataHora as string).getTime() -
        new Date(a.dataHora as string).getTime(),
    )[0]

  const dataDecisao = decisao
    ? String(decisao.dataHora as string).slice(0, 10)
    : (src.dataHoraUltimaAtualizacao as string | undefined)?.slice(0, 10) ?? null

  const orgaoNome = fixEncoding(
    (src.orgaoJulgador as Record<string, string> | undefined)?.nome,
  )
  const relator = extractRelator(src, tribunal.sigla)

  const assuntos = src.assuntos as Record<string, string>[] | undefined
  const tema = fixEncoding(assuntos?.[0]?.nome)

  return {
    tribunal_id: tribunal.id,
    classe,
    numero_processo: numeroProcesso,
    relator,
    orgao_julgador: orgaoNome,
    data_decisao: dataDecisao,
    tema,
    fonte: 'datajud',
    identificador_externo: `${tribunal.sigla.toLowerCase()}-${String(hit._id)}`,
    metadata: {
      assuntos: assuntos?.map((a) => a.nome).filter(Boolean) ?? [],
      classe_codigo: classeObj?.codigo ?? null,
    },
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  if (!DATAJUD_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: 'DATAJUD_API_KEY não configurada no projeto Supabase' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Action especial: refresh das 4 MVs canônicas
    if (body.action === 'refresh_stats') {
      const { error } = await supabase.rpc('refresh_judiciario_stats')
      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
        )
      }
      return new Response(
        JSON.stringify({ ok: true, action: 'refresh_judiciario_stats' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const tribunalSigla: string = (body.tribunal ?? 'STJ').toUpperCase()

    // Lookup canônico — endpoint vem da tabela tribunais (única fonte da verdade)
    const tribunalCache = await carregarTribunais(supabase)
    const tribunal = tribunalCache.get(tribunalSigla)

    if (!tribunal) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Tribunal "${tribunalSigla}" não está em public.tribunais.`,
        }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    if (!tribunal.endpoint_datajud) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Tribunal "${tribunalSigla}" não tem endpoint_datajud configurado (ex: TCU não usa DataJud).`,
        }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const weeksBack: number = body.weeksBack ?? 12
    const startWeekOffset: number = body.startWeekOffset ?? 0
    const maxPages: number = body.maxPages ?? 100
    const pageSize: number = Math.min(body.pageSize ?? 100, 100)
    const classeFilter: string | undefined = body.classeFilter

    const ranges = buildWeeklyRanges(weeksBack, startWeekOffset)

    let totalInserted = 0
    const errors: string[] = []

    for (const range of ranges) {
      let page = 0
      let rangeTotal = Infinity

      while (page < maxPages && page * pageSize < rangeTotal) {
        try {
          const { hits, total } = await fetchPage(
            tribunal.endpoint_datajud,
            range,
            page * pageSize,
            pageSize,
            classeFilter,
          )
          rangeTotal = Math.min(total, 10000)

          if (hits.length === 0) break

          const rows = (hits as Record<string, unknown>[])
            .map((h) => mapHit(h, tribunal))
            .filter(Boolean) as Record<string, unknown>[]

          if (rows.length > 0) {
            const { error } = await supabase
              .from('judiciario_processos')
              .upsert(rows, {
                onConflict: 'identificador_externo',
                ignoreDuplicates: false,
              })
            if (error) {
              errors.push(`${range.gte}~${range.lte}~p${page}: ${error.message}`)
            } else {
              totalInserted += rows.length
            }
          }

          page++

          if (hits.length === pageSize) {
            await new Promise((r) => setTimeout(r, 200))
          } else {
            break
          }
        } catch (err) {
          errors.push(`${range.gte}~p${page}: ${String(err)}`)
          break
        }
      }

      await new Promise((r) => setTimeout(r, 150))
    }

    return new Response(
      JSON.stringify({
        ok: true,
        tribunal: tribunal.sigla,
        endpoint: tribunal.endpoint_datajud,
        classeFilter: classeFilter ?? 'todas',
        weeksBack,
        startWeekOffset,
        inserted: totalInserted,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
