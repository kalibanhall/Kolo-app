-- Migration: Add ticket_prefix to campaigns table
-- Date: 2026-01-26
-- Description: Each campaign will have a unique letter prefix for ticket numbering
-- Example: Campaign with prefix 'B' will have tickets KB-01, KB-02, etc.

-- Add ticket_prefix column (single letter, unique per campaign)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ticket_prefix VARCHAR(2);

-- Create unique index on ticket_prefix to ensure no duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_ticket_prefix ON campaigns(ticket_prefix) WHERE ticket_prefix IS NOT NULL;

-- Update the unique constraint on tickets to be per campaign (compound key)
-- First, drop the old global constraint if it exists
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_ticket_number_key;

-- Create new unique constraint: ticket_number must be unique within a campaign
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_campaign_ticket_number ON tickets(campaign_id, ticket_number);
