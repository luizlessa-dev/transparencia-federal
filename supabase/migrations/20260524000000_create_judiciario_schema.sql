-- Transparência Federal — schema canônico Judiciário
--
-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ Absorve o produto `judiciario.transparenciafederal.org`              ║
-- ║ (antes em Supabase isolado `corklqwtrblervixxtan`) pro banco         ║
-- ║ canônico `redggdtakzmsabwvjzhb`. Destrava SQL cruzado                ║
-- ║ judiciário × emendas × CEAP × TSE.                                   ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- Padrão herdado de 20260523000000_create_canonical_casas_schema.sql:
--   - Tabela registry (`tribunais` análogo a `casas`)
--   - Tabela canônica com FK (`judiciario_processos` análogo a
--     `gastos_parlamentares`)
--   - Views compat com nomes legados (`processos`, `processos_publico`,
--     `highlights*`, `stats_por_*`) pra zerar mudança no front Vite em
--     `observatorio-judiciario` — só troca de `.env` na Fase 4.
--
-- IMPORTANTE — esta migration NÃO carrega dados.
-- A carga vem na Fase 2 (script `packages/analytics/migrate-judiciario.ts`)
-- que faz dump→transform→COPY do banco antigo. Por isso esta migration
-- pode ser aplicada com banco vazio que nada quebra: o front antigo
-- continua apontando pra `corklqwtrblervixxtan` até a Fase 4.

