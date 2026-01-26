-- Migration: Add date_of_birth to users table
-- Date: 2026-01-26
-- Description: Add date of birth field to verify users are 18+ for tombola participation

-- Add date_of_birth column
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Create index for age verification queries
CREATE INDEX IF NOT EXISTS idx_users_date_of_birth ON users(date_of_birth);

-- Comment: The application should verify that users are at least 18 years old
-- before allowing them to participate in the tombola
