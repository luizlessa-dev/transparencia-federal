-- Adiciona colunas novas à tabela viagens (que já existia com schema antigo)
ALTER TABLE viagens
  ADD COLUMN IF NOT EXISTS pcdp             text,
  ADD COLUMN IF NOT EXISTS num_pcdp         text,
  ADD COLUMN IF NOT EXISTS motivo           text,
  ADD COLUMN IF NOT EXISTS situacao         text,
  ADD COLUMN IF NOT EXISTS tipo_viagem      text,
  ADD COLUMN IF NOT EXISTS urgencia         boolean,
  ADD COLUMN IF NOT EXISTS beneficiario_nome text,
  ADD COLUMN IF NOT EXISTS beneficiario_cpf  text,
  ADD COLUMN IF NOT EXISTS cargo            text,
  ADD COLUMN IF NOT EXISTS funcao           text,
  ADD COLUMN IF NOT EXISTS orgao_codigo     text,
  ADD COLUMN IF NOT EXISTS orgao_nome       text,
  ADD COLUMN IF NOT EXISTS orgao_sigla      text,
  ADD COLUMN IF NOT EXISTS orgao_poder      text,
  ADD COLUMN IF NOT EXISTS data_inicio      date,
  ADD COLUMN IF NOT EXISTS data_fim         date,
  ADD COLUMN IF NOT EXISTS valor_diarias    numeric(14,2),
  ADD COLUMN IF NOT EXISTS valor_passagem   numeric(14,2),
  ADD COLUMN IF NOT EXISTS valor_total      numeric(14,2),
  ADD COLUMN IF NOT EXISTS atualizado_em    timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_viagens_orgao    ON viagens (orgao_codigo);
CREATE INDEX IF NOT EXISTS idx_viagens_periodo  ON viagens (data_inicio);
CREATE INDEX IF NOT EXISTS idx_viagens_nome     ON viagens (beneficiario_nome);
