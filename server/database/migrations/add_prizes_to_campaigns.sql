-- Add second_prize and third_prize columns to campaigns table
-- These columns are optional and allow defining additional prizes

-- Add second_prize column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaigns' AND column_name = 'second_prize') THEN
        ALTER TABLE campaigns ADD COLUMN second_prize VARCHAR(255);
    END IF;
END $$;

-- Add third_prize column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaigns' AND column_name = 'third_prize') THEN
        ALTER TABLE campaigns ADD COLUMN third_prize VARCHAR(255);
    END IF;
END $$;

-- Comments
COMMENT ON COLUMN campaigns.second_prize IS 'Optional second prize for the campaign';
COMMENT ON COLUMN campaigns.third_prize IS 'Optional third prize for the campaign';
