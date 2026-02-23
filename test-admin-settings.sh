#!/bin/bash
# Test admin settings API
echo "=== LOGIN ADMIN ==="
TOKEN=$(curl -s http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@kolo.cd","password":"admin123"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))")

if [ -z "$TOKEN" ]; then
  echo "Trying alternate admin..."
  TOKEN=$(curl -s http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"superadmin@kolo.cd","password":"Admin2025!!"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))")
fi

if [ -z "$TOKEN" ]; then
  echo "ADMIN LOGIN FAILED"
  exit 1
fi
echo "Token: ${TOKEN:0:20}..."

echo ""
echo "=== GET SETTINGS ==="
curl -s http://localhost:3001/api/admin/settings -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    for k, v in data.get('data', {}).items():
        print(f'  {k}: {v.get(\"value\", \"?\")}')
else:
    print(f'ERROR: {data}')
"

echo ""
echo "=== GET EXCHANGE RATE SETTING ==="
curl -s http://localhost:3001/api/admin/settings/exchange_rate_usd_cdf -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
