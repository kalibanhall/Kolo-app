-- Migration: Add influencer payout system
-- 1. Add influencer_uid (visible ID like INF-001) and must_change_password to users
-- 2. Create influencer_payouts table

-- Add influencer_uid column (unique visible ID for influencer)
ALTER TABLE users ADD COLUMN IF NOT EXISTS influencer_uid VARCHAR(20) UNIQUE;

-- Add must_change_password flag (forces password change on first login)
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- Create influencer_payouts table
CREATE TABLE IF NOT EXISTS influencer_payouts (
    id SERIAL PRIMARY KEY,
    influencer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    influencer_uid VARCHAR(20) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'CDF')),
    percentage_requested INTEGER NOT NULL CHECK (percentage_requested IN (25, 50, 75, 100)),
    phone_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validated_by INTEGER REFERENCES users(id),
    validated_at TIMESTAMP,
    rejection_reason TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_influencer_payouts_influencer ON influencer_payouts(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_status ON influencer_payouts(status);
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_requested ON influencer_payouts(requested_at);

-- Generate influencer_uid for existing influencers who don't have one
DO $$
DECLARE
    r RECORD;
    seq INTEGER;
BEGIN
    seq := 0;
    FOR r IN SELECT id FROM users WHERE is_influencer = TRUE AND influencer_uid IS NULL ORDER BY id
    LOOP
        seq := seq + 1;
        UPDATE users SET influencer_uid = 'INF-' || LPAD(seq::TEXT, 3, '0') WHERE id = r.id;
    END LOOP;
END $$;
