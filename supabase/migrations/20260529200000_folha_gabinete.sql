-- ─────────────────────────────────────────────────────────────────────────
-- folha_gabinete — staff (pessoal) dos gabinetes parlamentares federais
--
-- Fase 1: grafo "quem trabalha pra qual gabinete". SEM salário ainda
-- (valor_remuneracao fica NULL; preenchido na Fase 2, quando a remuneração
-- individual em bulk for resolvida).
--
-- Fontes (snapshot, sem histórico nativo — nós historiamos via snapshot mensal):
--   Câmara: dadosabertos.camara.leg.br/arquivos/funcionarios/csv/funcionarios.csv
--           (grupo = "Secretário Parlamentar"; uriLotacao traz o ID do deputado)
--   Senado: senado.leg.br/transparencia/lai/secrh/servidores_comissionados.csv
--           (SETOR2 = "GABSEN ..."; SETOR_EXERCÍCIO traz o gabinete do senador)
--
-- parlamentar_id_externo é referência SOFT (sem FK): o snapshot pode citar
-- gabinetes/órgãos que não estão em deputados_brutas, e não queremos que um
-- lote inteiro falhe por isso. O join fica a cargo do analytics.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS folha_gabinete (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  casa                    text NOT NULL CHECK (casa IN ('camara', 'senado')),
  snapshot_date           date NOT NULL,                 -- 1º dia do mês do snapshot
  chave_natural           text NOT NULL,                 -- camara: ponto; senado: nome|gab_codigo
  secretario_nome         text NOT NULL,
  secretario_id_externo   text,                          -- camara: ponto (P_xxxxx); senado: NULL
  cargo                   text,                          -- camara: nível SP (ex: SP09C); senado: cargo
  funcao                  text,
  vinculo                 text,                          -- senado: TIPO DO VÍNCULO
  parlamentar_id_externo  text,                          -- camara: id_externo do deputado (de uriLotacao)
  parlamentar_nome        text,                          -- nome extraído da lotação/setor
  gabinete_codigo         text,                          -- camara: "4/511"; senado: "GSACORON"
  gabinete_raw            text,                          -- string original da lotação
  data_nomeacao           date,                          -- camara
  data_admissao           date,                          -- senado
  valor_remuneracao       numeric(12, 2),                -- NULL na Fase 1
  dados                   jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (casa, chave_natural, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_folha_gabinete_parlamentar
  ON folha_gabinete (parlamentar_id_externo);
CREATE INDEX IF NOT EXISTS idx_folha_gabinete_casa_snapshot
  ON folha_gabinete (casa, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_folha_gabinete_parlamentar_nome
  ON folha_gabinete (parlamentar_nome);
CREATE INDEX IF NOT EXISTS idx_folha_gabinete_secretario_nome
  ON folha_gabinete (secretario_nome);

COMMENT ON TABLE folha_gabinete IS
  'Staff de gabinete federal (Câmara: secretários parlamentares; Senado: comissionados GABSEN). Fase 1 sem salário.';
COMMENT ON COLUMN folha_gabinete.parlamentar_id_externo IS
  'Referência soft (sem FK) a deputados_brutas.id_externo. Câmara apenas; Senado liga por parlamentar_nome.';
COMMENT ON COLUMN folha_gabinete.valor_remuneracao IS
  'NULL na Fase 1. Preenchido na Fase 2 (remuneração individual em bulk).';

-- View: snapshot mais recente por casa (consumo direto pela web/analytics).
CREATE OR REPLACE VIEW folha_gabinete_atual AS
SELECT f.*
FROM folha_gabinete f
JOIN (
  SELECT casa, max(snapshot_date) AS snapshot_date
  FROM folha_gabinete
  GROUP BY casa
) ultimo
  ON ultimo.casa = f.casa
 AND ultimo.snapshot_date = f.snapshot_date;

COMMENT ON VIEW folha_gabinete_atual IS
  'Último snapshot de folha_gabinete por casa.';
