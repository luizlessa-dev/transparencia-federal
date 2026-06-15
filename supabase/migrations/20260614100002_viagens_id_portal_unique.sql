ALTER TABLE viagens ADD COLUMN IF NOT EXISTS id_portal bigint;
CREATE UNIQUE INDEX IF NOT EXISTS idx_viagens_id_portal ON viagens (id_portal);
