-- Migration: Fix temporary ticket numbers and currency issues
-- Created: 2026-01-18

-- 1. Fix tickets with K-TEMP numbers by generating proper numbers based on their ID
-- This updates tickets with K-TEMP-xxx to K-XXX format

UPDATE tickets 
SET ticket_number = 'K-' || LPAD(id::text, 4, '0')
WHERE ticket_number LIKE 'K-TEMP-%' OR ticket_number LIKE 'TEMP-%';

-- 2. Fix the purchase #78 which has CDF amount stored as USD
-- The webhook shows Amount: 2850, Currency: CDF for reference KOLO-1768671908492-K83A7D
UPDATE purchases 
SET currency = 'CDF', total_amount = 2850
WHERE id = 78 AND transaction_id = 'KOLO-1768671908492-K83A7D';

-- 3. Fix purchase #76 which has CDF amount stored as USD  
-- The webhook shows Amount: 5700, Currency: CDF for reference KOLO-1768669276616-NWDGI1
UPDATE purchases 
SET currency = 'CDF', total_amount = 5700
WHERE id = 76 AND transaction_id = 'KOLO-1768669276616-NWDGI1';

-- 4. Show results
SELECT id, ticket_number, user_id, campaign_id, status 
FROM tickets 
WHERE ticket_number LIKE 'K-%'
ORDER BY id DESC
LIMIT 10;

SELECT id, transaction_id, total_amount, currency, payment_status
FROM purchases 
WHERE id IN (78, 76, 75);
