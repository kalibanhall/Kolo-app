-- Add 'scheduled' status to campaigns table
-- This allows admin to schedule campaigns that auto-open at start_date

ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check 
  CHECK (status IN ('draft', 'scheduled', 'open', 'closed', 'completed'));
