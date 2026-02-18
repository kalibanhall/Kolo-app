#!/bin/bash
# KOLO VPS Deployment Script - Automated
# IP: 158.220.108.42

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "\n${BLUE}==== $1 ====${NC}\n"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  log_error "Ce script doit être exécuté avec sudo"
  exit 1
fi

# Configuration
VPS_IP="158.220.108.42"
APP_DIR="/var/www/kolo"
DB_NAME="kolo_db"
DB_USER="kolo"
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)
JWT_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)
NODE_VERSION="20"

log_step "KOLO VPS Deployment - Starting"
log_info "VPS IP: ${VPS_IP}"

# 1. Update system
log_step "1/10 - Mise à jour du système"
apt update && apt upgrade -y

# 2. Install essentials
log_step "2/10 - Installation des outils de base"
apt install -y curl wget git nginx ufw build-essential software-properties-common

# 3. Install Node.js
log_step "3/10 - Installation de Node.js ${NODE_VERSION}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
fi
npm install -g pm2

log_info "Node version: $(node -v)"
log_info "NPM version: $(npm -v)"

# 4. Install PostgreSQL
log_step "4/10 - Installation de PostgreSQL"
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
fi

systemctl start postgresql
systemctl enable postgresql

# 5. Configure PostgreSQL
log_step "5/10 - Configuration de PostgreSQL"
sudo -u postgres psql <<EOF
-- Drop if exists
DROP DATABASE IF EXISTS ${DB_NAME};
DROP USER IF EXISTS ${DB_USER};

-- Create fresh
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Connect and set permissions
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
EOF

log_info "✅ Base de données créée: ${DB_NAME}"

# 6. Clone or update repository
log_step "6/10 - Clone du repository KOLO"
if [ -d "$APP_DIR" ]; then
    log_warn "Le répertoire existe déjà, mise à jour..."
    cd $APP_DIR
    git pull origin main
else
    git clone https://github.com/kalibanhall/Kolo-app.git $APP_DIR
    cd $APP_DIR
fi

# 7. Configure backend
log_step "7/10 - Configuration du backend"
cd $APP_DIR/server

# Install dependencies
log_info "Installation des dépendances backend..."
npm install --production

# Create .env file
log_info "Création du fichier .env..."
cat > .env <<EOF
# Environment
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# URLs
API_URL=http://${VPS_IP}:3001
CLIENT_URL=http://${VPS_IP}

# CORS
CORS_ORIGIN=http://${VPS_IP}

# PayDRC (MOKO Afrika)
PAYDRC_MERCHANT_ID=your_merchant_id
PAYDRC_MERCHANT_SECRET=your_merchant_secret
PAYDRC_API_URL=https://paydrc.gofreshbakery.net

# Firebase (pour notifications push)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# SendGrid (pour emails)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@kolo-app.com
EOF

# Run migrations
log_info "Exécution des migrations..."
npm run migrate || node migrate.js

# Run reset script to create Admin L3
log_info "Création du compte Admin L3..."
node database/migrations/reset-with-admin-l3.js || log_warn "Script de reset non trouvé"

# 8. Build frontend
log_step "8/10 - Build du frontend"
cd $APP_DIR/client

log_info "Installation des dépendances frontend..."
npm install

# Update API URL in frontend config
log_info "Configuration de l'URL API..."
cat > src/config/api.js <<EOF
// Auto-generated API configuration
export const API_BASE_URL = 'http://${VPS_IP}:3001/api';
export const WS_URL = 'ws://${VPS_IP}:3001';
EOF

log_info "Build de l'application React..."
npm run build

# 9. Configure Nginx
log_step "9/10 - Configuration de Nginx"
cat > /etc/nginx/sites-available/kolo <<'NGINX_EOF'
# KOLO Frontend
server {
    listen 80;
    server_name 158.220.108.42;
    
    root /var/www/kolo/client/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # API proxy - route /api to backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Cache bypass
        proxy_cache_bypass $http_upgrade;
    }

    # Static files with long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Service Worker - no cache
    location = /sw.js {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }

    location = /firebase-messaging-sw.js {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }

    # Manifest
    location = /manifest.json {
        expires 1d;
        add_header Cache-Control "public, max-age=86400";
    }

    # SPA fallback - all other routes to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check
    location = /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
}
NGINX_EOF

# Enable site
ln -sf /etc/nginx/sites-available/kolo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
log_info "Test de la configuration Nginx..."
nginx -t

log_info "Rechargement de Nginx..."
systemctl reload nginx

# 10. Configure firewall
log_step "10/10 - Configuration du pare-feu"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 3001/tcp  # Backend direct access (optional, can be removed later)
echo "y" | ufw enable

# Start backend with PM2
log_step "Démarrage du backend avec PM2"
cd $APP_DIR/server

# Stop if already running
pm2 delete kolo-api 2>/dev/null || true

# Start fresh
pm2 start src/server.js --name kolo-api --env production

# Save PM2 configuration
pm2 save

# Configure PM2 to start on boot
pm2 startup systemd -u root --hp /root

# Final status
log_step "DÉPLOIEMENT TERMINÉ !"

echo ""
echo "=========================================="
echo -e "${GREEN}   ✅ KOLO déployé avec succès !${NC}"
echo "=========================================="
echo ""
echo "📦 Informations de connexion PostgreSQL:"
echo "   Base de données: ${DB_NAME}"
echo "   Utilisateur: ${DB_USER}"
echo "   Mot de passe: ${DB_PASSWORD}"
echo ""
echo "🔐 Compte Admin (déjà créé):"
echo "   Email: admin@kolo.com"
echo "   Mot de passe: Admin@2025"
echo "   Niveau: L3 (Accès complet)"
echo ""
echo "🌐 URLs de l'application:"
echo "   Frontend: http://${VPS_IP}"
echo "   API: http://${VPS_IP}/api"
echo "   Backend direct: http://${VPS_IP}:3001"
echo ""
echo "🔧 Commandes utiles:"
echo "   pm2 logs kolo-api          # Voir les logs"
echo "   pm2 restart kolo-api       # Redémarrer le backend"
echo "   pm2 status                 # Statut des services"
echo "   nginx -t                   # Tester la config Nginx"
echo "   systemctl status nginx     # Statut Nginx"
echo "   systemctl status postgresql # Statut PostgreSQL"
echo ""
echo "📝 Fichiers de configuration:"
echo "   Backend .env: ${APP_DIR}/server/.env"
echo "   Nginx config: /etc/nginx/sites-available/kolo"
echo ""
echo "⚠️  À FAIRE ENSUITE:"
echo "   1. Configurer les credentials PayDRC dans ${APP_DIR}/server/.env"
echo "   2. Configurer Firebase pour les notifications push"
echo "   3. Configurer SendGrid pour les emails"
echo "   4. Ensuite: pm2 restart kolo-api"
echo "   5. Configurer un sous-domaine (plus tard)"
echo ""
log_info "Application accessible sur: http://${VPS_IP}"
echo ""
