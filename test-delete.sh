#!/bin/bash
cd /var/www/kolo

# Get admin token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kolo.com","password":"Admin@2025"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin).get('token','NO_TOKEN'))")

echo "Token length: ${#TOKEN}"

# Test: Delete campaign 3 (has 1 purchase)
echo ""
echo "=== DELETE CAMPAIGN 3 ==="
curl -s -X DELETE http://localhost:3001/api/campaigns/3 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
echo ""

# Test: Delete promo code 3 (code 1R3QPRB, 1 usage)
echo ""
echo "=== DELETE PROMO CODE 3 ==="
curl -s -X DELETE http://localhost:3001/api/promos/admin/3 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
echo ""

# Verify deletions
echo ""
echo "=== VERIFY: Remaining campaigns ==="
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -U kolo -d kolo_db -t -c "SELECT id, title FROM campaigns ORDER BY id;"

echo ""
echo "=== VERIFY: Remaining promo codes ==="
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -U kolo -d kolo_db -t -c "SELECT id, code FROM promo_codes ORDER BY id;"

echo ""
echo "=== VERIFY: Purchases for deleted campaign 3 ==="
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -U kolo -d kolo_db -t -c "SELECT COUNT(*) as count FROM purchases WHERE campaign_id = 3;"

echo ""
echo "=== VERIFY: Usage for deleted promo 3 ==="
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -U kolo -d kolo_db -t -c "SELECT COUNT(*) as count FROM promo_code_usage WHERE promo_code_id = 3;"
