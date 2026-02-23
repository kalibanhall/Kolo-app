#!/bin/bash
echo "=== PROMO CODES ==="
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -h localhost -U kolo -d kolo_db -c "SELECT id, code, influencer_id, commission_rate, created_at FROM promo_codes ORDER BY id;"

echo ""
echo "=== PROMO USAGE ==="
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -h localhost -U kolo -d kolo_db -c "SELECT pu.promo_code_id, pc.code, pu.user_id, u.name as buyer, pu.created_at FROM promo_code_usage pu JOIN promo_codes pc ON pc.id=pu.promo_code_id JOIN users u ON u.id=pu.user_id ORDER BY pu.id;"

echo ""
echo "=== INFLUENCERS ==="
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -h localhost -U kolo -d kolo_db -c "SELECT id, name, email, is_influencer FROM users WHERE is_influencer = true ORDER BY id;"

# Fix: Assign VNJVQZI to Barbe Noir (id=8) with 10% commission
echo ""
echo "=== FIXING PROMO CODE VNJVQZI ==="
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -h localhost -U kolo -d kolo_db -c "UPDATE promo_codes SET influencer_id = 8, commission_rate = 10.00 WHERE code = 'VNJVQZI' RETURNING id, code, influencer_id, commission_rate;"

echo ""
echo "=== VERIFY FIX ==="
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -h localhost -U kolo -d kolo_db -c "SELECT pc.id, pc.code, pc.influencer_id, u.name as influencer_name, pc.commission_rate FROM promo_codes pc LEFT JOIN users u ON u.id = pc.influencer_id ORDER BY pc.id;"
