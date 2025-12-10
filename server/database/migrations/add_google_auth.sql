-- Migration: Add Google Auth columns to users table
-- Run this migration to enable Google Sign-In

-- Add google_id column for Google OAuth
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Add photo_url column for profile pictures
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Make password_hash nullable for Google-only users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Create index for faster Google ID lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
