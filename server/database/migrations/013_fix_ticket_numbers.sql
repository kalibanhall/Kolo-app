-- Migration: Fix ticket numbers to use proper campaign prefix format
-- Problem: Some tickets were created with "K-XX" instead of "K{PREFIX}-XX"
-- This script updates them to use the correct campaign prefix

-- First, let's see what needs fixing
-- SELECT t.id, t.ticket_number, c.ticket_prefix, c.id as campaign_id
-- FROM tickets t
-- JOIN campaigns c ON t.campaign_id = c.id
-- WHERE t.ticket_number NOT LIKE 'K' || c.ticket_prefix || '-%'
-- AND t.ticket_number LIKE 'K-%';

-- Fix tickets that have format "K-XX" to use campaign prefix "K{PREFIX}-XX"
UPDATE tickets t
SET ticket_number = 'K' || COALESCE(c.ticket_prefix, 'X') || SUBSTRING(t.ticket_number FROM 2)
FROM campaigns c
WHERE t.campaign_id = c.id
  AND t.ticket_number LIKE 'K-%'
  AND t.ticket_number NOT LIKE 'K' || c.ticket_prefix || '-%';

-- Fix tickets that are just numbers (e.g., "1", "2", etc.)
UPDATE tickets t
SET ticket_number = 'K' || COALESCE(c.ticket_prefix, 'X') || '-' || LPAD(t.ticket_number, 
    GREATEST(2, LENGTH(c.total_tickets::text)), '0')
FROM campaigns c
WHERE t.campaign_id = c.id
  AND t.ticket_number ~ '^\d+$';

-- Fix tickets that might have format "XX" (just 2 digits)
UPDATE tickets t
SET ticket_number = 'K' || COALESCE(c.ticket_prefix, 'X') || '-' || LPAD(t.ticket_number, 
    GREATEST(2, LENGTH(c.total_tickets::text)), '0')
FROM campaigns c
WHERE t.campaign_id = c.id
  AND t.ticket_number ~ '^\d{1,4}$';

-- Synchronize sold_tickets count with actual tickets in database
UPDATE campaigns c
SET sold_tickets = (
    SELECT COUNT(*) 
    FROM tickets t 
    WHERE t.campaign_id = c.id 
    AND t.ticket_number NOT LIKE 'TEMP%'
);

-- Add comment to track this migration
COMMENT ON TABLE tickets IS 'Tickets table - migrated on 2026-02-04 to fix ticket_number format';
