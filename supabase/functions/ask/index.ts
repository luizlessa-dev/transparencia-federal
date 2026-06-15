/**
 * ask — Edge Function
 *
 * Caixa de pesquisa em linguagem natural sobre dados do Congresso Nacional.
 * Padrão: pergunta → Claude gera SQL → exec_readonly_query → Claude narra resultado.
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

const SCHEMA_CONTEXT = `
Você é um analista de dados do The BR Insider, especializado em transparência política brasileira.
Responda SOMENTE com base nos dados retornados pela query SQL.
Seja direto, jornalístico e preciso. Use formatação brasileira (R$, separador de milhar com ponto).

## Tabelas e views disponíveis

### ask_ceap_deputado_ano_agg (VIEW MATERIALIZADA — USE PARA RANKINGS DE GASTOS DE GABINETE)
Gastos CEAP agregados por deputado e ano.
Colunas: deputado_id_externo text, nome text, sigla_partido text, sigla_uf text, ano int,
  total_transacoes bigint, total_valor numeric, passagens numeric, combustivel numeric,
  divulgacao numeric, locacao_veiculos numeric

### ceaps_brutas (tabela detalhada — USE PARA DETALHE OU FORNECEDORES)
Gastos CEAP individuais dos deputados.
Colunas: deputado_id_externo text, deputado_nome text, sigla_partido text, sigla_uf text,
  ano int, mes int, tipo_despesa text, nome_fornecedor text, cnpj_cpf_fornecedor text, valor_liquido numeric

### ask_emendas_autor_ano_agg (VIEW MATERIALIZADA — USE PARA RANKINGS DE EMENDAS)
Emendas parlamentares agregadas por autor e ano.
Colunas: autor_nome text, uf text, ano int, tipo_emenda text,
  total_emendas bigint, total_empenhado numeric, total_pago numeric,
  total_rp9 bigint, valor_rp9_pago numeric

### emendas_completas (tabela detalhada — USE PARA BENEFICIÁRIOS E DETALHE)
Todas as emendas parlamentares 2015–2026.
Colunas: autor_nome text, uf text, ano int, tipo_emenda text, eh_rp9 boolean,
  cnpj_favorecido text, nome_favorecido text, municipio text, valor_empenhado numeric,
  valor_pago numeric, orgao_executor text

### emendas_favorecidos (tabela)
Favorecidos de emendas por CNPJ.
Colunas: cnpj text, nome_favorecido text, municipio text, uf text,
  ano int, total_recebido numeric, qtd_emendas int, autor_nome text

### portal_sancionados (tabela)
Empresas e pessoas físicas sancionadas (CEIS + CNEP).
Colunas: cnpj_cpf text, nome text, tipo_pessoa text, tipo_sancao text,
  orgao_sancionador text, data_inicio_sancao date, data_fim_sancao date, valor_multa numeric

### cam_parlamentar_risco (tabela)
Perfil completo dos deputados com score de risco.
Colunas: deputado_id int, nome text, sigla_partido text, sigla_uf text, cpf text,
  score_risco numeric, rank_ceap int, rank_rp9 int, total_legislaturas int,
  total_frentes int, total_comissoes int, patrimonio_declarado numeric

### tse_bens_agg (tabela — patrimônio TSE)
Colunas: cpf text, nome_candidato text, sg_partido text, sg_uf text,
  ano_eleicao int, total_bens numeric, qtd_bens int

### tse_candidatos_receitas_agg (tabela — financiamento de campanha)
Colunas: cpf_candidato text, nome_candidato text, sg_partido text, sg_uf text,
  ano_eleicao int, total_arrecadado numeric, qtd_doadores int

## Regras
1. Use SOMENTE as tabelas/views listadas acima.
2. Para rankings de gastos CEAP, prefira ask_ceap_deputado_ano_agg.
3. Para rankings de emendas, prefira ask_emendas_autor_ano_agg.
4. Para sancionados x emendas, junte emendas_favorecidos com portal_sancionados por cnpj/cnpj_cpf.
5. LIMIT padrão 10 para rankings, máximo 50.
6. NUNCA use: INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, EXECUTE.
7. Se a pergunta não puder ser respondida com estas tabelas, retorne string vazia.
`.trim()

const TABELAS_PERMITIDAS = new Set([
  'ask_ceap_deputado_ano_agg', 'ask_ceap_fornecedor_agg', 'ask_ceap_tipo_ano_agg',
  'ask_emendas_autor_ano_agg', 'ceaps_brutas', 'ceaps_ranking', 'ceaps_senado',
  'emendas_completas', 'emendas_favorecidos', 'portal_sancionados',
  'cam_parlamentar_risco', 'tse_bens_agg', 'tse_bens_candidatos',
  'tse_candidatos_receitas_agg',
])

const KEYWORDS_PROIBIDAS = /\b(insert|update|delete|drop|create|alter|truncate|execute|pg_|information_schema|supabase_|auth\.)\b/i

function validarSQL(sql: string): boolean {
  if (KEYWORDS_PROIBIDAS.test(sql)) return false
  const matches = sql.match(/\bfrom\s+(\w+)/gi) ?? []
  for (const m of matches) {
    const nome = m.replace(/^from\s+/i, '').toLowerCase()
    if (nome && !TABELAS_PERMITIDAS.has(nome)) return false
  }
  return true
}

async function chamarClaude(messages: Array<{ role: string; content: string }>, maxTokens = 1024): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: SCHEMA_CONTEXT,
      messages,
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Anthropic ${res.status}: ${txt.slice(0, 300)}`)
  }
  const d = await res.json() as { content: Array<{ text: string }> }
  return d.content[0]?.text ?? ''
}

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
  if (question.length > 500) return json({ ok: false, erro: 'Pergunta muito longa' }, 400)

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const ipHash = btoa(ip).slice(0, 32)
  const hash = btoa(encodeURIComponent(question.toLowerCase().trim())).slice(0, 64)

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  // Cache lookup
  try {
    const { data: cached } = await sb.from('ask_cache')
      .select('resposta_narrativa, sql_executado, resultado')
      .eq('pergunta_hash', hash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (cached) {
      return json({
        ok: true,
        pergunta: question,
        resposta: cached.resposta_narrativa,
        sql: cached.sql_executado,
        resultado: cached.resultado,
        cache_hit: true,
        latencia_ms: 0,
      })
    }
  } catch {
    // cache lookup falhou — continua
  }

  // Rate limit anônimo: 3 perguntas novas por IP por dia
  try {
    const { count } = await sb.from('ask_log')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .eq('cache_hit', false)
      .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())

    if ((count ?? 0) >= 3) {
      return json({
        ok: false,
        erro: 'Você atingiu o limite de 3 perguntas por dia no acesso anônimo.',
        quota_esgotada: true,
        plano: 'free',
        upgrade: true,
      }, 429)
    }
  } catch {
    // ignora falha no rate limit
  }

  const t0 = Date.now()

  try {
    // Passo 1: pergunta → SQL
    const sqlBruto = await chamarClaude([{
      role: 'user',
      content: `Gere um SQL SELECT para responder: "${question}"\n\nRetorne SOMENTE o SQL, sem markdown, sem explicação.`,
    }], 512)

    const sql = sqlBruto.replace(/```sql\n?/gi, '').replace(/```\n?/g, '').trim()

    if (!sql || sql.length < 10) {
      return json({ ok: false, erro: 'Não consegui gerar uma consulta para essa pergunta.' })
    }

    if (!validarSQL(sql)) {
      return json({ ok: false, erro: 'Não consegui gerar uma consulta segura. Tente reformular.' })
    }

    // Passo 2: executar SQL
    const { data: dados, error: sqlErr } = await sb.rpc('exec_readonly_query', { sql_query: sql })
    if (sqlErr) {
      return json({ ok: false, erro: `Erro na consulta: ${sqlErr.message}` }, 500)
    }

    const resultado = Array.isArray(dados) ? dados : (dados ? [dados] : [])

    // Passo 3: dados → narrativa
    const resposta = await chamarClaude([{
      role: 'user',
      content: `Pergunta: "${question}"\n\nDados:\n${JSON.stringify(resultado.slice(0, 20), null, 2)}\n\nEscreva uma resposta jornalística direta em português, em 2-3 parágrafos curtos. Use R$ com formatação brasileira. Use apenas os dados fornecidos.`,
    }], 1024)

    const latencia = Date.now() - t0

    // Cachear
    try {
      await sb.from('ask_cache').upsert({
        pergunta_hash:      hash,
        pergunta_original:  question,
        sql_executado:      sql,
        resultado,
        resposta_narrativa: resposta,
        tabelas_usadas:     [],
        custo_estimado_usd: 0.0005,
        expires_at:         new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      }, { onConflict: 'pergunta_hash' })
    } catch { /* silent */ }

    // Log
    try {
      await sb.from('ask_log').insert({
        pergunta_original: question,
        pergunta_hash:     hash,
        ip_hash:           ipHash,
        cache_hit:         false,
        success:           true,
        latencia_ms:       latencia,
      })
    } catch { /* silent */ }

    return json({ ok: true, pergunta: question, resposta, sql, resultado, cache_hit: false, latencia_ms: latencia })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    try {
      await sb.from('ask_log').insert({
        pergunta_original: question,
        pergunta_hash:     hash,
        ip_hash:           ipHash,
        cache_hit:         false,
        success:           false,
        erro:              msg,
        latencia_ms:       Date.now() - t0,
      })
    } catch { /* silent */ }
    return json({ ok: false, erro: msg }, 500)
  }
})
