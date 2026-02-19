#!/bin/bash
# Fix missing columns in users table
cd /var/www/kolo/server

# Extract DATABASE_URL from .env
DB_URL=$(grep DATABASE_URL .env | cut -d= -f2-)

echo "=== Adding missing columns to users table ==="

psql "$DB_URL" <<'SQL'
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_influencer BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS province VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Verify columns
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;
SQL

echo ""
echo "=== Restarting kolo-api ==="
pm2 restart kolo-api
sleep 3
echo ""
echo "=== Recent logs ==="
pm2 logs kolo-api --lines 10 --nostream
echo ""
echo "=== DONE ==="
