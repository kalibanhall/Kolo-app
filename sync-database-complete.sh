#!/bin/bash
# =================================================================
# KOLO - Complete Database Migration Script
# Synchronizes VPS database with all schema + migration definitions
# =================================================================

DB_NAME="kolo_db"

echo "=================================================="
echo "  KOLO - Complete Database Sync"
echo "=================================================="

# ---------------------------------------------------------------
# 1. USERS TABLE - Add missing columns
# ---------------------------------------------------------------
echo ""
echo "[1/10] Syncing USERS table..."
sudo -u postgres psql -d $DB_NAME <<'SQL'
-- Add missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP;

-- Drop NOT NULL on password_hash (for Google auth)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add google_id unique index if missing
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON users(fcm_token);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_province ON users(province);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_date_of_birth ON users(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_users_influencer ON users(is_influencer) WHERE is_influencer = TRUE;

SELECT 'USERS: OK' AS result;
SQL

# ---------------------------------------------------------------
# 2. CAMPAIGNS TABLE - Add missing columns
# ---------------------------------------------------------------
echo ""
echo "[2/10] Syncing CAMPAIGNS table..."
sudo -u postgres psql -d $DB_NAME <<'SQL'
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ticket_prefix VARCHAR(2);

-- Allow scheduled status
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check 
  CHECK (status IN ('draft', 'scheduled', 'open', 'closed', 'completed'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_display_order ON campaigns(display_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_ticket_prefix ON campaigns(ticket_prefix) WHERE ticket_prefix IS NOT NULL;

SELECT 'CAMPAIGNS: OK' AS result;
SQL

# ---------------------------------------------------------------
# 3. PURCHASES TABLE - Add missing columns
# ---------------------------------------------------------------
echo ""
echo "[3/10] Syncing PURCHASES table..."
sudo -u postgres psql -d $DB_NAME <<'SQL'
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS selected_numbers JSONB DEFAULT NULL;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS promo_code_id INTEGER REFERENCES promo_codes(id);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- Make phone_number nullable (for wallet purchases)
ALTER TABLE purchases ALTER COLUMN phone_number DROP NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_purchases_currency ON purchases(currency);

SELECT 'PURCHASES: OK' AS result;
SQL

# ---------------------------------------------------------------
# 4. TICKETS TABLE - Add missing columns
# ---------------------------------------------------------------
echo ""
echo "[4/10] Syncing TICKETS table..."
sudo -u postgres psql -d $DB_NAME <<'SQL'
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS delivery_updated_at TIMESTAMP;

-- Allow 'lost' status
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
  CHECK (status IN ('active', 'winner', 'cancelled', 'lost'));

-- Add delivery_status constraint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_delivery_status_check') THEN
    ALTER TABLE tickets ADD CONSTRAINT tickets_delivery_status_check 
      CHECK (delivery_status IN ('pending', 'contacted', 'shipped', 'delivered', 'claimed'));
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_delivery_status ON tickets(delivery_status);
CREATE INDEX IF NOT EXISTS idx_tickets_is_winner ON tickets(is_winner) WHERE is_winner = true;
CREATE INDEX IF NOT EXISTS idx_tickets_campaign_number ON tickets(campaign_id, ticket_number);

-- Add compound unique constraint for campaign+ticket_number (instead of global unique)
-- First drop the old global unique if it exists
-- Don't drop it yet as it might break things - just add the compound index
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_campaign_ticket_number ON tickets(campaign_id, ticket_number);

SELECT 'TICKETS: OK' AS result;
SQL

# ---------------------------------------------------------------
# 5. PROMO_CODES TABLE - Fix columns
# ---------------------------------------------------------------
echo ""
echo "[5/10] Syncing PROMO_CODES table..."
sudo -u postgres psql -d $DB_NAME <<'SQL'
-- Add missing columns
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS max_discount DECIMAL(10,2);
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Copy data from old columns to new ones if they exist
DO $$
BEGIN
  -- If valid_from exists, copy to starts_at
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='promo_codes' AND column_name='valid_from') THEN
    UPDATE promo_codes SET starts_at = valid_from WHERE starts_at IS NULL AND valid_from IS NOT NULL;
  END IF;
  -- If valid_until exists, copy to expires_at
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='promo_codes' AND column_name='valid_until') THEN
    UPDATE promo_codes SET expires_at = valid_until WHERE expires_at IS NULL AND valid_until IS NOT NULL;
  END IF;
END $$;

-- Expand influencer_name to VARCHAR(255)
ALTER TABLE promo_codes ALTER COLUMN influencer_name TYPE VARCHAR(255);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_codes_expires ON promo_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_promo_codes_influencer ON promo_codes(influencer_name);
CREATE INDEX IF NOT EXISTS idx_promo_codes_influencer_id ON promo_codes(influencer_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_promo_codes_updated_at ON promo_codes;
CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON promo_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'PROMO_CODES: OK' AS result;
SQL

# ---------------------------------------------------------------
# 6. APP_SETTINGS TABLE - Fix columns
# ---------------------------------------------------------------
echo ""
echo "[6/10] Syncing APP_SETTINGS table..."
sudo -u postgres psql -d $DB_NAME <<'SQL'
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Index
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_app_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_app_settings_timestamp ON app_settings;
CREATE TRIGGER update_app_settings_timestamp BEFORE UPDATE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION update_app_settings_timestamp();

SELECT 'APP_SETTINGS: OK' AS result;
SQL

# ---------------------------------------------------------------
# 7. TICKET_RESERVATIONS TABLE - Ensure correct structure
# ---------------------------------------------------------------
echo ""
echo "[7/10] Syncing TICKET_RESERVATIONS table..."
sudo -u postgres psql -d $DB_NAME <<'SQL'
-- Add ticket_number column if missing (some migrations use ticket_number, others ticket_numbers)
ALTER TABLE ticket_reservations ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(20);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_reservations_campaign ON ticket_reservations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ticket_reservations_user ON ticket_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_reservations_expires ON ticket_reservations(expires_at);
CREATE INDEX IF NOT EXISTS idx_ticket_reservations_status ON ticket_reservations(status);

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS void AS $$
BEGIN
    DELETE FROM ticket_reservations WHERE expires_at < CURRENT_TIMESTAMP AND status = 'reserved';
END;
$$ LANGUAGE plpgsql;

SELECT 'TICKET_RESERVATIONS: OK' AS result;
SQL

# ---------------------------------------------------------------
# 8. DRAW_RESULTS TABLE - Add optional winner columns
# ---------------------------------------------------------------
echo ""
echo "[8/10] Syncing DRAW_RESULTS table..."
sudo -u postgres psql -d $DB_NAME <<'SQL'
ALTER TABLE draw_results ADD COLUMN IF NOT EXISTS second_winner_ticket_id INTEGER REFERENCES tickets(id);
ALTER TABLE draw_results ADD COLUMN IF NOT EXISTS third_winner_ticket_id INTEGER REFERENCES tickets(id);

SELECT 'DRAW_RESULTS: OK' AS result;
SQL

# ---------------------------------------------------------------
# 9. WALLET FUNCTIONS - Add missing functions
# ---------------------------------------------------------------
echo ""
echo "[9/10] Syncing wallet functions & triggers..."
sudo -u postgres psql -d $DB_NAME <<'SQL'
-- Generate wallet reference function
CREATE OR REPLACE FUNCTION generate_wallet_reference()
RETURNS TEXT AS $$
DECLARE
    ref TEXT;
BEGIN
    ref := 'WLT-' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || 
           lpad(floor(random() * 99999)::text, 5, '0');
    RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Wallet timestamp function
CREATE OR REPLACE FUNCTION update_wallet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

SELECT 'FUNCTIONS: OK' AS result;
SQL

# ---------------------------------------------------------------
# 10. VIEWS - Recreate with updated definitions
# ---------------------------------------------------------------
echo ""
echo "[10/10] Syncing views..."
sudo -u postgres psql -d $DB_NAME <<'SQL'
-- Recreate campaign_stats view
CREATE OR REPLACE VIEW campaign_stats AS
SELECT 
    c.id,
    c.title,
    c.status,
    c.total_tickets,
    c.sold_tickets,
    c.ticket_price,
    COUNT(DISTINCT p.user_id) as total_participants,
    SUM(p.total_amount) as total_revenue,
    COUNT(DISTINCT t.id) as total_tickets_issued
FROM campaigns c
LEFT JOIN purchases p ON c.id = p.campaign_id AND p.payment_status = 'completed'
LEFT JOIN tickets t ON c.id = t.campaign_id
GROUP BY c.id, c.title, c.status, c.total_tickets, c.sold_tickets, c.ticket_price;

-- Recreate user_stats view
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(DISTINCT p.id) as total_purchases,
    COUNT(DISTINCT t.id) as total_tickets,
    SUM(p.total_amount) as total_spent,
    MAX(p.created_at) as last_purchase_date
FROM users u
LEFT JOIN purchases p ON u.id = p.user_id AND p.payment_status = 'completed'
LEFT JOIN tickets t ON u.id = t.user_id
GROUP BY u.id, u.name, u.email;

SELECT 'VIEWS: OK' AS result;
SQL

# ---------------------------------------------------------------
# INSERT DEFAULT APP SETTINGS
# ---------------------------------------------------------------
echo ""
echo "Inserting default app settings..."
sudo -u postgres psql -d $DB_NAME <<'SQL'
INSERT INTO app_settings (key, value, description) VALUES
  ('exchange_rate', '2800', 'Taux de change USD vers CDF'),
  ('default_currency', 'USD', 'Devise par defaut'),
  ('max_tickets_per_purchase', '5', 'Maximum de tickets par achat'),
  ('maintenance_mode', 'false', 'Mode maintenance'),
  ('payment_enabled', 'true', 'Paiements actives'),
  ('registration_enabled', 'true', 'Inscription activee')
ON CONFLICT (key) DO NOTHING;

SELECT 'APP_SETTINGS DATA: OK' AS result;
SQL

# ---------------------------------------------------------------
# FINAL VERIFICATION
# ---------------------------------------------------------------
echo ""
echo "=================================================="
echo "  VERIFICATION"
echo "=================================================="

echo ""
echo "--- Tables ---"
sudo -u postgres psql -d $DB_NAME -c "SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"

echo ""
echo "--- Users columns ---"
sudo -u postgres psql -d $DB_NAME -c "SELECT COUNT(*) AS user_cols FROM information_schema.columns WHERE table_name='users';"

echo ""
echo "--- Campaigns columns ---"
sudo -u postgres psql -d $DB_NAME -c "SELECT COUNT(*) AS campaign_cols FROM information_schema.columns WHERE table_name='campaigns';"

echo ""
echo "--- Purchases columns ---"
sudo -u postgres psql -d $DB_NAME -c "SELECT COUNT(*) AS purchase_cols FROM information_schema.columns WHERE table_name='purchases';"

echo ""
echo "--- Tickets columns ---"
sudo -u postgres psql -d $DB_NAME -c "SELECT COUNT(*) AS ticket_cols FROM information_schema.columns WHERE table_name='tickets';"

echo ""
echo "--- Promo codes columns ---"
sudo -u postgres psql -d $DB_NAME -c "SELECT COUNT(*) AS promo_cols FROM information_schema.columns WHERE table_name='promo_codes';"

echo ""
echo "--- All indexes ---"
sudo -u postgres psql -d $DB_NAME -c "SELECT COUNT(*) AS index_count FROM pg_indexes WHERE schemaname='public';"

echo ""
echo "--- All triggers ---"
sudo -u postgres psql -d $DB_NAME -c "SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema='public';"

echo ""
echo "--- All functions ---"
sudo -u postgres psql -d $DB_NAME -c "SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_name NOT LIKE 'uuid%';"

# Restart the API server
echo ""
echo "Restarting kolo-api..."
cd /var/www/kolo/server && pm2 restart kolo-api
sleep 2
pm2 logs kolo-api --lines 5 --nostream

echo ""
echo "=================================================="
echo "  DATABASE SYNC COMPLETE!"
echo "=================================================="
