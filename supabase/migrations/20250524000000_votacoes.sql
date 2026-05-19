-- ─────────────────────────────────────────────────────────────────────────────
-- F4 — Votações em Plenário (57ª Legislatura)
-- Fonte: API dadosabertos.camara.leg.br/api/v2
-- Prefix plen_ para não colidir com tabela votacoes do schema legado
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Eventos de votação ─────────────────────────────────────────────────────
CREATE TABLE plen_votacoes (
  id                   TEXT PRIMARY KEY,              -- id externo Câmara (e.g. "2426982-51")
  uri                  TEXT,
  data                 DATE NOT NULL,
  data_hora_registro   TIMESTAMPTZ,
  sigla_orgao          TEXT DEFAULT 'PLEN',
  uri_evento           TEXT,
  proposicao_autora    TEXT,                          -- e.g. "PL 1234/2023"
  uri_proposicao       TEXT,
  descricao            TEXT,
  aprovacao            INTEGER,                       -- 1=aprovada, 0=rejeitada, NULL=sem resultado
  votos_sim            INTEGER DEFAULT 0,
  votos_nao            INTEGER DEFAULT 0,
  votos_abstencao      INTEGER DEFAULT 0,
  votos_obstrucao      INTEGER DEFAULT 0,
  votos_artigo17       INTEGER DEFAULT 0,
  id_legislatura       INTEGER NOT NULL DEFAULT 57,
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plen_votacoes_data        ON plen_votacoes(data DESC);
CREATE INDEX idx_plen_votacoes_legislatura ON plen_votacoes(id_legislatura);
CREATE INDEX idx_plen_votacoes_aprovacao   ON plen_votacoes(aprovacao);

-- ── 2. Votos individuais (um por deputado por votação) ────────────────────────
CREATE TABLE plen_votos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  votacao_id           TEXT NOT NULL REFERENCES plen_votacoes(id) ON DELETE CASCADE,
  deputado_id          INTEGER NOT NULL,
  nome                 TEXT,
  sigla_partido        TEXT,
  sigla_uf             TEXT,
  id_legislatura       INTEGER,
  url_foto             TEXT,
  data_registro_voto   TIMESTAMPTZ,
  tipo_voto            TEXT NOT NULL,  -- 'Sim' | 'Não' | 'Abstenção' | 'Obstrução' | 'Art. 17'
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(votacao_id, deputado_id)
);

CREATE INDEX idx_plen_votos_deputado ON plen_votos(deputado_id);
CREATE INDEX idx_plen_votos_votacao  ON plen_votos(votacao_id);
CREATE INDEX idx_plen_votos_partido  ON plen_votos(sigla_partido);
CREATE INDEX idx_plen_votos_tipo     ON plen_votos(tipo_voto);

-- ── 3. Orientações dos partidos/bancadas por votação ─────────────────────────
CREATE TABLE plen_orientacoes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  votacao_id     TEXT NOT NULL REFERENCES plen_votacoes(id) ON DELETE CASCADE,
  sigla_bancada  TEXT NOT NULL,    -- bancada.apelido (PT, PL, GOVERNO, etc.)
  nome_bancada   TEXT,
  orientacao     TEXT NOT NULL,    -- 'Sim' | 'Não' | 'Abstenção' | 'Obstrução' | 'Liberado'
  UNIQUE(votacao_id, sigla_bancada)
);

CREATE INDEX idx_plen_orientacoes_votacao ON plen_orientacoes(votacao_id);
CREATE INDEX idx_plen_orientacoes_bancada ON plen_orientacoes(sigla_bancada);

-- ── 4. Agregação por deputado ─────────────────────────────────────────────────
CREATE TABLE plen_deputado_agg (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deputado_id          INTEGER NOT NULL,
  id_legislatura       INTEGER NOT NULL DEFAULT 57,
  nome                 TEXT,
  sigla_partido        TEXT,
  sigla_uf             TEXT,
  url_foto             TEXT,
  total_votacoes       INTEGER NOT NULL DEFAULT 0,
  presencas            INTEGER NOT NULL DEFAULT 0,
  ausencias            INTEGER NOT NULL DEFAULT 0,
  votos_sim            INTEGER NOT NULL DEFAULT 0,
  votos_nao            INTEGER NOT NULL DEFAULT 0,
  votos_abstencao      INTEGER NOT NULL DEFAULT 0,
  votos_obstrucao      INTEGER NOT NULL DEFAULT 0,
  votos_artigo17       INTEGER NOT NULL DEFAULT 0,
  pct_presenca         NUMERIC(6,2),
  concordancia_partido NUMERIC(6,2),
  posicao              INTEGER,
  posicao_partido      INTEGER,
  por_tipo_voto        JSONB NOT NULL DEFAULT '{}',
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(deputado_id, id_legislatura)
);

