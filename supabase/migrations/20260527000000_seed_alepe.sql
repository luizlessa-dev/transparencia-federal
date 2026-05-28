-- Seed da Assembleia Legislativa de Pernambuco (ALEPE) na tabela `casas`.
-- Idempotente via ON CONFLICT DO NOTHING.

INSERT INTO public.casas (sigla, nome, esfera, uf, url_dados_abertos, url_transparencia, observacoes)
VALUES (
  'ALEPE',
  'Assembleia Legislativa de Pernambuco',
  'estadual',
  'PE',
  'https://www.alepe.pe.gov.br/dadosabertos/',
  'https://www.alepe.pe.gov.br/servicos/transparencia/',
  'API PHP sem autenticação. Endpoints: deputados.php, verbaindenizatoria.php, verbaindenizatorianotas.php. Histórico desde 2015.'
)
ON CONFLICT (sigla) DO NOTHING;
