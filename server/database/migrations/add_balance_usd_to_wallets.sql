-- Migration: Add USD balance to wallets + currency to wallet_transactions
-- Separate CDF and USD balances in the wallet

-- Add balance_usd column to wallets
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS balance_usd DECIMAL(15,2) DEFAULT 0 CHECK (balance_usd >= 0);

-- Add currency column to wallet_transactions to know which balance was affected
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'CDF';
