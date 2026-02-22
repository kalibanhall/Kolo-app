#!/bin/bash
PGPASSWORD='vH3ahOqlCRi5QVUj6cSMfzEh' psql -h localhost -U kolo -d kolo_db <<'EOF'
SELECT pc.id, pc.code, pc.commission_rate, 
       COUNT(p.id) as purchases, 
       COALESCE(SUM(p.total_amount),0) as revenue,
       COALESCE(SUM(p.total_amount * pc.commission_rate / 100),0) as commission
FROM promo_codes pc 
LEFT JOIN purchases p ON p.promo_code_id = pc.id AND p.payment_status = 'completed'
GROUP BY pc.id ORDER BY pc.id;
EOF
