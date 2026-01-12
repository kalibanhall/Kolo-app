-- Migration: Add support for multiple campaigns and optional fields
-- Date: 2026-01-12

-- Add secondary_prizes column if not exists
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS secondary_prizes TEXT;

-- Add third_prize column for optional third prize
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS third_prize TEXT;

-- Add rules column if not exists
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS rules TEXT;

-- Make end_date nullable (optional)
ALTER TABLE campaigns 
ALTER COLUMN end_date DROP NOT NULL;

-- Make draw_date nullable (already should be, but ensure it)
ALTER TABLE campaigns 
ALTER COLUMN draw_date DROP NOT NULL;

-- Add created_by column if not exists
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- Add display_order for controlling campaign order in slider
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add is_featured to highlight certain campaigns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Create index for active campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_display_order ON campaigns(display_order);

-- Comments
COMMENT ON COLUMN campaigns.secondary_prizes IS 'Second prize (optional)';
COMMENT ON COLUMN campaigns.third_prize IS 'Third prize (optional)';
COMMENT ON COLUMN campaigns.rules IS 'Campaign rules and conditions';
COMMENT ON COLUMN campaigns.display_order IS 'Order for displaying in slider (lower = first)';
COMMENT ON COLUMN campaigns.is_featured IS 'Whether campaign is featured/highlighted';
