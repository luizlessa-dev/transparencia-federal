-- Semana 3: Notas fiscais dos partidos + fornecedores
-- thebrinsider.com/fundacoes

-- ─────────────────────────────────────────────
-- 1. Notas fiscais dos diretórios nacionais
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fundacoes_nf_partidos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Chave natural TSE
  sq_despesa            bigint NOT NULL,
  aa_exercicio          smallint NOT NULL,

  -- Quem prestou contas (partido)
  cnpj_partido          text NOT NULL,
  sg_partido            text,
  uf                    text DEFAULT 'BR',

  -- Nota fiscal
  nr_documento          text,          -- número do doc
  cd_tipo_despesa       text,          -- código do tipo de despesa
  ds_tipo_despesa       text,          -- descrição (ex: FUNDAÇÃO PARTIDÁRIA, PESSOAL...)
  vr_documento          numeric(18,2),
  dt_pagamento          date,
  url_pdf               text,          -- link direto ao PDF no spcadownload.tse.jus.br

  -- Fornecedor (quem recebeu o pagamento)
  cnpj_fornecedor       text,          -- CNPJ ou CPF do fornecedor
  tipo_fornecedor       text,          -- 'PJ' | 'PF' | 'desconhecido'

  -- Flags derivadas
  eh_repasse_fundacao   boolean DEFAULT false,  -- fornecedor é uma das nossas 25 fundações
  fundacao_cnpj         text,          -- CNPJ da fundação (se eh_repasse_fundacao)

  -- Raw
  dados                 jsonb,
  atualizado_em         timestamptz DEFAULT now(),

  UNIQUE (sq_despesa, aa_exercicio, cnpj_partido)
);

CREATE INDEX IF NOT EXISTS idx_nf_exercicio    ON fundacoes_nf_partidos (aa_exercicio);
CREATE INDEX IF NOT EXISTS idx_nf_partido      ON fundacoes_nf_partidos (sg_partido, aa_exercicio);
CREATE INDEX IF NOT EXISTS idx_nf_fornecedor   ON fundacoes_nf_partidos (cnpj_fornecedor);
CREATE INDEX IF NOT EXISTS idx_nf_fundacao     ON fundacoes_nf_partidos (fundacao_cnpj) WHERE fundacao_cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nf_tipo_despesa ON fundacoes_nf_partidos (ds_tipo_despesa);

COMMENT ON TABLE fundacoes_nf_partidos IS
  'Notas fiscais dos diretórios nacionais dos partidos (dataset TSE). '
  'Cobre TODOS os fornecedores — não só fundações. '
  'NM_URL contém link direto ao PDF em spcadownload.tse.jus.br.';

-- ─────────────────────────────────────────────
-- 2. View: ranking de fornecedores por partido
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW fundacoes_fornecedores_ranking AS
SELECT
  nf.sg_partido,
  nf.cnpj_fornecedor,
  nf.aa_exercicio,
  -- Dados do fornecedor (se for fundação conhecida)
  f.nome_popular          AS nome_fundacao,
  nf.ds_tipo_despesa,
  nf.eh_repasse_fundacao,

  COUNT(*)                AS qtd_nfs,
  SUM(nf.vr_documento)   AS total_pago,
  MIN(nf.dt_pagamento)   AS primeiro_pagamento,
  MAX(nf.dt_pagamento)   AS ultimo_pagamento,
  COUNT(nf.url_pdf) FILTER (WHERE nf.url_pdf IS NOT NULL) AS qtd_pdfs_disponiveis

FROM fundacoes_nf_partidos nf
LEFT JOIN fundacoes_partidarias f ON f.cnpj = nf.fundacao_cnpj
GROUP BY
  nf.sg_partido,
  nf.cnpj_fornecedor,
  nf.aa_exercicio,
  f.nome_popular,
  nf.ds_tipo_despesa,
  nf.eh_repasse_fundacao
ORDER BY total_pago DESC;

COMMENT ON VIEW fundacoes_fornecedores_ranking IS
  'Agregado de NFs por partido × fornecedor × tipo de despesa. '
  'Permite identificar fornecedores recorrentes e volumes por categoria.';

-- ─────────────────────────────────────────────
-- 3. View: vazio das fundações (o silêncio é notícia)
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW fundacoes_vazio_prestacao AS
SELECT
  f.cnpj,
  f.nome_popular,
  f.partido_sigla,
  f.presidente_nome,
  r.total_repassado_2024,
  -- Verifica se a fundação TEM diretório próprio no sistema TSE
  -- (indicado por aparecer como prestadora de contas)
  EXISTS (
    SELECT 1 FROM fundacoes_nf_partidos nf2
    WHERE nf2.cnpj_partido = f.cnpj
    AND nf2.aa_exercicio = 2024
  ) AS presta_contas_proprias,
  -- Número de NFs que o PARTIDO tem pagando PARA a fundação
  COALESCE((
    SELECT COUNT(*) FROM fundacoes_nf_partidos nf3
    WHERE nf3.fundacao_cnpj = f.cnpj
    AND nf3.aa_exercicio = 2024
  ), 0) AS qtd_nfs_recebidas_do_partido
FROM fundacoes_partidarias f
LEFT JOIN fundacoes_ranking_publico r ON r.cnpj = f.cnpj;

COMMENT ON VIEW fundacoes_vazio_prestacao IS
  'Mostra quais fundações prestam contas próprias vs. quais só aparecem '
  'como beneficiárias. O vazio de prestação de contas É a notícia.';

GRANT SELECT ON fundacoes_nf_partidos      TO anon, authenticated;
GRANT SELECT ON fundacoes_fornecedores_ranking TO anon, authenticated;
GRANT SELECT ON fundacoes_vazio_prestacao  TO anon, authenticated;
