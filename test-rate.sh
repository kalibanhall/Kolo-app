#!/bin/bash
TOKEN=$(curl -s http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"herman@kolo.cd","password":"Kolo2025!!"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")

echo "=== DASHBOARD ==="
curl -s http://localhost:3001/api/influencer/dashboard -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    s = data['data']['summary']
    print(f'Exchange Rate: {data[\"data\"].get(\"exchange_rate\", \"N/A\")}')
    print(f'Total Revenue (USD): {s[\"total_revenue_generated\"]}')
    print(f'Total Commission (USD): {s[\"total_commission_earned\"]}')
    for r in data['data'].get('recent_uses', []):
        print(f'  {r[\"user_name\"]}: amount_usd={r[\"amount\"]} currency={r[\"currency\"]} commission={r[\"commission_earned\"]}')
else:
    print(f'ERROR: {data}')
"

echo ""
echo "=== PROFILE ==="
curl -s http://localhost:3001/api/influencer/profile -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    p = data['profile']
    print(f'Commission Balance: {p[\"commission_balance\"]}')
    print(f'Total Earned: {p[\"total_earned\"]}')
else:
    print(f'ERROR: {data}')
"
