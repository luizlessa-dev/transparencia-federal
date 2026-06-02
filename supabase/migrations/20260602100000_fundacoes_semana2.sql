-- Semana 2: pgvector + views analíticas + RPC de busca
-- thebrinsider.com/fundacoes

-- ─────────────────────────────────────────────
-- 1. pgvector (para embeddings futuros — SICAP, DivulgaSPCA)
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela de embeddings (preenchida na Semana 3, quando tivermos docs não-estruturados)
CREATE TABLE IF NOT EXISTS fundacoes_embeddings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj        text NOT NULL REFERENCES fundacoes_partidarias(cnpj) ON DELETE CASCADE,
  chunk_type  text NOT NULL,  -- 'perfil' | 'repasse_anual' | 'documento_sicap'
  chunk_text  text NOT NULL,
  embedding   vector(1536),
  metadata    jsonb,
  criado_em   timestamptz DEFAULT now(),
  UNIQUE (cnpj, chunk_type)
);

CREATE INDEX IF NOT EXISTS idx_fundacoes_emb_cnpj ON fundacoes_embeddings (cnpj);
CREATE INDEX IF NOT EXISTS idx_fundacoes_emb_vec
  ON fundacoes_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

-- ─────────────────────────────────────────────
-- 2. GIN full-text (busca imediata sem embedding)
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fundacoes_fts
  ON fundacoes_partidarias USING gin (to_tsvector('portuguese', coalesce(nome_popular,'') || ' ' || coalesce(razao_social,'') || ' ' || coalesce(partido_sigla,'')));

CREATE INDEX IF NOT EXISTS idx_repasses_fts
  ON fundacoes_repasses USING gin (to_tsvector('portuguese', coalesce(nm_fundacao,'') || ' ' || coalesce(ds_gasto,'')));

-- ─────────────────────────────────────────────
-- 3. View: fundacoes_alertas
--    Concentra os sinais de risco mais relevantes por fundação/exercício
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW fundacoes_alertas AS
SELECT
  f.cnpj,
  f.nome_popular,
  f.partido_sigla,
  f.presidente_nome,

  -- Alerta 1: sede compartilhada com o partido
  f.mesmo_endereco_partido                        AS alerta_sede_compartilhada,

  -- Alerta 2: aluguel circular (partido paga aluguel à própria fundação)
  COALESCE(r.total_aluguel, 0) > 0               AS alerta_aluguel_circular,
  COALESCE(r.total_aluguel, 0)                   AS valor_aluguel_anual,

  -- Alerta 3: concentração excessiva no Q4 (> 40%)
  COALESCE(r.pct_q4, 0) > 40                     AS alerta_concentracao_q4,
  COALESCE(r.pct_q4, 0)                          AS pct_q4,

  -- Alerta 4: fornecedor não-fundação classificado como fundação partidária
  --           (detectado na ingestão: IBESPE Marketing, Partido Novo, etc.)
  f.razao_social NOT ILIKE '%fundaç%'
  AND f.razao_social NOT ILIKE '%fundac%'
  AND f.razao_social NOT ILIKE '%instituto%'      AS alerta_natureza_juridica_suspeita,

  -- Volumes
  COALESCE(r.total_repassado, 0)                 AS total_repassado,
  COALESCE(r.qtd_repasses, 0)                    AS qtd_repasses,
  r.aa_exercicio,

  -- Score de risco simples (0–4 alertas)
  (
    (f.mesmo_endereco_partido)::int +
    (COALESCE(r.total_aluguel, 0) > 0)::int +
    (COALESCE(r.pct_q4, 0) > 40)::int +
    (
      f.razao_social NOT ILIKE '%fundaç%'
      AND f.razao_social NOT ILIKE '%fundac%'
      AND f.razao_social NOT ILIKE '%instituto%'
    )::int
  )                                               AS score_alertas

FROM fundacoes_partidarias f
LEFT JOIN fundacoes_resumo r
  ON r.cnpj_fundacao = f.cnpj
ORDER BY score_alertas DESC, total_repassado DESC;

