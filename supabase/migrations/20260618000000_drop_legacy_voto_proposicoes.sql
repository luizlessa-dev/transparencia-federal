-- Limpeza de objetos legacy órfãos (zero linhas ou zero uses em código/views).
--
-- proposicoes_autores: tabela vazia, função coberta por cam_proposicoes.
-- Cluster camara_* (voto/votacao/orientacao/dissidencia): substituído pelo
-- cluster plen_votos + plen_votacoes, em uso ativo no web e na ingestão.
-- A view camara_dissidencia derivava das 3 tabelas camara_* — droppada junto.

-- Ordem do DROP segue grafo de dependências:
--   views (ranking → dissidencia) → tabelas-filhas (voto, orientacao)
--   → tabela-pai (votacao) → proposicoes_autores.

DROP VIEW  IF EXISTS public.camara_ranking_dissidencia;
DROP VIEW  IF EXISTS public.camara_dissidencia;
DROP TABLE IF EXISTS public.camara_voto;
DROP TABLE IF EXISTS public.camara_orientacao;
DROP TABLE IF EXISTS public.camara_votacao;
DROP TABLE IF EXISTS public.proposicoes_autores;
