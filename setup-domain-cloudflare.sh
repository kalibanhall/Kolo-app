#!/bin/bash
# ==============================================================
# KOLO - Configure domain kolo.cd on VPS (with Cloudflare proxy)
# ==============================================================
# Cloudflare handles SSL for visitors.
# VPS only needs to serve HTTP (port 80).
# Cloudflare SSL mode should be set to "Full".
# ==============================================================

DOMAIN="kolo.cd"
VPS_IP="158.220.108.42"
APP_DIR="/var/www/kolo"

echo "=================================================="
echo "  KOLO - Configuration domaine $DOMAIN"
echo "  (Cloudflare Proxy mode)"
echo "=================================================="

# ---------------------------------------------------------------
# 1. Configure Nginx for kolo.cd
# ---------------------------------------------------------------
echo ""
echo "[1/4] Configuration Nginx pour $DOMAIN..."

cat > /etc/nginx/sites-available/kolo <<'NGINX'
# Main server - serves both HTTP and handles Cloudflare connections
server {
    listen 80;
    server_name kolo.cd www.kolo.cd 158.220.108.42;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend - React app
    root /var/www/kolo/client/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-For $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
        proxy_send_timeout 90s;

        # CORS headers for API
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }

    # Frontend SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Service worker - no cache
    location = /sw.js {
        expires off;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Manifest
    location = /manifest.json {
        expires off;
        add_header Cache-Control "no-cache";
    }
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/kolo /etc/nginx/sites-enabled/kolo
rm -f /etc/nginx/sites-enabled/default

echo "Testing nginx config..."
nginx -t

if [ $? -ne 0 ]; then
    echo "ERREUR: Configuration Nginx invalide!"
    exit 1
fi

systemctl reload nginx
echo "Nginx: OK"

# ---------------------------------------------------------------
# 2. Update frontend API URL and rebuild
# ---------------------------------------------------------------
echo ""
echo "[2/4] Mise a jour du frontend avec https://$DOMAIN/api..."

cat > $APP_DIR/client/.env.production <<EOF
VITE_API_URL=https://$DOMAIN/api
VITE_APP_NAME=KOLO
VITE_APP_URL=https://$DOMAIN
EOF

cd $APP_DIR/client
echo "Building frontend..."
npm run build 2>&1 | tail -5

echo "Frontend: OK"

# ---------------------------------------------------------------
# 3. Update backend environment
# ---------------------------------------------------------------
echo ""
echo "[3/4] Mise a jour du backend..."

cd $APP_DIR/server

# Update CORS
if grep -q "CORS_ORIGIN" .env 2>/dev/null; then
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN,https://www.$DOMAIN,http://$VPS_IP|" .env
else
    echo "CORS_ORIGIN=https://$DOMAIN,https://www.$DOMAIN,http://$VPS_IP" >> .env
fi

# Update APP_URL
if grep -q "APP_URL" .env 2>/dev/null; then
    sed -i "s|APP_URL=.*|APP_URL=https://$DOMAIN|" .env
else
    echo "APP_URL=https://$DOMAIN" >> .env
fi

# Update PayDRC callback
if grep -q "PAYDRC_CALLBACK_URL" .env 2>/dev/null; then
    sed -i "s|PAYDRC_CALLBACK_URL=.*|PAYDRC_CALLBACK_URL=https://$DOMAIN/api/payments/paydrc/callback|" .env
fi

echo "Backend env: OK"

# ---------------------------------------------------------------
# 4. Restart services
# ---------------------------------------------------------------
echo ""
echo "[4/4] Restart des services..."

pm2 restart kolo-api
systemctl reload nginx

sleep 3

# Test
echo ""
echo "Test API health..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health)
echo "API health: HTTP $HEALTH"

echo ""
echo "Test domaine..."
DOMAIN_CHECK=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: $DOMAIN" http://127.0.0.1)
echo "Domain check: HTTP $DOMAIN_CHECK"

pm2 logs kolo-api --lines 5 --nostream

echo ""
echo "=================================================="
echo "  CONFIGURATION TERMINEE!"
echo "=================================================="
echo ""
echo "  Site:    https://$DOMAIN"
echo "  API:     https://$DOMAIN/api"
echo "  Health:  https://$DOMAIN/api/health"
echo ""
echo "  IMPORTANT - Dans Cloudflare:"
echo "  1. Record A: kolo.cd -> $VPS_IP (Proxied)"
echo "  2. Record CNAME: www -> kolo.cd (Proxied)"
echo "  3. SSL/TLS mode: Full"
echo "  4. Supprimer le Tunnel 'api' (plus necessaire)"
echo "=================================================="
