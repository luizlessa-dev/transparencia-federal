-- id_portal é da ingestão via API REST; ingestão via CSV não tem esse campo
ALTER TABLE convenios ALTER COLUMN id_portal DROP NOT NULL;
