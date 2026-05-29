-- ─────────────────────────────────────────────────────────────────────────
-- Fix compat layer do judiciário (Fase 4 — pré-cutover do front Vite)
--
-- A migration 20260524000000 criou o wrapper `buscar_processos` com a
-- assinatura ERRADA (5 params: q, p_tribunal, p_classe, p_limit, p_offset)
-- e SEM `total_count`. O front Vite (observatorio-judiciario) chama com 8
-- params e lê `rows[0].total_count`:
--
--   supabase.rpc('buscar_processos', {
--     q, p_tribunal, p_classe, p_relator, p_data_inicio, p_data_fim,
--     p_page, p_page_size
--   })
--
-- Resultado: PGRST202 (function not found) → busca textual e export CSV
-- quebram em produção assim que o front aponta pro canônico.
--
-- Também: a view `processos`/`processos_publico` não expõe a coluna
-- `classe_processual` que o legado tinha (front lê em ProcessoTable e
-- ProcessoDetalhe). No legado era majoritariamente NULL; no canônico o
-- código curto da classe vive em `metadata->>'classe_codigo'`.
--
-- Esta migration:
--   1. Recria `buscar_processos` com a assinatura de 8 params, retorno de
--      15 colunas idêntico ao legado (inclui classe_processual + total_count),
--      filtros relator/data e paginação por page/page_size.
--   2. Adiciona `classe_processual` (= metadata->>'classe_codigo') às views
--      compat `processos` e `processos_publico`.
--
-- Idempotente. Não toca em buscar_processos_judiciario (canônico, usado por
-- edge functions) — o wrapper compat é autossuficiente.
-- ─────────────────────────────────────────────────────────────────────────

-- ─── 1. Views compat: adicionar classe_processual ──────────────────────────
-- CREATE OR REPLACE só permite APPENDAR colunas no fim — classe_processual
-- vai por último, ordem das demais preservada.

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
  p.data_coleta,
  (p.metadata->>'classe_codigo') AS classe_processual
FROM public.judiciario_processos p
JOIN public.tribunais t ON t.id = p.tribunal_id;

CREATE OR REPLACE VIEW public.processos_publico AS
SELECT * FROM public.processos;

-- ─── 2. Wrapper compat buscar_processos — assinatura do front (8 params) ────
-- Assinatura antiga (5 params) tem que ser dropada: CREATE OR REPLACE não
-- muda nº de args nem tipo de retorno.

DROP FUNCTION IF EXISTS public.buscar_processos(text, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.buscar_processos(
  q             TEXT,
  p_tribunal    TEXT    DEFAULT NULL,
  p_classe      TEXT    DEFAULT NULL,
  p_relator     TEXT    DEFAULT NULL,
  p_data_inicio DATE    DEFAULT NULL,
  p_data_fim    DATE    DEFAULT NULL,
  p_page        INTEGER DEFAULT 0,
  p_page_size   INTEGER DEFAULT 50
) RETURNS TABLE (
  id                UUID,
  tribunal          TEXT,
  classe            TEXT,
  classe_processual TEXT,
  numero_processo   TEXT,
  relator           TEXT,
  orgao_julgador    TEXT,
  tipo_decisao      TEXT,
  data_decisao      DATE,
  tema              TEXT,
  ementa            TEXT,
  link_oficial      TEXT,
  fonte             TEXT,
  data_coleta       TIMESTAMPTZ,
  total_count       BIGINT
) LANGUAGE sql STABLE AS $$
  WITH filtrados AS (
    SELECT
      p.id,
      t.sigla                         AS tribunal,
      p.classe,
      (p.metadata->>'classe_codigo')  AS classe_processual,
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
      AND (p_tribunal    IS NULL OR t.sigla = upper(p_tribunal))
      AND (p_classe      IS NULL OR p.classe = p_classe)
      AND (p_relator     IS NULL OR p.relator ILIKE '%' || p_relator || '%')
      AND (p_data_inicio IS NULL OR p.data_decisao >= p_data_inicio)
      AND (p_data_fim    IS NULL OR p.data_decisao <= p_data_fim)
  )
  SELECT
    f.id,
    f.tribunal,
    f.classe,
    f.classe_processual,
    f.numero_processo,
    f.relator,
    f.orgao_julgador,
    f.tipo_decisao,
    f.data_decisao,
    f.tema,
    f.ementa,
    f.link_oficial,
    f.fonte,
    f.data_coleta,
    count(*) OVER() AS total_count
  FROM filtrados f
  ORDER BY
    CASE WHEN q IS NULL OR q = '' THEN 0 ELSE 1 END,
    f.rank DESC,
    f.data_decisao DESC NULLS LAST,
    f.data_coleta DESC
  LIMIT p_page_size OFFSET p_page * p_page_size;
$$;

COMMENT ON FUNCTION public.buscar_processos(text, text, text, text, date, date, integer, integer) IS
  'Wrapper compat (Fase 4) — assinatura idêntica ao RPC do projeto legado corklqwtrblervixxtan. Front Vite chama via supabase.rpc(''buscar_processos'', {q, p_tribunal, p_classe, p_relator, p_data_inicio, p_data_fim, p_page, p_page_size}). Retorna total_count via window count.';

-- ─── 3. Grants (DROP removeu os antigos) ───────────────────────────────────
GRANT SELECT ON public.processos          TO anon, authenticated;
GRANT SELECT ON public.processos_publico  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_processos(text, text, text, text, date, date, integer, integer) TO anon, authenticated;
