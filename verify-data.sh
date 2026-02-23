#!/bin/bash
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -h localhost -U kolo -d kolo_db -t -c "SELECT 'CAMP:' || id || ':' || title FROM campaigns ORDER BY id;"
echo "---PROMOS---"
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -h localhost -U kolo -d kolo_db -t -c "SELECT 'PROMO:' || id || ':' || code || ':inf=' || COALESCE(influencer_id::text,'NULL') || ':rate=' || COALESCE(commission_rate::text,'0') FROM promo_codes ORDER BY id;"
echo "---PURCHASES---"
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -h localhost -U kolo -d kolo_db -t -c "SELECT 'PUR:camp=' || campaign_id || ':count=' || count(*) FROM purchases GROUP BY campaign_id ORDER BY campaign_id;"
echo "---INFLUENCERS---"
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -h localhost -U kolo -d kolo_db -t -c "SELECT 'INF:' || id || ':' || name || ':email=' || email FROM users WHERE is_influencer = true ORDER BY id;"
