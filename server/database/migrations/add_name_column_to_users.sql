-- Migration: Add name column to users table
-- This column is required by the application for user display names

-- Add name column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);

-- Update existing users with empty name to use email prefix as name
UPDATE users 
SET name = COALESCE(
    NULLIF(name, ''),
    SPLIT_PART(email, '@', 1)
)
WHERE name IS NULL OR name = '';

-- Make name NOT NULL with a default
ALTER TABLE users ALTER COLUMN name SET DEFAULT '';

-- Create index on name for faster searches
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
