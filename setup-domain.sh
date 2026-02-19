#!/bin/bash
# ==============================================================
# KOLO - Configure domain kolo.cd on VPS
# ==============================================================

DOMAIN="kolo.cd"
VPS_IP="158.220.108.42"
APP_DIR="/var/www/kolo"

echo "=================================================="
echo "  KOLO - Configuration domaine $DOMAIN"
echo "=================================================="

# ---------------------------------------------------------------
# 1. Install certbot for SSL
# ---------------------------------------------------------------
echo ""
echo "[1/5] Installation de Certbot..."
apt-get update -qq
apt-get install -y certbot python3-certbot-nginx

# ---------------------------------------------------------------
# 2. Configure Nginx for kolo.cd
# ---------------------------------------------------------------
echo ""
echo "[2/5] Configuration Nginx pour $DOMAIN..."

cat > /etc/nginx/sites-available/kolo <<NGINX
# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL certificates (will be filled by certbot)
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend - React app
    root $APP_DIR/client/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 90s;
        proxy_send_timeout 90s;
    }

    # Frontend SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
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
}
NGINX

# ---------------------------------------------------------------
# 3. Generate temporary self-signed cert (so nginx can start)
# ---------------------------------------------------------------
echo ""
echo "[3/5] Certificat temporaire..."
if [ ! -f /etc/ssl/certs/nginx-selfsigned.crt ]; then
    openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
        -keyout /etc/ssl/private/nginx-selfsigned.key \
        -out /etc/ssl/certs/nginx-selfsigned.crt \
        -subj "/CN=$DOMAIN"
fi

# Enable site and test nginx config
ln -sf /etc/nginx/sites-available/kolo /etc/nginx/sites-enabled/kolo
rm -f /etc/nginx/sites-enabled/default
nginx -t

if [ $? -ne 0 ]; then
    echo "ERREUR: Configuration Nginx invalide!"
    exit 1
fi

systemctl reload nginx

# ---------------------------------------------------------------
# 4. Get Let's Encrypt SSL certificate
# ---------------------------------------------------------------
echo ""
echo "[4/5] Obtention du certificat SSL Let's Encrypt..."
echo "     (Le DNS doit pointer vers $VPS_IP)"
echo ""

# Test DNS resolution first
RESOLVED_IP=$(dig +short $DOMAIN 2>/dev/null | head -1)
echo "DNS resolution: $DOMAIN -> $RESOLVED_IP"

if [ "$RESOLVED_IP" = "$VPS_IP" ]; then
    echo "DNS OK! Requesting certificate..."
    certbot --nginx -d $DOMAIN -d www.$DOMAIN \
        --non-interactive \
        --agree-tos \
        --email admin@$DOMAIN \
        --redirect

    if [ $? -eq 0 ]; then
        echo "SSL certificate obtained successfully!"
    else
        echo "Certbot failed. Trying without www..."
        certbot --nginx -d $DOMAIN \
            --non-interactive \
            --agree-tos \
            --email admin@$DOMAIN \
            --redirect
    fi
else
    echo ""
    echo "WARNING: DNS not yet pointing to this server."
    echo "  Expected: $VPS_IP"
    echo "  Got: $RESOLVED_IP"
    echo ""
    echo "  The site will work via HTTP with self-signed cert."
    echo "  Run this command once DNS propagates:"
    echo ""
    echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect"
    echo ""
fi

# ---------------------------------------------------------------
# 5. Update frontend API URL and rebuild
# ---------------------------------------------------------------
echo ""
echo "[5/5] Mise a jour de l'URL API vers https://$DOMAIN/api..."

cat > $APP_DIR/client/.env.production <<EOF
VITE_API_URL=https://$DOMAIN/api
VITE_APP_NAME=KOLO
VITE_APP_URL=https://$DOMAIN
EOF

# Rebuild frontend
cd $APP_DIR/client
npm run build

# Update backend CORS
cd $APP_DIR/server
# Add KOLO_DOMAIN to env
if grep -q "CORS_ORIGIN" .env 2>/dev/null; then
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN,https://www.$DOMAIN,http://$VPS_IP|" .env
else
    echo "CORS_ORIGIN=https://$DOMAIN,https://www.$DOMAIN,http://$VPS_IP" >> .env
fi

# Also update CALLBACK_URL for PayDRC
if grep -q "PAYDRC_CALLBACK_URL" .env 2>/dev/null; then
    sed -i "s|PAYDRC_CALLBACK_URL=.*|PAYDRC_CALLBACK_URL=https://$DOMAIN/api/payments/paydrc/callback|" .env
fi

# Restart everything
pm2 restart kolo-api
systemctl reload nginx

echo ""
echo "=================================================="
echo "  CONFIGURATION TERMINEE!"
echo "=================================================="
echo ""
echo "  Domaine: https://$DOMAIN"
echo "  API:     https://$DOMAIN/api"
echo "  VPS IP:  $VPS_IP"
echo ""
echo "  Si le DNS ne pointe pas encore vers ce serveur,"
echo "  le site reste accessible via http://$VPS_IP"
echo ""
echo "  Pour obtenir le SSL une fois le DNS actif:"
echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect"
echo "=================================================="
