-- Migration: Add app_settings table for dynamic configuration
-- Created: 2025-01-XX

-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Insert default exchange rate (USD to CDF)
INSERT INTO app_settings (key, value, description) 
VALUES ('exchange_rate_usd_cdf', '2850', 'Taux de conversion USD vers CDF (1 USD = X CDF)')
ON CONFLICT (key) DO NOTHING;

-- Insert default currency setting
INSERT INTO app_settings (key, value, description) 
VALUES ('default_currency', 'USD', 'Devise par défaut (USD ou CDF)')
ON CONFLICT (key) DO NOTHING;

-- Add currency column to purchases table
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Update existing purchases to have USD as currency (assumed original currency)
UPDATE purchases SET currency = 'USD' WHERE currency IS NULL;

-- Add comment to the column
COMMENT ON COLUMN purchases.currency IS 'Currency used for the transaction (USD or CDF)';

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_app_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_app_settings_timestamp ON app_settings;
CREATE TRIGGER update_app_settings_timestamp
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_timestamp();
