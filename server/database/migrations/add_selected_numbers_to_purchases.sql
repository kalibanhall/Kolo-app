-- Migration: Add selected_numbers column to purchases table
-- This stores the manually selected ticket numbers as JSON array
-- Format: ["KIS-01", "KND-02"] etc.

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS selected_numbers JSONB DEFAULT NULL;

-- Add index for querying purchases with manual selection
CREATE INDEX IF NOT EXISTS idx_purchases_selected_numbers ON purchases USING gin(selected_numbers) WHERE selected_numbers IS NOT NULL;
