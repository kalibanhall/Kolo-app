#!/bin/bash
cd /var/www/kolo/server
cp .env .env.backup

# Update existing PayDRC values
sed -i 's|PAYDRC_MERCHANT_ID=.*|PAYDRC_MERCHANT_ID=j*zL/#%1kq(EbSNhb|' .env
sed -i 's|PAYDRC_MERCHANT_SECRET=.*|PAYDRC_MERCHANT_SECRET=mn2E8SD6QEiEY|' .env
sed -i 's|PAYDRC_API_URL=.*|PAYDRC_API_URL=https://paydrc.gofreshbakery.net/api/v5/|' .env

# Add new PayDRC keys
echo "" >> .env
echo "# PayDRC Additional Keys" >> .env
echo "PAYDRC_AES_KEY=4357975872d4498e" >> .env
echo "PAYDRC_HMAC_KEY=2f76bc4319f04357" >> .env
echo "PAYDRC_CALLBACK_URL=http://158.220.108.42/api/payments/paydrc/callback" >> .env

echo "=== PayDRC Configuration ==="
grep PAYDRC .env

# Restart app
pm2 restart kolo-api
sleep 3
pm2 logs kolo-api --lines 20 --nostream
echo ""
echo "DONE - PayDRC configured"
