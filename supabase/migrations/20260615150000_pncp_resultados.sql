-- Resultados de licitações PNCP: itens homologados por fornecedor
-- niFornecedor = CNPJ/CPF do vencedor — chave para scorecard por fornecedor

CREATE TABLE IF NOT EXISTS pncp_resultados (
  id_compra_item             TEXT,
  id_compra                  TEXT,
  numero_controle_pncp_compra TEXT,
  orgao_cnpj                 TEXT,
  unidade_codigo             TEXT,
  uf                         TEXT,
  numero_item_pncp           INT,
  sequencial_resultado       INT,
  ni_fornecedor              TEXT,   -- CNPJ (14 dígitos) ou CPF (11 dígitos)
  tipo_pessoa                TEXT,   -- PJ / PF
  nome_fornecedor            TEXT,
  quantidade_homologada      NUMERIC(18,4),
  valor_unitario_homologado  NUMERIC(18,4),
  valor_total_homologado     NUMERIC(18,2),
  percentual_desconto        NUMERIC(8,4),
  situacao_id                INT,
  situacao_nome              TEXT,
  porte_fornecedor_id        INT,
  porte_fornecedor_nome      TEXT,
  natureza_juridica_id       TEXT,
  natureza_juridica_nome     TEXT,
  data_resultado_pncp        TIMESTAMPTZ,
  data_inclusao_pncp         TIMESTAMPTZ,
  data_atualizacao_pncp      TIMESTAMPTZ,
  aplicacao_margem_preferencia BOOLEAN,
  aplicacao_beneficio_meepp  BOOLEAN,
  ingerido_em                TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id_compra_item, sequencial_resultado)
);

CREATE INDEX IF NOT EXISTS idx_pncp_res_fornecedor   ON pncp_resultados (ni_fornecedor);
CREATE INDEX IF NOT EXISTS idx_pncp_res_orgao_cnpj   ON pncp_resultados (orgao_cnpj);
CREATE INDEX IF NOT EXISTS idx_pncp_res_uf            ON pncp_resultados (uf);
CREATE INDEX IF NOT EXISTS idx_pncp_res_data          ON pncp_resultados (data_resultado_pncp);
CREATE INDEX IF NOT EXISTS idx_pncp_res_valor         ON pncp_resultados (valor_total_homologado);
CREATE INDEX IF NOT EXISTS idx_pncp_res_compra        ON pncp_resultados (numero_controle_pncp_compra);

GRANT SELECT ON pncp_resultados TO anon, authenticated;
