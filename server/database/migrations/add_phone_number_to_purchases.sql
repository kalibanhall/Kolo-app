-- Migration: Add phone_number column to purchases table if not exists
-- Date: 2026-01-26

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchases' AND column_name = 'phone_number') THEN
        ALTER TABLE purchases ADD COLUMN phone_number VARCHAR(20) NOT NULL DEFAULT '';
    END IF;
END $$;

-- Optional: Remove default after backfilling if needed
-- ALTER TABLE purchases ALTER COLUMN phone_number DROP DEFAULT;
