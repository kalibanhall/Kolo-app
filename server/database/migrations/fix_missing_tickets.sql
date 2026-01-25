-- Migration: Fix missing tickets for completed purchases
-- Date: 2026-01-25
-- Description: Generate tickets for purchases that were marked as completed but have no tickets

-- First, let's identify the problem purchases
-- Run this SELECT first to see what needs to be fixed:
/*
SELECT 
  p.id as purchase_id,
  p.user_id,
  p.campaign_id,
  p.ticket_count,
  p.payment_status,
  p.created_at,
  p.transaction_id,
  COUNT(t.id) as existing_tickets
FROM purchases p
LEFT JOIN tickets t ON t.purchase_id = p.id
WHERE p.payment_status = 'completed'
GROUP BY p.id
HAVING COUNT(t.id) = 0 OR COUNT(t.id) < p.ticket_count;
*/

-- Create a function to generate missing tickets
CREATE OR REPLACE FUNCTION generate_missing_tickets()
RETURNS TABLE(purchase_id INTEGER, tickets_created INTEGER) AS $$
DECLARE
  rec RECORD;
  campaign_rec RECORD;
  current_sold INTEGER;
  pad_length INTEGER;
  ticket_seq INTEGER;
  ticket_num TEXT;
  i INTEGER;
  created_count INTEGER;
BEGIN
  -- Loop through all completed purchases without tickets
  FOR rec IN 
    SELECT 
      p.id,
      p.user_id,
      p.campaign_id,
      p.ticket_count,
      p.total_amount,
      COUNT(t.id) as existing_tickets
    FROM purchases p
    LEFT JOIN tickets t ON t.purchase_id = p.id
    WHERE p.payment_status = 'completed'
    GROUP BY p.id
    HAVING COUNT(t.id) = 0
  LOOP
    -- Get campaign info
    SELECT total_tickets, sold_tickets INTO campaign_rec
    FROM campaigns WHERE id = rec.campaign_id FOR UPDATE;
    
    current_sold := COALESCE(campaign_rec.sold_tickets, 0);
    pad_length := GREATEST(2, LENGTH(campaign_rec.total_tickets::TEXT));
    created_count := 0;
    
    -- Generate tickets
    FOR i IN 1..rec.ticket_count LOOP
      ticket_seq := current_sold + i;
      ticket_num := 'K-' || LPAD(ticket_seq::TEXT, pad_length, '0');
      
      -- Insert ticket
      INSERT INTO tickets (ticket_number, campaign_id, user_id, purchase_id, status, created_at)
      VALUES (ticket_num, rec.campaign_id, rec.user_id, rec.id, 'active', NOW())
      ON CONFLICT DO NOTHING;
      
      created_count := created_count + 1;
    END LOOP;
    
    -- Update campaign sold_tickets
    UPDATE campaigns 
    SET sold_tickets = sold_tickets + rec.ticket_count
    WHERE id = rec.campaign_id;
    
    -- Create notification for user
    INSERT INTO notifications (user_id, type, title, message, data, created_at)
    VALUES (
      rec.user_id,
      'purchase_confirmation',
      'Tickets générés !',
      'Vos ' || rec.ticket_count || ' ticket(s) ont été générés avec succès (correction automatique).',
      jsonb_build_object('purchase_id', rec.id),
      NOW()
    );
    
    -- Generate invoice if not exists
    INSERT INTO invoices (purchase_id, user_id, invoice_number, amount, sent_at)
    SELECT rec.id, rec.user_id, 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || rec.id, rec.total_amount, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM invoices inv WHERE inv.purchase_id = rec.id);
    
    purchase_id := rec.id;
    tickets_created := created_count;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to fix missing tickets
SELECT * FROM generate_missing_tickets();

-- Verify the fix
SELECT 
  p.id as purchase_id,
  p.user_id,
  u.email,
  p.campaign_id,
  c.title as campaign_title,
  p.ticket_count as expected_tickets,
  COUNT(t.id) as actual_tickets,
  p.payment_status
FROM purchases p
LEFT JOIN tickets t ON t.purchase_id = p.id
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN campaigns c ON p.campaign_id = c.id
WHERE p.payment_status = 'completed'
GROUP BY p.id, u.email, c.title
ORDER BY p.id DESC;

-- Cleanup: Drop the function after use (optional)
-- DROP FUNCTION IF EXISTS generate_missing_tickets();
