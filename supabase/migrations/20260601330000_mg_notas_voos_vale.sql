-- ─────────────────────────────────────────────────────────────────────────
-- Achados do sweep do catálogo (eixos que haviam escapado):
--  • mg_notas_fornecedor — notas fiscais recebidas pelo Estado, AGREGADAS por
--    fornecedor (CNPJ) e ano. Nominativo → melhor base do scorecard.
--  • mg_voos_governador  — voos oficiais (passageiro, rota, aeronave).
--  • mg_despesa_pessoal_vale — pessoal pago com o acordo Vale/Brumadinho.
-- (Despesa pública NÃO entra: favorecido anonimizado.) Fonte CKAN CC-BY-4.0.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mg_notas_fornecedor (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj_norm    text,
  nome         text,
  ano          int,
  n_notas      int,
  valor_total  numeric(18,2),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (cnpj_norm, ano)
);
CREATE INDEX IF NOT EXISTS idx_mg_notas_forn_cnpj ON mg_notas_fornecedor (cnpj_norm);
CREATE INDEX IF NOT EXISTS idx_mg_notas_forn_ano ON mg_notas_fornecedor (ano);

CREATE TABLE IF NOT EXISTS mg_voos_governador (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_db        text,
  data_voo         date,
  aeronave         text,
  base             text,
  origem           text,
  destino          text,
  horas_voadas     text,
  historico        text,
  passageiro       text,
  cargo_passageiro text,
  orgao_passageiro text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (numero_db, passageiro, destino)
);
CREATE INDEX IF NOT EXISTS idx_mg_voos_data ON mg_voos_governador (data_voo);

CREATE TABLE IF NOT EXISTS mg_despesa_pessoal_vale (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano_mes          int,
  masp             text,
  orgao_sigla      text,
  orgao            text,
  nome             text,
  valor            numeric(18,2),
  cargo_sigla      text,
  cargo_descricao  text,
  data_inicio      date,
  data_termino     date,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (ano_mes, masp, cargo_sigla)
);
CREATE INDEX IF NOT EXISTS idx_mg_vale_anomes ON mg_despesa_pessoal_vale (ano_mes);

COMMENT ON TABLE mg_notas_fornecedor IS
  'Notas fiscais recebidas pelo Estado de MG, agregadas por fornecedor (CNPJ) e ano. Nominativo. CKAN.';
COMMENT ON TABLE mg_voos_governador IS
  'Voos oficiais do Governador de MG: passageiro, cargo, rota, aeronave, horas. CKAN.';
COMMENT ON TABLE mg_despesa_pessoal_vale IS
  'Pessoal pago com o Acordo Judicial Vale/Brumadinho (nominativo, servidores). CKAN/LAI.';
