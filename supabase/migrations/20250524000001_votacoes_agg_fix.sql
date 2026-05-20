-- Fix: computar_votacoes_agg deve usar apenas votações nominais no denominador.
-- Votações simbólicas (sem votos individuais) não contam para presença.
-- Uma votação nominal é aquela com pelo menos um voto em plen_votos.

CREATE OR REPLACE FUNCTION computar_votacoes_agg(p_legislatura INT DEFAULT 57)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_votacoes      INT;  -- total votações nominais (excluindo simbólicas)
  v_deputados_inseridos INT;
BEGIN
  -- Conta apenas votações com pelo menos 1 voto individual registrado
  SELECT COUNT(DISTINCT pv.votacao_id) INTO v_total_votacoes
  FROM plen_votos pv
  JOIN plen_votacoes v ON v.id = pv.votacao_id AND v.id_legislatura = p_legislatura;

  DELETE FROM plen_deputado_agg WHERE id_legislatura = p_legislatura;

  INSERT INTO plen_deputado_agg (
    deputado_id, id_legislatura, nome, sigla_partido, sigla_uf, url_foto,
    total_votacoes, presencas, ausencias,
    votos_sim, votos_nao, votos_abstencao, votos_obstrucao, votos_artigo17,
    pct_presenca, concordancia_partido,
    posicao, posicao_partido, por_tipo_voto, atualizado_em
  )
  SELECT
    sub.deputado_id,
    p_legislatura,
    sub.nome,
    sub.sigla_partido,
    sub.sigla_uf,
    sub.url_foto,
    v_total_votacoes                                                AS total_votacoes,
    sub.presencas,
    v_total_votacoes - sub.presencas                               AS ausencias,
    sub.votos_sim,
    sub.votos_nao,
    sub.votos_abstencao,
    sub.votos_obstrucao,
    sub.votos_artigo17,
    ROUND(sub.presencas * 100.0 / NULLIF(v_total_votacoes, 0), 2) AS pct_presenca,
    conc.concordancia_partido,
    ROW_NUMBER() OVER (ORDER BY sub.presencas DESC)                AS posicao,
    ROW_NUMBER() OVER (
      PARTITION BY sub.sigla_partido ORDER BY sub.presencas DESC
    )                                                              AS posicao_partido,
    jsonb_build_object(
      'Sim',       sub.votos_sim,
      'Não',       sub.votos_nao,
      'Abstenção', sub.votos_abstencao,
      'Obstrução', sub.votos_obstrucao,
      'Art. 17',   sub.votos_artigo17
    )                                                              AS por_tipo_voto,
    NOW()
  FROM (
    SELECT
      pv.deputado_id,
      MAX(pv.nome)          AS nome,
      MAX(pv.sigla_partido) AS sigla_partido,
      MAX(pv.sigla_uf)      AS sigla_uf,
      MAX(pv.url_foto)      AS url_foto,
      COUNT(*)                                                             AS presencas,
      SUM(CASE WHEN pv.tipo_voto = 'Sim'       THEN 1 ELSE 0 END)        AS votos_sim,
      SUM(CASE WHEN pv.tipo_voto = 'Não'       THEN 1 ELSE 0 END)        AS votos_nao,
      SUM(CASE WHEN pv.tipo_voto = 'Abstenção' THEN 1 ELSE 0 END)        AS votos_abstencao,
      SUM(CASE WHEN pv.tipo_voto = 'Obstrução' THEN 1 ELSE 0 END)        AS votos_obstrucao,
      SUM(CASE WHEN pv.tipo_voto = 'Art. 17'   THEN 1 ELSE 0 END)        AS votos_artigo17
    FROM plen_votos pv
    JOIN plen_votacoes v ON v.id = pv.votacao_id AND v.id_legislatura = p_legislatura
    GROUP BY pv.deputado_id
  ) sub
  LEFT JOIN (
    -- Concordância: % votações onde o dep. seguiu orientação do partido
    -- (exclui "Liberado" e "Art. 17" — sem orientação vinculante)
    SELECT
      pv.deputado_id,
      ROUND(
        SUM(CASE WHEN pv.tipo_voto = o.orientacao THEN 1.0 ELSE 0.0 END)
        / NULLIF(COUNT(*), 0) * 100,
        2
      ) AS concordancia_partido
    FROM plen_votos pv
    JOIN plen_votacoes v    ON v.id = pv.votacao_id AND v.id_legislatura = p_legislatura
    JOIN plen_orientacoes o
      ON  o.votacao_id    = pv.votacao_id
      AND o.sigla_bancada = pv.sigla_partido
      AND o.orientacao NOT IN ('Liberado', 'Art. 17')
    GROUP BY pv.deputado_id
  ) conc ON conc.deputado_id = sub.deputado_id;

  GET DIAGNOSTICS v_deputados_inseridos = ROW_COUNT;

  RETURN jsonb_build_object(
    'status',                'sucesso',
    'legislatura',           p_legislatura,
    'total_votacoes_nominais', v_total_votacoes,
    'deputados_processados', v_deputados_inseridos
  );
END;
$$;