CREATE INDEX idx_plen_dep_agg_partido  ON plen_deputado_agg(sigla_partido);
CREATE INDEX idx_plen_dep_agg_posicao  ON plen_deputado_agg(posicao);
CREATE INDEX idx_plen_dep_agg_presenca ON plen_deputado_agg(pct_presenca DESC);

-- ── 5. RPC: agregação server-side (evita 1.5M rows trafegando pelo JS) ────────
CREATE OR REPLACE FUNCTION computar_votacoes_agg(p_legislatura INT DEFAULT 57)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_votacoes      INT;
  v_deputados_inseridos INT;
BEGIN
  SELECT COUNT(*) INTO v_total_votacoes
  FROM plen_votacoes
  WHERE id_legislatura = p_legislatura;

  DELETE FROM plen_deputado_agg WHERE id_legislatura = p_legislatura;

  INSERT INTO plen_deputado_agg (
    deputado_id, id_legislatura, nome, sigla_partido, sigla_uf, url_foto,
    total_votacoes, presencas, ausencias,
    votos_sim, votos_nao, votos_abstencao, votos_obstrucao, votos_artigo17,
    pct_presenca, concordancia_partido,
    posicao, posicao_partido, por_tipo_voto, atualizado_em
  )
  SELECT
    sub.deputado_id,
    p_legislatura,
    sub.nome,
    sub.sigla_partido,
    sub.sigla_uf,
    sub.url_foto,
    v_total_votacoes                                                AS total_votacoes,
    sub.presencas,
    v_total_votacoes - sub.presencas                               AS ausencias,
    sub.votos_sim,
    sub.votos_nao,
    sub.votos_abstencao,
    sub.votos_obstrucao,
    sub.votos_artigo17,
    ROUND(sub.presencas * 100.0 / NULLIF(v_total_votacoes, 0), 2) AS pct_presenca,
    conc.concordancia_partido,
    ROW_NUMBER() OVER (ORDER BY sub.presencas DESC)                AS posicao,
    ROW_NUMBER() OVER (
      PARTITION BY sub.sigla_partido ORDER BY sub.presencas DESC
    )                                                              AS posicao_partido,
    jsonb_build_object(
      'Sim',       sub.votos_sim,
      'Não',       sub.votos_nao,
      'Abstenção', sub.votos_abstencao,
      'Obstrução', sub.votos_obstrucao,
      'Art. 17',   sub.votos_artigo17
    )                                                              AS por_tipo_voto,
    NOW()
  FROM (
    SELECT
      pv.deputado_id,
      MAX(pv.nome)          AS nome,
      MAX(pv.sigla_partido) AS sigla_partido,
      MAX(pv.sigla_uf)      AS sigla_uf,
      MAX(pv.url_foto)      AS url_foto,
      COUNT(*)                                                             AS presencas,
      SUM(CASE WHEN pv.tipo_voto = 'Sim'       THEN 1 ELSE 0 END)        AS votos_sim,
      SUM(CASE WHEN pv.tipo_voto = 'Não'       THEN 1 ELSE 0 END)        AS votos_nao,
      SUM(CASE WHEN pv.tipo_voto = 'Abstenção' THEN 1 ELSE 0 END)        AS votos_abstencao,
      SUM(CASE WHEN pv.tipo_voto = 'Obstrução' THEN 1 ELSE 0 END)        AS votos_obstrucao,
      SUM(CASE WHEN pv.tipo_voto = 'Art. 17'   THEN 1 ELSE 0 END)        AS votos_artigo17
    FROM plen_votos pv
    JOIN plen_votacoes v ON v.id = pv.votacao_id AND v.id_legislatura = p_legislatura
    GROUP BY pv.deputado_id
  ) sub
  LEFT JOIN (
    -- Concordância: % votações onde o dep. seguiu orientação do partido
    -- (exclui "Liberado" e "Art. 17" — sem orientação vinculante)
    SELECT
      pv.deputado_id,
      ROUND(
        SUM(CASE WHEN pv.tipo_voto = o.orientacao THEN 1.0 ELSE 0.0 END)
        / NULLIF(COUNT(*), 0) * 100,
        2
      ) AS concordancia_partido
    FROM plen_votos pv
    JOIN plen_votacoes v    ON v.id = pv.votacao_id AND v.id_legislatura = p_legislatura
    JOIN plen_orientacoes o
      ON  o.votacao_id    = pv.votacao_id
      AND o.sigla_bancada = pv.sigla_partido
      AND o.orientacao NOT IN ('Liberado', 'Art. 17')
    GROUP BY pv.deputado_id
  ) conc ON conc.deputado_id = sub.deputado_id;

  GET DIAGNOSTICS v_deputados_inseridos = ROW_COUNT;

  RETURN jsonb_build_object(
    'status',                'sucesso',
    'legislatura',           p_legislatura,
    'total_votacoes',        v_total_votacoes,
    'deputados_processados', v_deputados_inseridos
  );
END;
$$;
