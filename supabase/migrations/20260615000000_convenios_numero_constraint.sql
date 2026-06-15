-- Converte o unique index em constraint para suportar ON CONFLICT (numero)
ALTER TABLE convenios ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE convenios DROP CONSTRAINT IF EXISTS convenios_numero_key;
ALTER TABLE convenios ADD CONSTRAINT convenios_numero_key UNIQUE (numero);
