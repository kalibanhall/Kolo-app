-- Migration: Fix invalid ticket numbers and sync sold_tickets
-- This script fixes tickets that have numbers beyond the campaign's total_tickets limit

-- 1. First, identify invalid tickets (where number > total_tickets)
DO $$ 
BEGIN
  RAISE NOTICE 'Looking for invalid tickets...';
END $$;

-- 2. Delete draw_results that reference invalid tickets first (to avoid FK constraint)
DELETE FROM draw_results dr
WHERE dr.main_winner_ticket_id IN (
  SELECT t.id
  FROM tickets t
  JOIN campaigns c ON t.campaign_id = c.id
  WHERE CAST(REGEXP_REPLACE(t.ticket_number, '[^0-9]', '', 'g') AS INTEGER) > c.total_tickets
);

-- Also check for secondary winner references if they exist
DELETE FROM draw_results dr
WHERE dr.second_winner_ticket_id IN (
  SELECT t.id
  FROM tickets t
  JOIN campaigns c ON t.campaign_id = c.id
  WHERE CAST(REGEXP_REPLACE(t.ticket_number, '[^0-9]', '', 'g') AS INTEGER) > c.total_tickets
);

DELETE FROM draw_results dr
WHERE dr.third_winner_ticket_id IN (
  SELECT t.id
  FROM tickets t
  JOIN campaigns c ON t.campaign_id = c.id
  WHERE CAST(REGEXP_REPLACE(t.ticket_number, '[^0-9]', '', 'g') AS INTEGER) > c.total_tickets
);

-- 3. Now delete the invalid tickets
DELETE FROM tickets t
USING campaigns c
WHERE t.campaign_id = c.id
AND CAST(REGEXP_REPLACE(t.ticket_number, '[^0-9]', '', 'g') AS INTEGER) > c.total_tickets;

-- 4. Sync sold_tickets with actual ticket count for all campaigns
UPDATE campaigns c
SET sold_tickets = (
  SELECT COUNT(*) 
  FROM tickets t 
  WHERE t.campaign_id = c.id
);

-- 5. Log the result
DO $$ 
DECLARE
  campaign_rec RECORD;
BEGIN
  RAISE NOTICE 'Synchronization complete. Current status:';
  FOR campaign_rec IN 
    SELECT c.id, c.title, c.total_tickets, c.sold_tickets, c.ticket_prefix
    FROM campaigns c
    ORDER BY c.id
  LOOP
    RAISE NOTICE 'Campaign %: % - %/% tickets sold (prefix: %)', 
      campaign_rec.id, 
      campaign_rec.title, 
      campaign_rec.sold_tickets, 
      campaign_rec.total_tickets,
      campaign_rec.ticket_prefix;
  END LOOP;
END $$;
