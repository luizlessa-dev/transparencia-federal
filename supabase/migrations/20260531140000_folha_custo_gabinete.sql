-- ─────────────────────────────────────────────────────────────────────────
-- folha_custo_gabinete — custo de pessoal por parlamentar (a partir de
-- folha_gabinete com valor_remuneracao). Senado = salário exato; Câmara =
-- estimado por nível de cargo. `salario_tipo` distingue os dois.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS folha_custo_gabinete (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  casa                    text NOT NULL,
  parlamentar_nome        text NOT NULL,
  parlamentar_id_externo  text,
  salario_tipo            text NOT NULL,        -- 'exato' | 'estimado'
  n_funcionarios          integer NOT NULL,
  n_com_salario           integer NOT NULL,
  soma_salarios           numeric(14, 2),       -- folha mensal total
  media_salario           numeric(12, 2),
  maior_salario           numeric(12, 2),
  n_lotacoes              integer,              -- gabinete + escritórios de apoio distintos
  snapshot_date           date NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (casa, parlamentar_nome, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_folha_custo_casa_soma
  ON folha_custo_gabinete (casa, soma_salarios DESC);

COMMENT ON TABLE folha_custo_gabinete IS
  'Custo de pessoal por parlamentar. Senado: salário exato; Câmara: estimado por nível (salario_tipo).';
