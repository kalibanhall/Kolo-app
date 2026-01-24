-- Add currency tracking to purchases
-- This allows tracking spending in USD vs CDF separately

-- Add currency column to purchases if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchases' AND column_name = 'currency') THEN
        ALTER TABLE purchases ADD COLUMN currency VARCHAR(10) DEFAULT 'USD';
    END IF;
END $$;

-- Add amount_usd column for converted amount tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchases' AND column_name = 'amount_usd') THEN
        ALTER TABLE purchases ADD COLUMN amount_usd DECIMAL(10, 2);
    END IF;
END $$;

-- Add exchange_rate column for the rate used at time of purchase
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchases' AND column_name = 'exchange_rate') THEN
        ALTER TABLE purchases ADD COLUMN exchange_rate DECIMAL(10, 2);
    END IF;
END $$;

-- Update existing records to have USD as default currency 
-- (assuming they were in USD as per original ticket_price logic)
UPDATE purchases 
SET currency = 'USD', 
    amount_usd = total_amount 
WHERE currency IS NULL OR currency = '';

-- Index for currency filtering
CREATE INDEX IF NOT EXISTS idx_purchases_currency ON purchases(currency);

-- Comment
COMMENT ON COLUMN purchases.currency IS 'Currency used for payment (USD or CDF)';
COMMENT ON COLUMN purchases.amount_usd IS 'Equivalent amount in USD for analytics';
COMMENT ON COLUMN purchases.exchange_rate IS 'Exchange rate CDF/USD used at time of purchase';
