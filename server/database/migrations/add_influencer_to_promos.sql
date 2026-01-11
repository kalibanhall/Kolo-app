-- Migration: Add influencer_name to promo_codes
-- Created: 2026-01-11

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'promo_codes' AND column_name = 'influencer_name') THEN
        ALTER TABLE promo_codes ADD COLUMN influencer_name VARCHAR(255);
    END IF;
END $$;

-- Add index for faster lookup by influencer
CREATE INDEX IF NOT EXISTS idx_promo_codes_influencer ON promo_codes(influencer_name);

-- Add used_count column if not exists (alias for current_uses)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'promo_codes' AND column_name = 'used_count') THEN
        ALTER TABLE promo_codes ADD COLUMN used_count INTEGER DEFAULT 0;
    END IF;
END $$;
