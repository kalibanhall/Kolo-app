#!/bin/bash
# KOLO VPS Deployment Script
# Usage: curl -sL https://raw.githubusercontent.com/kalibanhall/Kolo-app/main/scripts/vps-deploy.sh | bash

set -e

echo "=========================================="
echo "   KOLO Tombola - VPS Deployment"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  log_error "Please run as root (sudo)"
  exit 1
fi

# Variables - EDIT THESE
DOMAIN="kolo-app.com"  # Change to your domain
API_DOMAIN="api.kolo-app.com"  # Or use same domain with /api
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)
JWT_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)
APP_DIR="/var/www/kolo"

log_info "Starting deployment..."

# Update system
log_info "Updating system packages..."
apt update && apt upgrade -y

# Install essentials
log_info "Installing essential packages..."
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw build-essential

# Install Node.js 20 LTS
log_info "Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

# Install PostgreSQL
log_info "Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
log_info "Configuring PostgreSQL..."
sudo -u postgres psql <<EOF
CREATE USER kolo WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE kolo_db OWNER kolo;
GRANT ALL PRIVILEGES ON DATABASE kolo_db TO kolo;
\c kolo_db
GRANT ALL ON SCHEMA public TO kolo;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kolo;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kolo;
EOF

# Configure firewall
log_info "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Clone application
log_info "Cloning KOLO application..."
rm -rf $APP_DIR
git clone https://github.com/kalibanhall/Kolo-app.git $APP_DIR
cd $APP_DIR

# Install backend dependencies
log_info "Installing backend dependencies..."
cd $APP_DIR/server
npm install --production

# Create .env file for backend
log_info "Creating backend configuration..."
cat > $APP_DIR/server/.env <<EOF
# Server
PORT=3001
NODE_ENV=production

# Database
DATABASE_URL=postgresql://kolo:${DB_PASSWORD}@localhost:5432/kolo_db

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# API URL (for callbacks)
API_URL=https://${API_DOMAIN}
CLIENT_URL=https://${DOMAIN}

# CORS
CORS_ORIGIN=https://${DOMAIN}

# PayDRC (MOKO Afrika) - Add your credentials
PAYDRC_MERCHANT_ID=
PAYDRC_MERCHANT_SECRET=
PAYDRC_API_URL=https://paydrc.gofreshbakery.net

# QuotaGuard (if needed for proxy)
QUOTAGUARD_URL=

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# SendGrid (for emails)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@kolo-app.com
EOF

# Run database migrations
log_info "Running database migrations..."
cd $APP_DIR/server
npm run migrate 2>/dev/null || node migrate.js

# Install frontend dependencies and build
log_info "Building frontend..."
cd $APP_DIR/client
npm install
npm run build

# Configure Nginx for frontend + API proxy
log_info "Configuring Nginx..."
cat > /etc/nginx/sites-available/kolo <<EOF
# Frontend (React)
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    root ${APP_DIR}/client/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # PWA Service Worker - no cache
    location /sw.js {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
    }

    # SPA fallback - all routes go to index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}

# Optional: Separate API subdomain
server {
    listen 80;
    server_name ${API_DOMAIN};
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/kolo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx

# Start backend with PM2
log_info "Starting backend with PM2..."
cd $APP_DIR/server
pm2 start src/server.js --name kolo-api --env production
pm2 save
pm2 startup systemd -u root --hp /root

# Print summary
echo ""
echo "=========================================="
echo -e "${GREEN}   DEPLOYMENT COMPLETE!${NC}"
echo "=========================================="
echo ""
echo "Database credentials (save these!):"
echo "  Database: kolo_db"
echo "  User: kolo"
echo "  Password: ${DB_PASSWORD}"
echo ""
echo "JWT Secret: ${JWT_SECRET}"
echo ""
echo "Next steps:"
echo "1. Point your domain DNS to this server IP"
echo "2. Run: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d ${API_DOMAIN}"
echo "3. Edit /var/www/kolo/server/.env with your PayDRC, Firebase, SendGrid credentials"
echo "4. Run: pm2 restart kolo-api"
echo ""
echo "Useful commands:"
echo "  pm2 logs kolo-api     - View backend logs"
echo "  pm2 status            - Check service status"
echo "  pm2 restart kolo-api  - Restart backend"
echo ""
echo "Application URLs:"
echo "  Frontend: http://${DOMAIN}"
echo "  API: http://${API_DOMAIN} or http://${DOMAIN}/api"
echo ""
log_info "Done! Your KOLO app is running at http://$(hostname -I | awk '{print $1}')"
