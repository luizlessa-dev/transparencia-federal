/**
 * ask-fundacoes — Edge Function
 *
 * Caixa de pesquisa em linguagem natural sobre fundações partidárias.
 * Padrão: pergunta → Claude gera SQL → exec_readonly_query → Claude narra resultado.
 *
 * Secrets necessários (configurar via Supabase Dashboard ou supabase secrets set):
 *   ANTHROPIC_API_KEY   — Claude API
 *   SUPABASE_URL        — automático em edge functions
 *   SUPABASE_SERVICE_ROLE_KEY — automático em edge functions
 *
 * POST /ask-fundacoes
 *   Body: { question: string }
 *   Response: { ok: boolean, resposta: string, sql?: string, dados?: unknown[], cache_hit?: boolean }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_KEY  = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

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

// ─────────────────────────────────────────────────────────────────────────────
// Schema descritivo para o Claude — apenas as tabelas relevantes para fundações
// ─────────────────────────────────────────────────────────────────────────────
const SCHEMA_CONTEXT = `
Você é um analista de dados do The BR Insider, especializado em transparência política brasileira.
Responda SOMENTE com base nos dados retornados pela query SQL.

## Tabelas disponíveis

### fundacoes_partidarias
Cadastro das 25 fundações e institutos partidários (exercício 2024).
Colunas relevantes:
  cnpj text                    — CNPJ da fundação (14 dígitos, sem pontuação)
  nome_popular text            — Nome divulgado (ex: "Fundação Perseu Abramo")
  razao_social text            — Razão social na Receita Federal
  partido_sigla text           — Sigla do partido (ex: "PL", "PT", "UNIÃO")
  partido_cnpj text            — CNPJ do partido
  municipio text, uf text      — Sede
  presidente_nome text         — Nome do presidente (QSA Receita Federal)
  presidente_desde date        — Data de entrada na presidência
  mesmo_endereco_partido bool  — Sede física coincide com o partido?
  mesmo_telefone_partido bool  — Telefone coincide com o partido?
  data_abertura date           — Data de fundação
  capital_social numeric       — Capital social (maioria: R$ 0)
  natureza_juridica text       — "Fundação Privada", "Associação Privada" etc.

### fundacoes_repasses
Repasses individuais de partido → fundação (fonte: dataset TSE 2024).
Colunas relevantes:
  sq_despesa bigint            — ID único do repasse no TSE
  aa_exercicio smallint        — Ano (2024)
  sg_partido text              — Sigla do partido remetente
  cnpj_fundacao text           — CNPJ da fundação destinatária
  nm_fundacao text             — Nome da fundação
  ds_gasto text                — Descrição TSE do gasto
  tipo_repasse text            — 'fundacao_partidaria' | 'aluguel' | 'servico' | 'outros'
  dt_pagamento date            — Data do pagamento
  vr_pagamento numeric         — Valor pago (R$)
  ds_fonte_despesa text        — "Fundo Partidário" ou similar

### fundacoes_resumo (VIEW)
Agregado por fundação por exercício — USE ESTA PARA TOTAIS E RANKINGS.
NÃO tem colunas de endereço (municipio, uf, logradouro) — use fundacoes_ranking_publico para isso.
Colunas disponíveis APENAS:
  cnpj_fundacao, nome_popular, razao_social, sg_partido, aa_exercicio
  qtd_repasses int             — Nº de transferências no ano
  total_repassado numeric      — Total em R$
  media_por_repasse numeric
  total_fundacao_partidaria numeric
  total_aluguel numeric        — Aluguel pago pelo partido à sua fundação
  total_servico numeric
  meses_com_repasse int        — Meses do ano com ao menos um repasse
  total_q4 numeric             — Total out+nov+dez
  pct_q4 numeric               — % do total concentrado no Q4
  mesmo_endereco_partido bool
  presidente_nome text

### fundacoes_alertas (VIEW)
Sinais de risco consolidados por fundação + exercício.
Colunas:
  cnpj, nome_popular, partido_sigla, presidente_nome
  alerta_sede_compartilhada bool    — sede == partido
  alerta_aluguel_circular bool      — partido paga aluguel à fundação
  valor_aluguel_anual numeric
  alerta_concentracao_q4 bool       — > 40% do repasse no Q4
  pct_q4 numeric
  alerta_natureza_juridica_suspeita bool  — não é fundação/instituto de direito
  total_repassado numeric
  score_alertas int                 — 0 a 4

### fundacoes_ranking_publico (VIEW)
Visão consolidada para exibição. Colunas principais:
  cnpj, nome_popular, partido_sigla, presidente_nome, presidente_desde
  municipio, uf, data_abertura
  mesmo_endereco_partido bool, mesmo_telefone_partido bool
  total_repassado_2024 numeric, qtd_repasses_2024 int
  total_aluguel_2024 numeric, pct_q4_2024 numeric
  score_alertas int

## Regras de geração de SQL
1. Use SOMENTE as tabelas/views acima.
2. Para totais e rankings, use sempre fundacoes_resumo ou fundacoes_ranking_publico.
3. Para detalhe de repasses individuais, use fundacoes_repasses.
4. Números monetários: FORMAT como R$ com separador de milhar.
5. Limite máximo: 50 linhas.
6. NUNCA use: INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, EXECUTE.
7. Se a pergunta não puder ser respondida com estas tabelas, retorne SQL vazio.
`.trim()

// ─────────────────────────────────────────────────────────────────────────────
// Validação defensiva do SQL gerado
// ─────────────────────────────────────────────────────────────────────────────
const TABELAS_PERMITIDAS = new Set([
  'fundacoes_partidarias',
  'fundacoes_repasses',
  'fundacoes_resumo',
  'fundacoes_alertas',
  'fundacoes_ranking_publico',
  'fundacoes_embeddings',
])

const KEYWORDS_PROIBIDAS = /\b(insert|update|delete|drop|create|alter|truncate|execute|pg_|information_schema|supabase_|auth\.)\b/i

function validarSQL(sql: string): { ok: boolean; motivo?: string } {
  if (KEYWORDS_PROIBIDAS.test(sql)) return { ok: false, motivo: 'keyword proibida' }
  const tabelasUsadas = sql.match(/\bfrom\s+(\w+)/gi) ?? []
  for (const t of tabelasUsadas) {
    const nome = t.replace(/^from\s+/i, '').toLowerCase()
    if (nome && !TABELAS_PERMITIDAS.has(nome)) {
      return { ok: false, motivo: `tabela não permitida: ${nome}` }
    }
  }
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chamada ao Claude
// ─────────────────────────────────────────────────────────────────────────────
async function chamarClaude(messages: Array<{ role: string; content: string }>, maxTokens = 1024): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: maxTokens,
      system: SCHEMA_CONTEXT,
      messages,
    }),
  })
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`)
  const d = await res.json() as { content: Array<{ text: string }> }
  return d.content[0]?.text ?? ''
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler principal
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, erro: 'Método não permitido' }, 405)

  if (!ANTHROPIC_KEY) return json({ ok: false, erro: 'ANTHROPIC_API_KEY não configurada' }, 500)

  let question: string
  try {
    const body = await req.json() as { question?: string }
    question = (body.question ?? '').trim()
  } catch {
    return json({ ok: false, erro: 'JSON inválido' }, 400)
  }

  if (!question) return json({ ok: false, erro: 'Pergunta vazia' }, 400)
  if (question.length > 600) return json({ ok: false, erro: 'Pergunta muito longa (máx 600 chars)' }, 400)

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  // ── Cache lookup ──────────────────────────────────────────────────────────
  const hash = btoa(encodeURIComponent(question)).slice(0, 64)
  const { data: cached } = await sb.from('ask_cache')
    .select('resposta_narrativa, sql_executado, resultado')
    .eq('pergunta_hash', hash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (cached) {
    await sb.from('ask_cache').update({ hit_count: sb.rpc('ask_cache_increment_hits', { hash }) })
      .eq('pergunta_hash', hash)
    return json({
      ok: true,
      resposta: cached.resposta_narrativa,
      sql: cached.sql_executado,
      dados: cached.resultado,
      cache_hit: true,
    })
  }

  const t0 = Date.now()

  try {
    // ── Passo 1: pergunta → SQL ───────────────────────────────────────────
    const sqlBruto = await chamarClaude([{
      role: 'user',
      content: `Gere um SQL SELECT para responder: "${question}"\n\nRetorne SOMENTE o SQL, sem markdown, sem explicação.`,
    }], 512)

    const sql = sqlBruto.replace(/```sql\n?/gi, '').replace(/```\n?/g, '').trim()

    if (!sql || sql.length < 10) {
      return json({ ok: false, erro: 'Não consegui gerar uma consulta para essa pergunta.' })
    }

    const validacao = validarSQL(sql)
    if (!validacao.ok) {
      return json({ ok: false, erro: `SQL inválido: ${validacao.motivo}` }, 400)
    }

    // ── Passo 2: executar SQL ─────────────────────────────────────────────
    const { data: dados, error: sqlErr } = await sb.rpc('exec_readonly_query', { sql_query: sql })
    if (sqlErr) {
      return json({ ok: false, erro: `Erro na consulta: ${sqlErr.message}` }, 500)
    }

    const dadosArray = Array.isArray(dados) ? dados : (dados ? [dados] : [])

    // ── Passo 3: dados → narrativa ────────────────────────────────────────
    const narrativa = await chamarClaude([
      {
        role: 'user',
        content: `Pergunta original: "${question}"\n\nResultado da consulta:\n${JSON.stringify(dadosArray, null, 2)}\n\nEscreva uma resposta jornalística direta em português, em 2-4 parágrafos. Cite valores com R$ e formatação brasileira. Seja preciso — use apenas os dados fornecidos.`,
      },
    ], 1024)

    const latencia = Date.now() - t0

    // ── Passo 4: cachear ──────────────────────────────────────────────────
    await sb.from('ask_cache').upsert({
      pergunta_hash:      hash,
      pergunta_original:  question,
      sql_executado:      sql,
      resultado:          dadosArray,
      resposta_narrativa: narrativa,
      tabelas_usadas:     ['fundacoes_partidarias', 'fundacoes_repasses'],
      custo_estimado_usd: 0.003, // estimativa conservadora
      expires_at:         new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    }, { onConflict: 'pergunta_hash' })

    // Log
    await sb.from('ask_log').insert({
      pergunta_original:  question,
      pergunta_hash:      hash,
      cache_hit:          false,
      success:            true,
      latencia_ms:        latencia,
    })

    return json({ ok: true, resposta: narrativa, sql, dados: dadosArray, cache_hit: false })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    await sb.from('ask_log').insert({
      pergunta_original: question,
      pergunta_hash:     hash,
      cache_hit:         false,
      success:           false,
      erro:              msg,
      latencia_ms:       Date.now() - t0,
    })
    return json({ ok: false, erro: msg }, 500)
  }
})