-- ─── 1. tribunais (registry) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tribunais (
  id              SERIAL PRIMARY KEY,
  sigla           TEXT NOT NULL UNIQUE,
  nome_completo  TEXT NOT NULL,
  categoria       TEXT NOT NULL CHECK (categoria IN ('superior', 'federal', 'estadual', 'trabalho', 'outro')),
  uf              TEXT,                      -- NULL pra tribunais nacionais (STF, STJ, TST, TCU)
  endpoint_datajud TEXT,                     -- ex: 'api_publica_stj'; NULL pra tribunais sem DataJud (TCU)
  cor             TEXT,                      -- hex, branding por tribunal no front
  cor_light       TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tribunais_sigla    ON public.tribunais (sigla);
CREATE INDEX IF NOT EXISTS idx_tribunais_categoria ON public.tribunais (categoria);

ALTER TABLE public.tribunais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read tribunais"
  ON public.tribunais FOR SELECT USING (true);

CREATE POLICY "Service insert tribunais"
  ON public.tribunais FOR INSERT
  WITH CHECK (
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
  );

CREATE POLICY "Service update tribunais"
  ON public.tribunais FOR UPDATE
  USING (
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
  );

COMMENT ON TABLE public.tribunais IS 'Tribunais cobertos pelo Observatório Judiciário — STF/STJ/TST/TCU + 6 TRFs + 27 TJs.';

-- ─── 2. judiciario_processos (canônico) ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.judiciario_processos (
  id                     UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tribunal_id            INTEGER NOT NULL REFERENCES public.tribunais (id),
  identificador_externo  TEXT NOT NULL UNIQUE,    -- ex: 'stj-AbC123...' (slug do DataJud + tribunal)
  numero_processo        TEXT NOT NULL,
  classe                 TEXT,
  relator                TEXT,
  orgao_julgador         TEXT,
  tipo_decisao           TEXT,                    -- 'acordao', 'decisao_monocratica', etc.
  data_decisao           DATE,
  tema                   TEXT,                    -- assunto principal (1º assunto do DataJud)
  ementa                 TEXT,
  link_oficial           TEXT,
  fonte                  TEXT NOT NULL DEFAULT 'datajud',  -- 'datajud', 'tcu', 'tst-historico'
  metadata               JSONB,                   -- assuntos[], classe_codigo, raw fonte-específica
  data_coleta            TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector          tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(numero_processo, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(classe, '')),          'B') ||
    setweight(to_tsvector('portuguese', coalesce(relator, '')),         'B') ||
    setweight(to_tsvector('portuguese', coalesce(orgao_julgador, '')),  'C') ||
    setweight(to_tsvector('portuguese', coalesce(tema, '')),            'C') ||
    setweight(to_tsvector('portuguese', coalesce(ementa, '')),          'D')
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_jud_proc_tribunal     ON public.judiciario_processos (tribunal_id);
CREATE INDEX IF NOT EXISTS idx_jud_proc_data_decisao ON public.judiciario_processos (data_decisao DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_jud_proc_relator      ON public.judiciario_processos (relator) WHERE relator IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jud_proc_classe       ON public.judiciario_processos (classe) WHERE classe IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jud_proc_numero       ON public.judiciario_processos (numero_processo);
CREATE INDEX IF NOT EXISTS idx_jud_proc_data_coleta  ON public.judiciario_processos (data_coleta DESC);
CREATE INDEX IF NOT EXISTS idx_jud_proc_fts          ON public.judiciario_processos USING GIN (search_vector);

ALTER TABLE public.judiciario_processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read judiciario_processos"
  ON public.judiciario_processos FOR SELECT USING (true);

CREATE POLICY "Service insert judiciario_processos"
  ON public.judiciario_processos FOR INSERT
  WITH CHECK (
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
  );

CREATE POLICY "Service update judiciario_processos"
  ON public.judiciario_processos FOR UPDATE
  USING (
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
  );

COMMENT ON TABLE public.judiciario_processos IS
  'Decisões judiciais (acórdãos e decisões monocráticas) coletadas via DataJud CNJ + portais próprios (TCU). 1 linha = 1 processo.';
COMMENT ON COLUMN public.judiciario_processos.identificador_externo IS
  'ID estável da fonte (DataJud _id prefixado com sigla do tribunal). Garante idempotência do upsert.';
COMMENT ON COLUMN public.judiciario_processos.search_vector IS
  'tsvector português stored — usado pelo RPC buscar_processos_judiciario via índice GIN.';

-- ─── 3. judiciario_highlights (curados) ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.judiciario_highlights (
  id                 UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  semana_referencia  DATE NOT NULL,             -- segunda-feira da semana de referência (ISO)
  posicao            INTEGER NOT NULL CHECK (posicao BETWEEN 1 AND 99),
  titulo_curto       TEXT NOT NULL,
  resumo             TEXT NOT NULL,
  tribunal_id        INTEGER REFERENCES public.tribunais (id),  -- NULL pra highlight sem tribunal específico
  tema               TEXT,
  link_externo       TEXT,
  processo_id        UUID REFERENCES public.judiciario_processos (id) ON DELETE SET NULL,
  ativo              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (semana_referencia, posicao)
);

CREATE INDEX IF NOT EXISTS idx_jud_hl_semana_ativo ON public.judiciario_highlights (semana_referencia DESC, ativo);
CREATE INDEX IF NOT EXISTS idx_jud_hl_tribunal    ON public.judiciario_highlights (tribunal_id);

ALTER TABLE public.judiciario_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read judiciario_highlights"
  ON public.judiciario_highlights FOR SELECT USING (ativo = TRUE);

CREATE POLICY "Service all judiciario_highlights"
  ON public.judiciario_highlights FOR ALL
  USING (
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
  )
  WITH CHECK (
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
  );

COMMENT ON TABLE public.judiciario_highlights IS
  'Decisões em destaque, curadas manualmente via edge function admin-highlights. Máximo lógico de 5 ativos por semana_referencia (não enforced no DB).';

-- ─── 4. Seed dos 37 tribunais ──────────────────────────────────────────

INSERT INTO public.tribunais (sigla, nome_completo, categoria, uf, endpoint_datajud, cor, cor_light) VALUES
  -- Superiores (4)
  ('STF',  'Supremo Tribunal Federal',         'superior', NULL, NULL,                '#881337', '#FFF1F2'),
  ('STJ',  'Superior Tribunal de Justiça',     'superior', NULL, 'api_publica_stj',  '#1e3a5f', '#EFF6FF'),
  ('TST',  'Tribunal Superior do Trabalho',    'trabalho', NULL, 'api_publica_tst',  '#0f766e', '#F0FDFA'),
  ('TCU',  'Tribunal de Contas da União',      'outro',    NULL, NULL,                '#92400e', '#FFFBEB'),
  -- Justiça Federal — TRFs (6)
  ('TRF1', 'Tribunal Regional Federal da 1ª Região', 'federal', NULL, 'api_publica_trf1', '#1d4ed8', '#EFF6FF'),
  ('TRF2', 'Tribunal Regional Federal da 2ª Região', 'federal', NULL, 'api_publica_trf2', '#1d4ed8', '#EFF6FF'),
  ('TRF3', 'Tribunal Regional Federal da 3ª Região', 'federal', NULL, 'api_publica_trf3', '#1d4ed8', '#EFF6FF'),
  ('TRF4', 'Tribunal Regional Federal da 4ª Região', 'federal', NULL, 'api_publica_trf4', '#1d4ed8', '#EFF6FF'),
  ('TRF5', 'Tribunal Regional Federal da 5ª Região', 'federal', NULL, 'api_publica_trf5', '#1d4ed8', '#EFF6FF'),
  ('TRF6', 'Tribunal Regional Federal da 6ª Região', 'federal', NULL, 'api_publica_trf6', '#1d4ed8', '#EFF6FF'),
  -- TJs (27)
  ('TJSP',  'Tribunal de Justiça de São Paulo',                   'estadual', 'SP', 'api_publica_tjsp',  '#6d28d9', '#F5F3FF'),
  ('TJRJ',  'Tribunal de Justiça do Rio de Janeiro',              'estadual', 'RJ', 'api_publica_tjrj',  '#6d28d9', '#F5F3FF'),
  ('TJMG',  'Tribunal de Justiça de Minas Gerais',                'estadual', 'MG', 'api_publica_tjmg',  '#6d28d9', '#F5F3FF'),
  ('TJRS',  'Tribunal de Justiça do Rio Grande do Sul',           'estadual', 'RS', 'api_publica_tjrs',  '#6d28d9', '#F5F3FF'),
  ('TJPR',  'Tribunal de Justiça do Paraná',                      'estadual', 'PR', 'api_publica_tjpr',  '#6d28d9', '#F5F3FF'),
  ('TJSC',  'Tribunal de Justiça de Santa Catarina',              'estadual', 'SC', 'api_publica_tjsc',  '#6d28d9', '#F5F3FF'),
  ('TJBA',  'Tribunal de Justiça da Bahia',                       'estadual', 'BA', 'api_publica_tjba',  '#6d28d9', '#F5F3FF'),
  ('TJPE',  'Tribunal de Justiça de Pernambuco',                  'estadual', 'PE', 'api_publica_tjpe',  '#6d28d9', '#F5F3FF'),
  ('TJCE',  'Tribunal de Justiça do Ceará',                       'estadual', 'CE', 'api_publica_tjce',  '#6d28d9', '#F5F3FF'),
  ('TJGO',  'Tribunal de Justiça de Goiás',                       'estadual', 'GO', 'api_publica_tjgo',  '#6d28d9', '#F5F3FF'),
  ('TJDFT', 'Tribunal de Justiça do Distrito Federal e Territórios','estadual', 'DF', 'api_publica_tjdft', '#6d28d9', '#F5F3FF'),
  ('TJES',  'Tribunal de Justiça do Espírito Santo',              'estadual', 'ES', 'api_publica_tjes',  '#6d28d9', '#F5F3FF'),
  ('TJAC',  'Tribunal de Justiça do Acre',                        'estadual', 'AC', 'api_publica_tjac',  '#6d28d9', '#F5F3FF'),
  ('TJAL',  'Tribunal de Justiça de Alagoas',                     'estadual', 'AL', 'api_publica_tjal',  '#6d28d9', '#F5F3FF'),
  ('TJAM',  'Tribunal de Justiça do Amazonas',                    'estadual', 'AM', 'api_publica_tjam',  '#6d28d9', '#F5F3FF'),
  ('TJAP',  'Tribunal de Justiça do Amapá',                       'estadual', 'AP', 'api_publica_tjap',  '#6d28d9', '#F5F3FF'),
  ('TJMA',  'Tribunal de Justiça do Maranhão',                    'estadual', 'MA', 'api_publica_tjma',  '#6d28d9', '#F5F3FF'),
  ('TJMS',  'Tribunal de Justiça de Mato Grosso do Sul',          'estadual', 'MS', 'api_publica_tjms',  '#6d28d9', '#F5F3FF'),
  ('TJMT',  'Tribunal de Justiça de Mato Grosso',                 'estadual', 'MT', 'api_publica_tjmt',  '#6d28d9', '#F5F3FF'),
  ('TJPA',  'Tribunal de Justiça do Pará',                        'estadual', 'PA', 'api_publica_tjpa',  '#6d28d9', '#F5F3FF'),
  ('TJPB',  'Tribunal de Justiça da Paraíba',                     'estadual', 'PB', 'api_publica_tjpb',  '#6d28d9', '#F5F3FF'),
  ('TJPI',  'Tribunal de Justiça do Piauí',                       'estadual', 'PI', 'api_publica_tjpi',  '#6d28d9', '#F5F3FF'),
  ('TJRN',  'Tribunal de Justiça do Rio Grande do Norte',         'estadual', 'RN', 'api_publica_tjrn',  '#6d28d9', '#F5F3FF'),
  ('TJRO',  'Tribunal de Justiça de Rondônia',                    'estadual', 'RO', 'api_publica_tjro',  '#6d28d9', '#F5F3FF'),
  ('TJRR',  'Tribunal de Justiça de Roraima',                     'estadual', 'RR', 'api_publica_tjrr',  '#6d28d9', '#F5F3FF'),
  ('TJSE',  'Tribunal de Justiça de Sergipe',                     'estadual', 'SE', 'api_publica_tjse',  '#6d28d9', '#F5F3FF'),
  ('TJTO',  'Tribunal de Justiça do Tocantins',                   'estadual', 'TO', 'api_publica_tjto',  '#6d28d9', '#F5F3FF')
ON CONFLICT (sigla) DO NOTHING;

-- ─── 5. Materialized views (stats agregadas) ───────────────────────────

-- 5a. Por tribunal (uma linha por sigla)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.judiciario_stats_por_tribunal AS
SELECT
  t.id           AS tribunal_id,
  t.sigla        AS tribunal,
  COUNT(*)       AS total,
  COUNT(*) FILTER (WHERE p.data_decisao IS NOT NULL)               AS com_decisao,
  COUNT(DISTINCT p.relator) FILTER (WHERE p.relator IS NOT NULL)   AS qtd_relatores,
  COUNT(DISTINCT p.classe) FILTER (WHERE p.classe IS NOT NULL)     AS qtd_classes,
  MAX(p.data_decisao)                                              AS ultima_decisao,
  MAX(p.data_coleta)                                               AS ultima_coleta
FROM public.tribunais t
LEFT JOIN public.judiciario_processos p ON p.tribunal_id = t.id
GROUP BY t.id, t.sigla;

CREATE UNIQUE INDEX IF NOT EXISTS uq_jud_stats_tribunal ON public.judiciario_stats_por_tribunal (tribunal_id);

-- 5b. Por ano × tribunal
CREATE MATERIALIZED VIEW IF NOT EXISTS public.judiciario_stats_por_ano_tribunal AS
SELECT
  t.id                     AS tribunal_id,
  t.sigla                  AS tribunal,
  EXTRACT(YEAR FROM p.data_decisao)::INTEGER AS ano,
  COUNT(*)                 AS total
FROM public.tribunais t
JOIN public.judiciario_processos p ON p.tribunal_id = t.id
WHERE p.data_decisao IS NOT NULL
GROUP BY t.id, t.sigla, EXTRACT(YEAR FROM p.data_decisao);

CREATE UNIQUE INDEX IF NOT EXISTS uq_jud_stats_ano_tribunal ON public.judiciario_stats_por_ano_tribunal (tribunal_id, ano);

-- 5c. Por classe × tribunal
CREATE MATERIALIZED VIEW IF NOT EXISTS public.judiciario_stats_por_classe_tribunal AS
SELECT
  t.id        AS tribunal_id,
  t.sigla     AS tribunal,
  p.classe    AS classe,
  COUNT(*)    AS total
FROM public.tribunais t
JOIN public.judiciario_processos p ON p.tribunal_id = t.id
WHERE p.classe IS NOT NULL
GROUP BY t.id, t.sigla, p.classe;

CREATE UNIQUE INDEX IF NOT EXISTS uq_jud_stats_classe_tribunal ON public.judiciario_stats_por_classe_tribunal (tribunal_id, classe);

-- 5d. Por relator × tribunal (perfis de ministros)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.judiciario_stats_por_relator AS
SELECT
  t.id         AS tribunal_id,
  t.sigla      AS tribunal,
  p.relator    AS relator,
  COUNT(*)     AS processos,
  COUNT(*) FILTER (WHERE p.data_decisao IS NOT NULL) AS com_decisao,
  MAX(p.data_decisao)  AS ultima_decisao,
  (
    SELECT classe FROM public.judiciario_processos p2
    WHERE p2.tribunal_id = t.id AND p2.relator = p.relator
    GROUP BY classe
    ORDER BY COUNT(*) DESC NULLS LAST
    LIMIT 1
  ) AS classe_principal
FROM public.tribunais t
JOIN public.judiciario_processos p ON p.tribunal_id = t.id
WHERE p.relator IS NOT NULL AND p.relator <> ''
GROUP BY t.id, t.sigla, p.relator;

CREATE UNIQUE INDEX IF NOT EXISTS uq_jud_stats_relator ON public.judiciario_stats_por_relator (tribunal_id, relator);

-- ─── 6. RPCs ───────────────────────────────────────────────────────────

-- 6a. Busca FTS canônica
CREATE OR REPLACE FUNCTION public.buscar_processos_judiciario(
  q          TEXT,
  p_tribunal TEXT DEFAULT NULL,
  p_classe   TEXT DEFAULT NULL,
  p_limit    INTEGER DEFAULT 50,
  p_offset   INTEGER DEFAULT 0
) RETURNS TABLE (
  id              UUID,
  tribunal        TEXT,
  classe          TEXT,
  numero_processo TEXT,
  relator         TEXT,
  orgao_julgador  TEXT,
  tipo_decisao    TEXT,
  data_decisao    DATE,
  tema            TEXT,
  ementa          TEXT,
  link_oficial    TEXT,
  fonte           TEXT,
  data_coleta     TIMESTAMPTZ,
  rank            REAL
) LANGUAGE sql STABLE AS $$
  SELECT
    p.id,
    t.sigla         AS tribunal,
    p.classe,
    p.numero_processo,
    p.relator,
    p.orgao_julgador,
    p.tipo_decisao,
    p.data_decisao,
    p.tema,
    p.ementa,
    p.link_oficial,
    p.fonte,
    p.data_coleta,
    CASE
      WHEN q IS NULL OR q = '' THEN 0::real
      ELSE ts_rank(p.search_vector, websearch_to_tsquery('portuguese', q))
    END AS rank
  FROM public.judiciario_processos p
  JOIN public.tribunais t ON t.id = p.tribunal_id
  WHERE
    (q IS NULL OR q = '' OR p.search_vector @@ websearch_to_tsquery('portuguese', q))
    AND (p_tribunal IS NULL OR t.sigla = upper(p_tribunal))
    AND (p_classe   IS NULL OR p.classe = p_classe)
  ORDER BY
    CASE WHEN q IS NULL OR q = '' THEN 0 ELSE 1 END,
    rank DESC,
    p.data_decisao DESC NULLS LAST,
    p.data_coleta DESC
  LIMIT p_limit OFFSET p_offset;
$$;

COMMENT ON FUNCTION public.buscar_processos_judiciario IS
  'FTS sobre judiciario_processos via search_vector + websearch_to_tsquery. Aceita AND, OR, -NOT, "frase exata".';

-- 6b. Refresh das 4 MVs
CREATE OR REPLACE FUNCTION public.refresh_judiciario_stats() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.judiciario_stats_por_tribunal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.judiciario_stats_por_ano_tribunal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.judiciario_stats_por_classe_tribunal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.judiciario_stats_por_relator;
END;
$$;

COMMENT ON FUNCTION public.refresh_judiciario_stats IS
  'Refresh CONCURRENTLY das 4 MVs. Chamado pela edge function sync-datajud ao final do batch.';

-- ─── 7. Views compat (front Vite legado) ───────────────────────────────
-- Mantém os nomes que o repo observatorio-judiciario consome.
-- Fase 4 só vai trocar VITE_SUPABASE_URL — nenhum código TS muda.

-- 7a. processos / processos_publico
CREATE OR REPLACE VIEW public.processos AS
SELECT
  p.id,
  t.sigla                AS tribunal,
  p.classe,
  p.numero_processo,
  p.relator,
  p.orgao_julgador,
  p.tipo_decisao,
  p.data_decisao,
  p.tema,
  p.ementa,
  p.link_oficial,
  p.fonte,
  p.identificador_externo,
  p.metadata,
  p.data_coleta
FROM public.judiciario_processos p
JOIN public.tribunais t ON t.id = p.tribunal_id;

COMMENT ON VIEW public.processos IS
  'View compat — superfície idêntica à tabela `processos` original do projeto isolado `corklqwtrblervixxtan`. Suportada enquanto o front Vite não migrar pras tabelas canônicas.';

CREATE OR REPLACE VIEW public.processos_publico AS
SELECT * FROM public.processos;

COMMENT ON VIEW public.processos_publico IS
  'View compat espelho de `processos`. No projeto antigo era a fronteira anon — aqui é só alias, já que `judiciario_processos` tem public read via RLS.';

-- 7b. highlights / highlights_publico
CREATE OR REPLACE VIEW public.highlights AS
SELECT
  h.id,
  h.titulo_curto,
  h.resumo,
  t.sigla                AS tribunal,
  h.tema,
  h.link_externo,
  h.posicao,
  h.semana_referencia,
  h.processo_id,
  p.numero_processo,
  p.classe,
  p.relator,
  p.data_decisao,
  h.ativo,
  h.created_at,
  h.updated_at
FROM public.judiciario_highlights h
LEFT JOIN public.tribunais t ON t.id = h.tribunal_id
LEFT JOIN public.judiciario_processos p ON p.id = h.processo_id;

COMMENT ON VIEW public.highlights IS
  'View compat — superfície idêntica à tabela `highlights` original.';

CREATE OR REPLACE VIEW public.highlights_publico AS
SELECT
  id, titulo_curto, resumo, tribunal, tema, link_externo,
  posicao, semana_referencia, processo_id, numero_processo,
  classe, relator, data_decisao
FROM public.highlights
WHERE ativo = TRUE
ORDER BY semana_referencia DESC, posicao ASC;

COMMENT ON VIEW public.highlights_publico IS
  'View compat — somente highlights ativos, ordenado por semana mais recente.';

-- 7c. stats_por_* (4 views compat sobre MVs canônicas)
CREATE OR REPLACE VIEW public.stats_por_tribunal AS
SELECT
  tribunal,
  total,
  com_decisao,
  qtd_relatores,
  qtd_classes,
  ultima_decisao,
  ultima_coleta
FROM public.judiciario_stats_por_tribunal;

CREATE OR REPLACE VIEW public.stats_por_ano_tribunal AS
SELECT tribunal, ano, total
FROM public.judiciario_stats_por_ano_tribunal;

CREATE OR REPLACE VIEW public.stats_por_classe_tribunal AS
SELECT tribunal, classe, total
FROM public.judiciario_stats_por_classe_tribunal;

CREATE OR REPLACE VIEW public.stats_por_relator AS
SELECT tribunal, relator, processos, com_decisao, ultima_decisao, classe_principal
FROM public.judiciario_stats_por_relator;

-- ─── 8. RPC wrappers compat ────────────────────────────────────────────

-- 8a. buscar_processos — mesma assinatura do RPC antigo, delega pra canônico
CREATE OR REPLACE FUNCTION public.buscar_processos(
  q          TEXT,
  p_tribunal TEXT DEFAULT NULL,
  p_classe   TEXT DEFAULT NULL,
  p_limit    INTEGER DEFAULT 50,
  p_offset   INTEGER DEFAULT 0
) RETURNS TABLE (
  id              UUID,
  tribunal        TEXT,
  classe          TEXT,
  numero_processo TEXT,
  relator         TEXT,
  orgao_julgador  TEXT,
  tipo_decisao    TEXT,
  data_decisao    DATE,
  tema            TEXT,
  ementa          TEXT,
  link_oficial    TEXT,
  fonte           TEXT,
  data_coleta     TIMESTAMPTZ,
  rank            REAL
) LANGUAGE sql STABLE AS $$
  SELECT * FROM public.buscar_processos_judiciario(q, p_tribunal, p_classe, p_limit, p_offset);
$$;

COMMENT ON FUNCTION public.buscar_processos IS
  'Wrapper compat — front Vite chama via supabase.rpc(''buscar_processos'', ...). Delega pra buscar_processos_judiciario.';

-- 8b. refresh_stats — wrapper compat
CREATE OR REPLACE FUNCTION public.refresh_stats() RETURNS void
LANGUAGE sql AS $$
  SELECT public.refresh_judiciario_stats();
$$;

COMMENT ON FUNCTION public.refresh_stats IS
  'Wrapper compat — edge function sync-datajud antiga chama via .rpc(''refresh_stats''). Delega pra refresh_judiciario_stats.';

-- ─── 9. Grants pra anon role (acesso público às views) ─────────────────
-- Padrão do monorepo: anon role chega via VITE_SUPABASE_ANON_KEY do front Vite.
-- As tabelas canônicas já têm public read via RLS; aqui só garantimos que
-- views e RPCs estão expostas.

GRANT SELECT ON public.processos              TO anon, authenticated;
GRANT SELECT ON public.processos_publico      TO anon, authenticated;
GRANT SELECT ON public.highlights             TO anon, authenticated;
GRANT SELECT ON public.highlights_publico     TO anon, authenticated;
GRANT SELECT ON public.stats_por_tribunal     TO anon, authenticated;
GRANT SELECT ON public.stats_por_ano_tribunal TO anon, authenticated;
GRANT SELECT ON public.stats_por_classe_tribunal TO anon, authenticated;
GRANT SELECT ON public.stats_por_relator      TO anon, authenticated;
GRANT SELECT ON public.tribunais              TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.buscar_processos              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_processos_judiciario   TO anon, authenticated;
-- refresh_* fica restrita ao service_role (default — sem GRANT explícito)
