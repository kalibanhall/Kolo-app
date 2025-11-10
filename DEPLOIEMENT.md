# 🚀 Guide de Déploiement - KOLO Tombola

## 📋 Prérequis

- **Node.js** 18+ et npm
- **PostgreSQL** 14+ ou compte Supabase
- **Serveur web** (Nginx/Apache) ou plateforme cloud (Vercel, Render, Railway)
- **Nom de domaine** (optionnel mais recommandé)
- **Compte Africa's Talking** pour Mobile Money

---

## 1️⃣ Préparation de la Base de Données

### Option A: PostgreSQL Local

```bash
# Créer la base de données
psql -U postgres
CREATE DATABASE kolo_tombola;
\q

# Exécuter le schéma
psql -U postgres -d kolo_tombola -f server/src/database/schema.sql
```

### Option B: Supabase (Recommandé)

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans SQL Editor
3. Copier/coller le contenu de `server/src/database/schema.sql`
4. Exécuter le script
5. Noter les credentials de connexion

---

## 2️⃣ Configuration du Backend

### Installation

```bash
cd server
npm install
```

### Variables d'environnement

Copier `.env.example` vers `.env` et configurer:

```env
# Production
NODE_ENV=production
PORT=5000

# Database (Supabase ou PostgreSQL)
DB_HOST=db.your-supabase-project.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe_supabase

# JWT
JWT_SECRET=générer_une_clé_sécurisée_minimum_32_caractères
JWT_EXPIRES_IN=7d

# Admin
ADMIN_EMAIL=admin@kolo.com
ADMIN_PASSWORD=MotDePasseAdmin123!

# Africa's Talking
AFRICAS_TALKING_USERNAME=votre_username
AFRICAS_TALKING_API_KEY=votre_api_key
AFRICAS_TALKING_SHORTCODE=votre_shortcode

# URLs
CLIENT_URL=https://votre-domaine.com
SERVER_URL=https://api.votre-domaine.com
CORS_ORIGIN=https://votre-domaine.com
```

### Générer un JWT Secret sécurisé

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Migration & Tests

```bash
# Tester la connexion à la DB
node -e "require('./src/config/database').query('SELECT NOW()')"

# Créer l'admin (si pas déjà fait)
node migrate.js
```

---

## 3️⃣ Configuration du Frontend

### Installation

```bash
cd client
npm install
```

### Variables d'environnement

Créer `.env.production`:

```env
VITE_API_URL=https://api.votre-domaine.com/api
VITE_APP_NAME=KOLO Tombola
```

### Build de production

```bash
npm run build
```

Le dossier `dist/` contient les fichiers optimisés à déployer.

---

## 4️⃣ Déploiement

### Option A: Serveur VPS (Ubuntu/Nginx)

#### Backend avec PM2

```bash
# Installer PM2
npm install -g pm2

# Démarrer le serveur
cd server
pm2 start src/server.js --name kolo-api

# Configurer le démarrage auto
pm2 startup
pm2 save
```

#### Frontend avec Nginx

```nginx
# /etc/nginx/sites-available/kolo
server {
    listen 80;
    server_name votre-domaine.com;
    root /var/www/kolo/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/kolo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### SSL avec Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

---

### Option B: Plateforme Cloud

#### Backend sur Render.com

1. Connecter le repo GitHub
2. Créer un **Web Service**
3. Configuration:
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment**: Node 18+
4. Ajouter les variables d'environnement
5. Déployer

#### Frontend sur Vercel

```bash
cd client
vercel --prod
```

Ou via l'interface web:
1. Importer le projet
2. Root Directory: `client`
3. Framework: Vite
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Variables d'env: `VITE_API_URL`

---

## 5️⃣ Configuration Africa's Talking

### Webhook de paiement

Dans le dashboard Africa's Talking:

1. Aller dans **Payments** → **C2B**
2. Configurer le callback URL:
   ```
   https://api.votre-domaine.com/api/payments/webhook
   ```
3. Tester avec le sandbox
4. Basculer en production

---

## 6️⃣ Vérifications Post-Déploiement

### Checklist de sécurité

- [ ] JWT_SECRET changé (minimum 32 caractères)
- [ ] ADMIN_PASSWORD fort et unique
- [ ] DB_PASSWORD sécurisé
- [ ] CORS_ORIGIN configuré correctement
- [ ] HTTPS activé (SSL)
- [ ] Variables sensibles jamais committées
- [ ] `.env` dans `.gitignore`

### Tests fonctionnels

```bash
# Test API health
curl https://api.votre-domaine.com/api/health

# Test campagne active
curl https://api.votre-domaine.com/api/campaigns/current

# Test login admin
curl -X POST https://api.votre-domaine.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kolo.com","password":"VotrePassword"}'
```

---

## 7️⃣ Monitoring & Maintenance

### Logs

```bash
# Logs PM2
pm2 logs kolo-api

# Logs Nginx
sudo tail -f /var/log/nginx/error.log
```

### Backup Base de Données

```bash
# PostgreSQL
pg_dump -U postgres kolo_tombola > backup_$(date +%Y%m%d).sql

# Supabase (via interface web ou CLI)
```

### Mises à jour

```bash
# Backend
cd server
git pull
npm install
pm2 restart kolo-api

# Frontend
cd client
git pull
npm install
npm run build
```

---

## 🆘 Dépannage

### Erreur de connexion DB
- Vérifier les credentials dans `.env`
- Tester avec `psql` ou DBeaver
- Vérifier le firewall (port 5432)

### CORS errors
- Vérifier `CORS_ORIGIN` dans `.env` backend
- Matcher avec l'URL frontend exacte
- Pas de `/` à la fin

### Paiement webhook ne fonctionne pas
- Vérifier l'URL publique (pas localhost)
- Tester avec ngrok en dev
- Vérifier les logs Africa's Talking

---

## 📞 Support

- **Documentation**: Ce fichier + README.md
- **Logs**: Consulter PM2/Vercel logs
- **Database**: Supabase Dashboard

---

## ✅ Checklist de Déploiement Finale

- [ ] Base de données créée et migrée
- [ ] Variables d'environnement configurées (backend + frontend)
- [ ] Backend déployé et accessible
- [ ] Frontend build et déployé
- [ ] HTTPS configuré
- [ ] Admin créé et testé
- [ ] Webhook Africa's Talking configuré
- [ ] Tests end-to-end passés
- [ ] Monitoring activé
- [ ] Backup configuré

🎉 **Félicitations! Votre plateforme KOLO est en production!**