COMMENT ON VIEW fundacoes_alertas IS
  'Sinais de risco por fundação: sede compartilhada, aluguel circular, '
  'concentração Q4 > 40%, natureza jurídica suspeita. Score 0-4.';

-- ─────────────────────────────────────────────
-- 4. View: fundacoes_ranking_publico
--    Versão enxuta para o frontend (sem dados sensíveis brutos)
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW fundacoes_ranking_publico AS
SELECT
  f.cnpj,
  f.nome_popular,
  f.partido_sigla,
  f.presidente_nome,
  f.presidente_desde,
  f.municipio,
  f.uf,
  f.data_abertura,
  f.mesmo_endereco_partido,
  f.mesmo_telefone_partido,
  COALESCE(r.total_repassado, 0)   AS total_repassado_2024,
  COALESCE(r.qtd_repasses, 0)      AS qtd_repasses_2024,
  COALESCE(r.total_aluguel, 0)     AS total_aluguel_2024,
  COALESCE(r.pct_q4, 0)           AS pct_q4_2024,
  COALESCE(a.score_alertas, 0)    AS score_alertas
FROM fundacoes_partidarias f
LEFT JOIN fundacoes_resumo r
  ON r.cnpj_fundacao = f.cnpj AND r.aa_exercicio = 2024
LEFT JOIN fundacoes_alertas a
  ON a.cnpj = f.cnpj AND a.aa_exercicio = 2024
ORDER BY total_repassado_2024 DESC;

GRANT SELECT ON fundacoes_alertas       TO anon, authenticated;
GRANT SELECT ON fundacoes_ranking_publico TO anon, authenticated;
GRANT SELECT ON fundacoes_embeddings    TO authenticated;

-- ─────────────────────────────────────────────
-- 5. RPC: search_fundacoes
--    Busca full-text + filtros — usada pela caixa de pesquisa
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_fundacoes(
  termo        text    DEFAULT NULL,
  partido      text    DEFAULT NULL,
  so_alertas   boolean DEFAULT false,
  limite       int     DEFAULT 25
)
RETURNS TABLE (
  cnpj                    text,
  nome_popular            text,
  partido_sigla           text,
  presidente_nome         text,
  total_repassado_2024    numeric,
  pct_q4_2024             numeric,
  total_aluguel_2024      numeric,
  mesmo_endereco_partido  boolean,
  score_alertas           int,
  relevancia              float4
)
LANGUAGE sql STABLE
AS $$
  SELECT
    r.cnpj,
    r.nome_popular,
    r.partido_sigla,
    r.presidente_nome,
    r.total_repassado_2024,
    r.pct_q4_2024,
    r.total_aluguel_2024,
    r.mesmo_endereco_partido,
    r.score_alertas,
    CASE
      WHEN termo IS NOT NULL THEN
        ts_rank(
          to_tsvector('portuguese',
            coalesce(r.nome_popular,'') || ' ' ||
            coalesce(r.partido_sigla,'') || ' ' ||
            coalesce(r.presidente_nome,'')),
          plainto_tsquery('portuguese', termo)
        )
      ELSE 1.0
    END AS relevancia
  FROM fundacoes_ranking_publico r
  WHERE
    (termo IS NULL OR to_tsvector('portuguese',
      coalesce(r.nome_popular,'') || ' ' ||
      coalesce(r.partido_sigla,'') || ' ' ||
      coalesce(r.presidente_nome,''))
      @@ plainto_tsquery('portuguese', termo))
    AND (partido IS NULL OR upper(r.partido_sigla) = upper(partido))
    AND (NOT so_alertas OR r.score_alertas > 0)
  ORDER BY relevancia DESC, r.total_repassado_2024 DESC
  LIMIT LEAST(limite, 100);
$$;

GRANT EXECUTE ON FUNCTION search_fundacoes TO anon, authenticated;

COMMENT ON FUNCTION search_fundacoes IS
  'Busca full-text em fundações com filtros opcionais. '
  'Usada pela caixa de pesquisa do /fundacoes.';
