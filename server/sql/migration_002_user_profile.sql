-- ╔══════════════════════════════════════════════════════════════╗
-- ║  FOLIO — Migración 002                                       ║
-- ║  Perfil completo de usuario:                                 ║
-- ║   - Cédula ecuatoriana (10 dígitos, validada en backend)     ║
-- ║   - Estado civil (soltero / casado / viudo)                  ║
-- ║   - Avatar (data URL o ruta a archivo)                       ║
-- ║                                                              ║
-- ║  Idempotente: usa ADD COLUMN IF NOT EXISTS y bloques DO.     ║
-- ╚══════════════════════════════════════════════════════════════╝

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS cedula         VARCHAR(10),
    ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS avatar_url     TEXT;

-- Constraint de estado civil (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_marital_status_check') THEN
        ALTER TABLE users
            ADD CONSTRAINT users_marital_status_check
            CHECK (marital_status IS NULL OR marital_status IN ('soltero','casado','viudo'));
    END IF;
END $$;

-- Constraint de formato de cédula (10 dígitos numéricos)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_cedula_format_check') THEN
        ALTER TABLE users
            ADD CONSTRAINT users_cedula_format_check
            CHECK (cedula IS NULL OR cedula ~ '^[0-9]{10}$');
    END IF;
END $$;

-- Unicidad de cédula (NULLs permitidos múltiples)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_cedula_unique') THEN
        ALTER TABLE users
            ADD CONSTRAINT users_cedula_unique UNIQUE (cedula);
    END IF;
END $$;
