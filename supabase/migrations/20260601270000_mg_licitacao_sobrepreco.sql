-- ─────────────────────────────────────────────────────────────────────────
-- Sobrepreço em licitações (fora COVID) — Executivo de MG.
-- Itens em que o valor unitário HOMOLOGADO superou o valor unitário de
-- REFERÊNCIA do próprio processo (o Estado adjudicou acima do teto estimado).
-- Modo enxuto: só os itens com sobrepreço. Órgão vem do processo (responsável
-- pela homologação); fornecedor só é nomeado quando o processo tem um único
-- fornecedor (evita atribuição errada). Fonte CKAN "Consulta de Licitações MG".
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mg_licitacao_sobrepreco (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano                  int,
  numero_processo      text,
  numero_item          text,
  orgao                text,
  objeto               text,
  fornecedor           text,            -- só quando processo tem 1 fornecedor
  cnpj_norm            text,
  item_descricao       text,
  elemento             text,
  situacao             text,
  quantidade           numeric(18,3),
  vr_unit_referencia   numeric(18,4),
  vr_unit_homologado   numeric(18,4),
  vr_total_referencia  numeric(18,2),
  vr_total_homologado  numeric(18,2),
  sobrepreco_valor     numeric(18,2) GENERATED ALWAYS AS
                         (coalesce(vr_total_homologado, 0) - coalesce(vr_total_referencia, 0)) STORED,
  sobrepreco_pct       numeric(10,2) GENERATED ALWAYS AS
                         (round(((vr_unit_homologado / NULLIF(vr_unit_referencia, 0)) - 1) * 100, 2)) STORED,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (ano, numero_processo, numero_item)
);
CREATE INDEX IF NOT EXISTS idx_mg_lic_sobrepreco_ano ON mg_licitacao_sobrepreco (ano);
CREATE INDEX IF NOT EXISTS idx_mg_lic_sobrepreco_orgao ON mg_licitacao_sobrepreco (orgao);

COMMENT ON TABLE mg_licitacao_sobrepreco IS
  'Itens de licitação (MG, fora COVID) homologados acima do preço de referência. Sinal de sobrepreço; órgão = responsável pela homologação.';
