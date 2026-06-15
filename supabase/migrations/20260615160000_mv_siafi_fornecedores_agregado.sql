-- Materialized view: maiores fornecedores SIAFI (somente CNPJs com 14 dígitos)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_siafi_fornecedores AS
SELECT
  cnpj_favorecido,
  nome_favorecido,
  COUNT(*)                       AS n_pagamentos,
  SUM(valor_pagamento_brl)       AS valor_total,
  MIN(data_emissao)              AS primeira_aparicao,
  MAX(data_emissao)              AS ultima_aparicao
FROM siafi_pagamento
WHERE LENGTH(cnpj_favorecido) = 14
GROUP BY cnpj_favorecido, nome_favorecido
ORDER BY valor_total DESC;

CREATE UNIQUE INDEX IF NOT EXISTS mv_siafi_fornecedores_pk
  ON mv_siafi_fornecedores (cnpj_favorecido, nome_favorecido);

CREATE INDEX IF NOT EXISTS mv_siafi_fornecedores_valor
  ON mv_siafi_fornecedores (valor_total DESC);
