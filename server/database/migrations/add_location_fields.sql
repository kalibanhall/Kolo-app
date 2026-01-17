-- Migration: Add location fields to users table
-- Date: 2026-01-17

-- Add latitude column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'latitude') THEN
        ALTER TABLE users ADD COLUMN latitude DECIMAL(10, 8);
    END IF;
END $$;

-- Add longitude column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'longitude') THEN
        ALTER TABLE users ADD COLUMN longitude DECIMAL(11, 8);
    END IF;
END $$;

-- Add location_updated_at column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'location_updated_at') THEN
        ALTER TABLE users ADD COLUMN location_updated_at TIMESTAMP;
    END IF;
END $$;

-- Add province column (derived from city)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'province') THEN
        ALTER TABLE users ADD COLUMN province VARCHAR(100);
    END IF;
END $$;

-- Create index on city for faster queries
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);

-- Create index on province
CREATE INDEX IF NOT EXISTS idx_users_province ON users(province);

-- Comment
COMMENT ON COLUMN users.latitude IS 'User latitude coordinate';
COMMENT ON COLUMN users.longitude IS 'User longitude coordinate';
COMMENT ON COLUMN users.location_updated_at IS 'Last time location was updated';
COMMENT ON COLUMN users.province IS 'Province derived from city';
