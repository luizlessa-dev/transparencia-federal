-- Viagens de servidores federais (Portal da Transparência)
CREATE TABLE IF NOT EXISTS viagens (
  id                    bigint PRIMARY KEY,
  pcdp                  text,
  num_pcdp              text,
  motivo                text,
  situacao              text,
  tipo_viagem           text,
  urgencia              boolean,
  beneficiario_nome     text,
  beneficiario_cpf      text,
  cargo                 text,
  funcao                text,
  orgao_codigo          text,
  orgao_nome            text,
  orgao_sigla           text,
  orgao_poder           text,
  data_inicio           date,
  data_fim              date,
  valor_diarias         numeric(14,2),
  valor_passagem        numeric(14,2),
  valor_total           numeric(14,2),
  atualizado_em         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viagens_orgao    ON viagens (orgao_codigo);
CREATE INDEX IF NOT EXISTS idx_viagens_periodo  ON viagens (data_inicio);
