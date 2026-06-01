-- ─────────────────────────────────────────────────────────────────────────
-- mg_remuneracao — ajuste ao schema REAL do dataset da CGE
-- (remuneracao-servidores-ativos, confirmado via CKAN datastore).
--
-- Descoberta: o dataset traz a coluna `teto` = VALOR DO ABATE-TETO (quanto foi
-- cortado por exceder o teto constitucional). É o sinal OFICIAL de supersalário
-- — melhor que comparar contra um teto chutado. Adicionamos `abate_teto` e
-- redefinimos `acima_teto` pra usar esse sinal (com fallback no teto_referencia).
--
-- Tabela está vazia (recém-criada) → drop/recreate das colunas geradas é seguro.
-- ─────────────────────────────────────────────────────────────────────────

-- Views dependem das colunas geradas; recriadas ao final.
DROP VIEW IF EXISTS mg_supersalarios;
DROP VIEW IF EXISTS mg_remuneracao_atual;

ALTER TABLE mg_remuneracao DROP COLUMN IF EXISTS acima_teto;
ALTER TABLE mg_remuneracao DROP COLUMN IF EXISTS valor_excedente;

-- Valor do abate-teto aplicado na competência (0 = não houve abate).
ALTER TABLE mg_remuneracao ADD COLUMN IF NOT EXISTS abate_teto numeric(14, 2);

-- acima_teto: sinal oficial (houve abate) OU base acima do teto de referência.
ALTER TABLE mg_remuneracao
  ADD COLUMN acima_teto boolean GENERATED ALWAYS AS (
    COALESCE(abate_teto, 0) > 0 OR remuneracao_base > teto_referencia
  ) STORED;

-- valor_excedente: se houve abate, é o próprio abate; senão, base − teto.
ALTER TABLE mg_remuneracao
  ADD COLUMN valor_excedente numeric(14, 2) GENERATED ALWAYS AS (
    CASE WHEN COALESCE(abate_teto, 0) > 0 THEN abate_teto
         ELSE GREATEST(remuneracao_base - teto_referencia, 0) END
  ) STORED;

COMMENT ON COLUMN mg_remuneracao.abate_teto IS
  'Valor do abate-teto aplicado (coluna `teto` da fonte). > 0 ⇒ servidor excedeu o teto constitucional.';

CREATE INDEX IF NOT EXISTS idx_mg_remuneracao_acima_teto
  ON mg_remuneracao (snapshot_mes) WHERE acima_teto;

-- Recria as views (mg_supersalarios agora expõe abate_teto).
CREATE OR REPLACE VIEW mg_remuneracao_atual AS
SELECT r.*
FROM mg_remuneracao r
JOIN (SELECT max(snapshot_mes) AS snapshot_mes FROM mg_remuneracao) u
  ON u.snapshot_mes = r.snapshot_mes;

COMMENT ON VIEW mg_remuneracao_atual IS 'Último snapshot de mg_remuneracao.';

CREATE OR REPLACE VIEW mg_supersalarios AS
SELECT orgao, servidor_nome, cargo, situacao,
       remuneracao_bruta, remuneracao_liquida, remuneracao_base,
       abate_teto, teto_referencia, valor_excedente,
       ano, mes, snapshot_mes, url_origem
FROM mg_remuneracao_atual
WHERE acima_teto
ORDER BY valor_excedente DESC NULLS LAST;

COMMENT ON VIEW mg_supersalarios IS
  'Servidores do Executivo de MG acima do teto (abate-teto > 0 ou base > teto), último snapshot.';
