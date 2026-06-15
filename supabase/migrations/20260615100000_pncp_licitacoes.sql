CREATE TABLE IF NOT EXISTS pncp_licitacoes (
  numero_controle_pncp   TEXT PRIMARY KEY,
  orgao_cnpj             TEXT,
  orgao_nome             TEXT,
  poder_id               TEXT,
  esfera_id              TEXT,
  ano_compra             INT,
  sequencial_compra      INT,
  numero_compra          TEXT,
  processo               TEXT,
  modalidade_id          INT,
  modalidade_nome        TEXT,
  modo_disputa_id        INT,
  modo_disputa_nome      TEXT,
  objeto_compra          TEXT,
  valor_estimado         NUMERIC(18,2),
  valor_homologado       NUMERIC(18,2),
  data_publicacao_pncp   TIMESTAMPTZ,
  data_abertura_proposta TIMESTAMPTZ,
  data_encerramento_proposta TIMESTAMPTZ,
  data_inclusao          TIMESTAMPTZ,
  data_atualizacao       TIMESTAMPTZ,
  situacao_id            INT,
  situacao_nome          TEXT,
  uf                     TEXT,
  municipio_nome         TEXT,
  municipio_ibge         TEXT,
  unidade_codigo         TEXT,
  unidade_nome           TEXT,
  emenda_parlamentar     BOOLEAN,
  srp                    BOOLEAN,
  existe_resultado       BOOLEAN,
  link_sistema_origem    TEXT,
  dados                  JSONB DEFAULT '{}',
  ingerido_em            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pncp_orgao_cnpj ON pncp_licitacoes (orgao_cnpj);
CREATE INDEX IF NOT EXISTS idx_pncp_uf ON pncp_licitacoes (uf);
CREATE INDEX IF NOT EXISTS idx_pncp_modalidade ON pncp_licitacoes (modalidade_id);
CREATE INDEX IF NOT EXISTS idx_pncp_data_pub ON pncp_licitacoes (data_publicacao_pncp);
CREATE INDEX IF NOT EXISTS idx_pncp_emenda ON pncp_licitacoes (emenda_parlamentar) WHERE emenda_parlamentar = true;
CREATE INDEX IF NOT EXISTS idx_pncp_valor ON pncp_licitacoes (valor_estimado);
CREATE INDEX IF NOT EXISTS idx_pncp_situacao ON pncp_licitacoes (situacao_id);

GRANT SELECT ON pncp_licitacoes TO anon, authenticated;
