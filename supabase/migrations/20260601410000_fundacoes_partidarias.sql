-- Observatório das Fundações Partidárias
-- Fonte primária: Dados Abertos TSE (prestacao_contas_anual_partidaria)
-- Fonte secundária: BrasilAPI (CNPJ/QSA)
-- Path: thebrinsider.com/fundacoes

-- ─────────────────────────────────────────────
-- 1. Cadastro das 26 fundações partidárias
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fundacoes_partidarias (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identidade
  cnpj                    text NOT NULL,
  razao_social            text NOT NULL,
  nome_popular            text,                    -- ex: "Fundação Álvaro Valle"
  partido_sigla           text NOT NULL,           -- ex: "PL"
  partido_cnpj            text,

  -- Endereço (da Receita Federal via BrasilAPI)
  logradouro              text,
  numero                  text,
  complemento             text,
  bairro                  text,
  municipio               text,
  uf                      text,
  cep                     text,
  telefone                text,

  -- Dados cadastrais
  data_abertura           date,
  capital_social          numeric(18,2) DEFAULT 0,
  natureza_juridica       text,
  situacao_cadastral      smallint,               -- 2=ativa

  -- Dirigente principal (QSA)
  presidente_nome         text,
  presidente_desde        date,

  -- Flags analíticos
  mesmo_endereco_partido  boolean DEFAULT false,  -- sede coincide com o partido?
  mesmo_telefone_partido  boolean DEFAULT false,

  -- Raw
  dados_brasilapi         jsonb,
  atualizado_em           timestamptz NOT NULL DEFAULT now(),

  UNIQUE (cnpj)
);

CREATE INDEX IF NOT EXISTS idx_fundacoes_partido  ON fundacoes_partidarias (partido_sigla);
CREATE INDEX IF NOT EXISTS idx_fundacoes_uf       ON fundacoes_partidarias (uf);
CREATE INDEX IF NOT EXISTS idx_fundacoes_endereco ON fundacoes_partidarias (mesmo_endereco_partido);

COMMENT ON TABLE fundacoes_partidarias IS
  'Cadastro das 26 fundações e institutos partidários registrados no TSE. '
  'Enriquecido com QSA e endereço da Receita Federal via BrasilAPI.';

-- ─────────────────────────────────────────────
-- 2. Repasses partido → fundação (CSV TSE anual)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fundacoes_repasses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Chave natural TSE
  sq_despesa        bigint NOT NULL,
  aa_exercicio      smallint NOT NULL,

  -- Partido remetente
  sg_partido        text NOT NULL,
  nm_partido        text,
  cnpj_partido      text,

  -- Fundação destinatária
  cnpj_fundacao     text NOT NULL,
  nm_fundacao       text,

  -- Classificação do gasto
  ds_gasto          text,                          -- descrição TSE original
  tipo_repasse      text NOT NULL DEFAULT 'outros',
    -- 'fundacao_partidaria' | 'aluguel' | 'servico' | 'outros'

  -- Valores
  dt_pagamento      date,
  vr_pagamento      numeric(18,2) NOT NULL DEFAULT 0,
  cd_fonte_despesa  smallint,
  ds_fonte_despesa  text,                          -- "Fundo Partidário" etc.

  -- Raw
  dados             jsonb,
  atualizado_em     timestamptz NOT NULL DEFAULT now(),

  UNIQUE (sq_despesa, aa_exercicio)
);

CREATE INDEX IF NOT EXISTS idx_repasses_exercicio  ON fundacoes_repasses (aa_exercicio);
CREATE INDEX IF NOT EXISTS idx_repasses_partido    ON fundacoes_repasses (sg_partido, aa_exercicio);
CREATE INDEX IF NOT EXISTS idx_repasses_fundacao   ON fundacoes_repasses (cnpj_fundacao, aa_exercicio);
CREATE INDEX IF NOT EXISTS idx_repasses_tipo       ON fundacoes_repasses (tipo_repasse);
CREATE INDEX IF NOT EXISTS idx_repasses_pagamento  ON fundacoes_repasses (dt_pagamento);

COMMENT ON TABLE fundacoes_repasses IS
  'Repasses de partidos para suas fundações/institutos. '
  'Fonte: dataset despesa_anual_{ANO}_BR.csv do TSE (Dados Abertos). '
  'Filtro: NR_CPF_CNPJ_FORNECEDOR = CNPJ de fundação conhecida.';

COMMENT ON COLUMN fundacoes_repasses.tipo_repasse IS
  'fundacao_partidaria = classificado pelo TSE como tal; '
  'aluguel = locação de imóvel; servico = outro serviço; outros = demais.';

-- ─────────────────────────────────────────────
-- 3. View resumo por fundação por exercício
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW fundacoes_resumo AS
SELECT
  r.cnpj_fundacao,
  f.nome_popular,
  f.razao_social,
  r.sg_partido,
  r.aa_exercicio,

  -- Volume
  COUNT(*)                                              AS qtd_repasses,
  SUM(r.vr_pagamento)                                   AS total_repassado,
  AVG(r.vr_pagamento)                                   AS media_por_repasse,

  -- Breakdown por tipo
  SUM(r.vr_pagamento) FILTER (WHERE r.tipo_repasse = 'fundacao_partidaria')
                                                        AS total_fundacao_partidaria,
  SUM(r.vr_pagamento) FILTER (WHERE r.tipo_repasse = 'aluguel')
                                                        AS total_aluguel,
  SUM(r.vr_pagamento) FILTER (WHERE r.tipo_repasse = 'servico')
                                                        AS total_servico,

  -- Distribuição temporal (quantos meses tiveram repasse)
  COUNT(DISTINCT date_trunc('month', r.dt_pagamento))   AS meses_com_repasse,

  -- Concentração no 4º trimestre (out-dez)
  SUM(r.vr_pagamento) FILTER (
    WHERE EXTRACT(MONTH FROM r.dt_pagamento) IN (10,11,12)
  )                                                     AS total_q4,

  ROUND(
    100.0 * SUM(r.vr_pagamento) FILTER (
      WHERE EXTRACT(MONTH FROM r.dt_pagamento) IN (10,11,12)
    ) / NULLIF(SUM(r.vr_pagamento), 0),
    1
  )                                                     AS pct_q4,

  -- Flags
  f.mesmo_endereco_partido,
  f.presidente_nome

FROM fundacoes_repasses r
LEFT JOIN fundacoes_partidarias f ON f.cnpj = r.cnpj_fundacao
GROUP BY
  r.cnpj_fundacao,
  f.nome_popular,
  f.razao_social,
  r.sg_partido,
  r.aa_exercicio,
  f.mesmo_endereco_partido,
  f.presidente_nome;

COMMENT ON VIEW fundacoes_resumo IS
  'Agregado por fundação por exercício. Inclui concentração Q4, breakdown '
  'por tipo de repasse e flags de mesmo endereço.';

-- ─────────────────────────────────────────────
-- 4. Permissões (padrão do projeto)
-- ─────────────────────────────────────────────
GRANT SELECT ON fundacoes_partidarias TO anon, authenticated;
GRANT SELECT ON fundacoes_repasses    TO anon, authenticated;
GRANT SELECT ON fundacoes_resumo      TO anon, authenticated;
