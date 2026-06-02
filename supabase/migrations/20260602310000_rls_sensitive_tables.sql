-- RLS nas tabelas de dados sensíveis que ainda não tinham proteção formal.
--
-- Contexto: o banco usa service_role key em todos os reads do app (ignora RLS),
-- então habilitar RLS sem policy não muda comportamento existente — só fecha o
-- acesso direto via anon key à API REST do Supabase.
--
-- tse_bens_candidatos: bens declarados item a item (evidência paga, Passo 0).
-- folha_gabinete: folha de pessoal de gabinete (dados de pessoas físicas / LGPD).

ALTER TABLE IF EXISTS public.tse_bens_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.folha_gabinete       ENABLE ROW LEVEL SECURITY;
-- folha_gabinete_atual é uma VIEW — herda RLS da tabela-mãe, não pode ter ALTER TABLE.
