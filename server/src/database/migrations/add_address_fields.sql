-- Migration: Add address fields to users table
-- Run this in your Supabase SQL editor or using psql

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(200),
ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(200),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS province VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

-- Create index on city for potential filtering
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);

-- Verify the changes
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('address_line1', 'address_line2', 'city', 'province', 'postal_code');
