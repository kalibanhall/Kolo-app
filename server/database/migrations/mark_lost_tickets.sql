-- Migration: Mark existing non-winning tickets as 'lost'
-- Date: 2026-01-30
-- Description: For campaigns that have already been completed, mark all non-winning tickets as 'lost'

-- First, drop and recreate the check constraint to allow 'lost' status
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
  CHECK (status IN ('active', 'winner', 'cancelled', 'lost'));

-- Update tickets for completed/drawn campaigns
UPDATE tickets t
SET status = 'lost'
FROM campaigns c
WHERE t.campaign_id = c.id
  AND c.status IN ('completed', 'drawn')
  AND t.is_winner = false
  AND t.status = 'active';

-- Log how many were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Marked % tickets as lost', updated_count;
END $$;
