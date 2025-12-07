-- Migration: Add secondary_prizes and rules columns to campaigns table
-- Date: 2025-12-07

-- Add secondary_prizes column
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS secondary_prizes TEXT;

-- Add rules column
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS rules TEXT;

-- Add comment
COMMENT ON COLUMN campaigns.secondary_prizes IS 'Secondary prizes for the campaign (one per line)';
COMMENT ON COLUMN campaigns.rules IS 'Campaign rules and conditions';
