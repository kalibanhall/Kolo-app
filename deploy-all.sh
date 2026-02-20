#!/bin/bash
echo "=== Adding prize_images column ==="
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -h localhost -U kolo -d kolo_db -c "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS prize_images TEXT DEFAULT NULL;"

echo "=== Fixing influencer_id on existing promo codes ==="
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -h localhost -U kolo -d kolo_db -c "
UPDATE promo_codes SET influencer_id = (
  SELECT u.id FROM users u WHERE LOWER(u.name) = LOWER(promo_codes.influencer_name) AND u.is_influencer = TRUE LIMIT 1
) WHERE influencer_name IS NOT NULL AND influencer_id IS NULL;
"

echo "=== Pulling code ==="
cd /var/www/kolo
git pull

echo "=== Building frontend ==="
cd client
npm run build 2>&1 | tail -3

echo "=== Reloading nginx ==="
sudo systemctl reload nginx

echo "=== Restarting backend ==="
cd ../server
pm2 restart kolo-api

echo "=== ALL DEPLOYED ==="
