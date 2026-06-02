/**
 * gerar-pauta-fundacao — Edge Function
 *
 * Recebe o CNPJ de uma fundação e gera um briefing jornalístico completo,
 * pronto para uso editorial. Consulta o banco direto para garantir dados atuais.
 *
 * POST /gerar-pauta-fundacao
 *   Body: { cnpj: string, ano?: number }
 *   Response: { ok: boolean, pauta: string, dados: object }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function fmtBRL(v: number): string {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(2)} bilhões`
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)} milhões`
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`
  return `R$ ${v.toLocaleString('pt-BR')}`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, erro: 'Método não permitido' }, 405)
  if (!ANTHROPIC_KEY) return json({ ok: false, erro: 'ANTHROPIC_API_KEY não configurada' }, 500)

  let cnpj: string, ano: number
  try {
    const body = await req.json() as { cnpj?: string; ano?: number }
    cnpj = (body.cnpj ?? '').replace(/\D/g, '')
    ano  = body.ano ?? 2024
  } catch {
    return json({ ok: false, erro: 'JSON inválido' }, 400)
  }

  if (!cnpj || cnpj.length !== 14) return json({ ok: false, erro: 'CNPJ inválido' }, 400)

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  // ── Coletar todos os dados da fundação ───────────────────────────────────
  const [{ data: perfil }, { data: resumo }, { data: alertas }, { data: repasses }] = await Promise.all([
    sb.from('fundacoes_partidarias').select('*').eq('cnpj', cnpj).maybeSingle(),
    sb.from('fundacoes_resumo').select('*').eq('cnpj_fundacao', cnpj).eq('aa_exercicio', ano).maybeSingle(),
    sb.from('fundacoes_alertas').select('*').eq('cnpj', cnpj).eq('aa_exercicio', ano).maybeSingle(),
    sb.from('fundacoes_repasses')
      .select('dt_pagamento, vr_pagamento, tipo_repasse, ds_gasto')
      .eq('cnpj_fundacao', cnpj).eq('aa_exercicio', ano)
      .order('dt_pagamento'),
  ])

  if (!perfil) return json({ ok: false, erro: 'Fundação não encontrada' }, 404)

  // Concentração Q4
  const totalQ4 = (repasses ?? [])
    .filter(r => {
      const m = parseInt(((r.dt_pagamento as string) ?? '').slice(5, 7), 10)
      return m >= 10
    })
    .reduce((s, r) => s + Number(r.vr_pagamento ?? 0), 0)

  const totalGeral = Number(resumo?.total_repassado ?? 0)
  const pctQ4 = totalGeral > 0 ? (totalQ4 / totalGeral * 100).toFixed(1) : '0'

  const totalAluguel = Number(resumo?.total_aluguel ?? 0)
  const qtdRepasses  = Number(resumo?.qtd_repasses ?? 0)
  const mesesAtivos  = Number(resumo?.meses_com_repasse ?? 0)

  const dados = {
    nome:            perfil.nome_popular ?? perfil.razao_social,
    partido:         perfil.partido_sigla,
    cnpj:            cnpj,
    presidente:      perfil.presidente_nome,
    presidente_desde: perfil.presidente_desde,
    municipio:       perfil.municipio,
    uf:              perfil.uf,
    mesmo_endereco:  perfil.mesmo_endereco_partido,
    mesmo_telefone:  perfil.mesmo_telefone_partido,
    total_repassado: totalGeral,
    qtd_repasses:    qtdRepasses,
    meses_ativos:    mesesAtivos,
    total_q4:        totalQ4,
    pct_q4:          parseFloat(pctQ4),
    total_aluguel:   totalAluguel,
    score_alertas:   alertas?.score_alertas ?? 0,
    ano,
  }

  // ── Prompt para Claude ───────────────────────────────────────────────────
  const promptSistema = `Você é um jornalista investigativo do The BR Insider especializado em transparência política e finanças partidárias. Escreva em português brasileiro. Use linguagem direta, objetiva e jornalística. Cite sempre valores e datas concretas. Não especule além dos dados fornecidos.`

  const promptUsuario = `Gere um BRIEFING JORNALÍSTICO completo sobre esta fundação partidária com base nos dados abaixo.

## Dados da fundação

- **Nome:** ${dados.nome}
- **Partido:** ${dados.partido}
- **CNPJ:** ${cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}
- **Presidente:** ${dados.presidente ?? 'Não identificado'} (desde ${dados.presidente_desde ?? '?'})
- **Sede:** ${dados.municipio}, ${dados.uf}
- **Sede coincide com a do partido:** ${dados.mesmo_endereco ? 'SIM' : 'Não'}
- **Telefone coincide com o do partido:** ${dados.mesmo_telefone ? 'SIM' : 'Não'}

## Repasses recebidos do partido (exercício ${ano})

- **Total:** ${fmtBRL(dados.total_repassado)} em ${dados.qtd_repasses} repasses
- **Meses com repasse:** ${dados.meses_ativos} de 12
- **Concentração no Q4 (out-dez):** ${fmtBRL(dados.total_q4)} (${dados.pct_q4}% do total anual)
- **Aluguel pago pelo partido à fundação:** ${dados.total_aluguel > 0 ? fmtBRL(dados.total_aluguel) : 'Nenhum identificado'}

## Alertas identificados (score ${dados.score_alertas}/4)

${dados.mesmo_endereco ? '⚠️ SEDE COMPARTILHADA: fundação e partido registrados no mesmo endereço e número.' : ''}
${dados.total_aluguel > 0 ? `⚠️ ALUGUEL CIRCULAR: partido paga ${fmtBRL(dados.total_aluguel)}/ano de aluguel à fundação que ele mesmo financia.` : ''}
${dados.pct_q4 > 40 ? `⚠️ CONCENTRAÇÃO Q4: ${dados.pct_q4}% dos repasses foram nos últimos 3 meses do ano — padrão de acúmulo de caixa pré-eleitoral.` : ''}

## Estrutura do briefing solicitado

Gere o briefing com exatamente estas 5 seções:

### 1. MANCHETE SUGERIDA
Uma frase de manchete impactante (máx. 120 caracteres).

### 2. LEAD (2 parágrafos)
Quem, o quê, quando, quanto — os fatos mais relevantes em ordem de impacto.

### 3. CONTEXTO (1 parágrafo)
O que é uma fundação partidária, o mínimo legal de 20% do Fundo Partidário, e por que isso importa.

### 4. OS ALERTAS EM DETALHE (por tópico)
Desenvolva cada alerta identificado com os números exatos. Se não houver alertas, diga "Nenhum alerta identificado neste exercício."

### 5. O QUE INVESTIGAR A SEGUIR (lista de 3-5 perguntas)
Perguntas específicas que um jornalista deveria fazer ao partido e à fundação, com base nos dados.

Não adicione conclusões além do que os dados mostram. Não use o termo "suspeito" sem base factual.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: promptSistema,
      messages: [{ role: 'user', content: promptUsuario }],
    }),
  })

  if (!res.ok) return json({ ok: false, erro: `Anthropic API ${res.status}` }, 500)
  const d = await res.json() as { content: Array<{ text: string }> }
  const pauta = d.content[0]?.text ?? ''

  return json({ ok: true, pauta, dados })
})
