-- Migration: Add unique constraint on tickets to prevent duplicates
-- Date: 2026-01-30
-- Description: Ensures no duplicate ticket numbers can be created for the same campaign

-- Add unique constraint on (ticket_number, campaign_id)
-- This prevents race conditions where the same ticket is assigned twice
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tickets_ticket_number_campaign_id_unique'
  ) THEN
    -- First, check for and remove any existing duplicates
    DELETE FROM tickets t1
    USING tickets t2
    WHERE t1.id > t2.id 
      AND t1.ticket_number = t2.ticket_number 
      AND t1.campaign_id = t2.campaign_id;
    
    -- Now add the unique constraint
    ALTER TABLE tickets 
    ADD CONSTRAINT tickets_ticket_number_campaign_id_unique 
    UNIQUE (ticket_number, campaign_id);
    
    RAISE NOTICE 'Added unique constraint on tickets(ticket_number, campaign_id)';
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
END $$;

-- Create index for faster lookups if not exists
CREATE INDEX IF NOT EXISTS idx_tickets_campaign_number 
ON tickets(campaign_id, ticket_number);

-- Add comment
COMMENT ON CONSTRAINT tickets_ticket_number_campaign_id_unique ON tickets 
IS 'Ensures each ticket number is unique within a campaign';
