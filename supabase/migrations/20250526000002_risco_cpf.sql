-- Adiciona CPF ao perfil de risco para join com dados TSE
ALTER TABLE cam_parlamentar_risco
  ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Índice para joins por CPF com tse_candidatos_receitas_agg
CREATE INDEX IF NOT EXISTS idx_cam_parlamentar_risco_cpf
  ON cam_parlamentar_risco(cpf)
  WHERE cpf IS NOT NULL;
