/**
 * sync-tcu — Ingestão de Acórdãos do TCU
 *
 * Usa API pública: pesquisa.apps.tcu.gov.br/rest/publico/base/acordao-completo/documentosResumidos
 * Sem autenticação, paginação por `inicio` (offset), filtro por ANOACORDAO.
 *
 * Parâmetros aceitos via POST body:
 *   year        — ano do acórdão (default: ano atual)
 *   startOffset — início da paginação (default: 0)
 *   maxRecords  — máximo de registros a buscar no call (default: 3000)
 *   pageSize    — tamanho da página (default: 100, máx: 200)
 *
 * Escreve em public.judiciario_processos (tribunal_id resolvido via tabela `tribunais`).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { carregarTribunais, resolverTribunalId } from '../_shared/tribunais.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const TCU_API =
  'https://pesquisa.apps.tcu.gov.br/rest/publico/base/acordao-completo/documentosResumidos'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseBRDate(d: string | undefined): string | null {
  if (!d) return null
  const parts = d.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

async function fetchPage(
  year: number,
  inicio: number,
  pageSize: number,
): Promise<{ documentos: Record<string, unknown>[]; total: number }> {
  const params = new URLSearchParams({
    termo: '*',
    filtro: `ANOACORDAO:${year}`,
    ordenacao: 'NUMACORDAOINT desc,COPIACOLEGIADO desc',
    quantidade: String(pageSize),
    inicio: String(inicio),
  })

  const res = await fetch(`${TCU_API}?${params}`, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'todas-bases': 'false',
      origem: 'angular',
      user: '',
      uuid: crypto.randomUUID(),
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`TCU API HTTP ${res.status}: ${text.slice(0, 300)}`)
  }

  const json = await res.json()
  const documentos = (json?.documentos ?? []) as Record<string, unknown>[]
  const total = (json?.quantidadeEncontrada as number) ?? 0
  return { documentos, total }
}

function mapDoc(
  doc: Record<string, unknown>,
  tcuId: number,
): Record<string, unknown> | null {
  const key = doc.KEY as string
  if (!key) return null

  const numAcordao = doc.NUMACORDAO as string | undefined
  const anoAcordao = doc.ANOACORDAO as string | undefined
  const numeroProcesso = numAcordao && anoAcordao ? `${numAcordao}/${anoAcordao}` : null
  if (!numeroProcesso) return null

  const dataDecisao = parseBRDate(doc.DATASESSAO as string | undefined)

  return {
    tribunal_id: tcuId,
    classe: (doc.TIPO as string) ?? null,
    numero_processo: numeroProcesso,
    relator: (doc.RELATOR as string) ?? null,
    orgao_julgador: (doc.COLEGIADO as string) ?? null,
    tipo_decisao: (doc.TIPO as string) ?? null,
    data_decisao: dataDecisao,
    link_oficial: (doc.URLARQUIVOPDF as string) ?? null,
    fonte: 'pesquisa_tcu',
    identificador_externo: `tcu-${key}`,
    metadata: {
      numata: doc.NUMATA ?? null,
      proc: doc.PROC ?? null,
      situacao: doc.SITUACAO ?? null,
      dtatualizacao: doc.DTATUALIZACAO ?? null,
    },
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}

    const currentYear = new Date().getFullYear()
    const year: number = body.year ?? currentYear
    const startOffset: number = body.startOffset ?? 0
    const maxRecords: number = body.maxRecords ?? 3000
    const pageSize: number = Math.min(body.pageSize ?? 100, 200)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Resolve tribunal_id pra TCU uma vez (não muda durante o request)
    const tribunalCache = await carregarTribunais(supabase)
    const tcuId = resolverTribunalId(tribunalCache, 'TCU')

    let totalInserted = 0
    const errors: string[] = []
    let inicio = startOffset
    let apiTotal = Infinity
    const maxInicio = startOffset + maxRecords

    while (inicio < maxInicio && inicio < apiTotal) {
      try {
        const { documentos, total } = await fetchPage(year, inicio, pageSize)
        apiTotal = total

        if (documentos.length === 0) break

        const rows = documentos
          .map((d) => mapDoc(d, tcuId))
          .filter(Boolean) as Record<string, unknown>[]

        if (rows.length > 0) {
          const { error } = await supabase
            .from('judiciario_processos')
            .upsert(rows, {
              onConflict: 'identificador_externo',
              ignoreDuplicates: false,
            })
          if (error) {
            errors.push(`inicio=${inicio}: ${error.message}`)
          } else {
            totalInserted += rows.length
          }
        }

        inicio += pageSize

        if (documentos.length === pageSize) {
          await new Promise((r) => setTimeout(r, 250))
        } else {
          break
        }
      } catch (err) {
        errors.push(`inicio=${inicio}: ${String(err)}`)
        break
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        tribunal: 'TCU',
        year,
        startOffset,
        nextOffset: inicio,
        apiTotal,
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
