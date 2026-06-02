-- Fix: sq_despesa pode ter múltiplas NFs — incluir nr_documento na unique key
ALTER TABLE fundacoes_nf_partidos
  DROP CONSTRAINT IF EXISTS fundacoes_nf_partidos_sq_despesa_aa_exercicio_cnpj_partido_key;

ALTER TABLE fundacoes_nf_partidos
  ADD CONSTRAINT fundacoes_nf_partidos_unique
  UNIQUE (sq_despesa, aa_exercicio, cnpj_partido, nr_documento);
