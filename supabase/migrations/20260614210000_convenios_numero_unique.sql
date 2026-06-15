-- Adiciona unique constraint em numero para upsert via CSV bulk
-- (a ingestão por API usa id_portal; a via CSV usa o numero do convênio)
ALTER TABLE convenios ADD COLUMN IF NOT EXISTS numero_siconv text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_convenios_numero ON convenios (numero) WHERE numero IS NOT NULL;
