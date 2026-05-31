-- ─────────────────────────────────────────────────────────────────────────
-- Leads de investigação a partir de folha_gabinete (Fase 1).
-- NÃO são acusações — são candidatos a apuração jornalística, com match por
-- nome (sujeito a homônimo). Exigem verificação e direito de resposta.
--
--   folha_doador_leads   — secretário que é DOADOR (top) da campanha do
--                          próprio chefe. Candidato casado por CPF; doador
--                          casado por nome normalizado (só doador PF).
--   folha_nepotismo_leads— secretário cujo sobrenome bate com o de um
--                          parlamentar de OUTRO gabinete (possível troca de
--                          favores). Sinal fraco: sobrenome comum é excluído.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS folha_doador_leads (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  casa                    text NOT NULL,
  parlamentar_id_externo  text,
  parlamentar_nome        text,
  secretario_nome         text NOT NULL,
  doador_nome             text NOT NULL,
  doador_cpf_cnpj         text,
  valor_doado             numeric(14, 2),
  ano_eleicao             smallint,
  snapshot_date           date NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (casa, parlamentar_id_externo, secretario_nome, ano_eleicao)
);

CREATE INDEX IF NOT EXISTS idx_folha_doador_leads_parlamentar
  ON folha_doador_leads (parlamentar_id_externo);

COMMENT ON TABLE folha_doador_leads IS
  'Leads: secretário parlamentar que consta como top-doador da campanha do próprio chefe. Match por nome — verificar antes de publicar.';

CREATE TABLE IF NOT EXISTS folha_nepotismo_leads (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  casa                        text NOT NULL,
  secretario_nome             text NOT NULL,
  gabinete_parlamentar_nome   text,                 -- onde o secretário trabalha
  gabinete_parlamentar_id     text,
  sobrenome                   text NOT NULL,        -- sobrenome compartilhado
  parlamentar_homonimo_nome   text NOT NULL,        -- parlamentar (outro gabinete) com o mesmo sobrenome
  parlamentar_homonimo_id     text,
  snapshot_date               date NOT NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (casa, secretario_nome, gabinete_parlamentar_id, parlamentar_homonimo_id)
);

CREATE INDEX IF NOT EXISTS idx_folha_nepotismo_leads_sobrenome
  ON folha_nepotismo_leads (sobrenome);

COMMENT ON TABLE folha_nepotismo_leads IS
  'Leads de nepotismo cruzado: secretário com sobrenome de parlamentar de outro gabinete. Sinal fraco — sobrenomes comuns excluídos. Verificar parentesco.';
