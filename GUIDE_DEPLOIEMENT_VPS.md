# 🚀 DÉPLOIEMENT KOLO SUR VPS - Guide Complet

**IP du VPS**: 158.220.108.42  
**Date**: 18 Février 2026

---

## 📋 Ce qui sera installé automatiquement

✅ **Node.js 20 LTS**  
✅ **PostgreSQL 14+** (base de données locale)  
✅ **Nginx** (serveur web)  
✅ **PM2** (gestionnaire de processus)  
✅ **UFW** (pare-feu)  
✅ **Application KOLO** (frontend + backend)

---

## 🎯 MÉTHODE 1: Déploiement direct (Recommandé)

### Prérequis
- Accès SSH au VPS avec droits root/sudo
- Clé SSH ou mot de passe root

### Étapes

#### 1. Connexion au VPS

```bash
# Depuis votre machine locale (Git Bash sur Windows ou terminal Mac/Linux)
ssh root@158.220.108.42
```

Ou si vous avez un utilisateur avec sudo:
```bash
ssh votre_utilisateur@158.220.108.42
```

#### 2. Télécharger et exécuter le script

```bash
# Télécharger le script
curl -o deploy.sh https://raw.githubusercontent.com/kalibanhall/Kolo-app/main/deploy-to-vps.sh

# Donner les permissions d'exécution
chmod +x deploy.sh

# Exécuter le script
sudo bash deploy.sh
```

**⏱️ Durée**: 10-15 minutes

Le script va:
- Installer toutes les dépendances
- Configurer PostgreSQL avec une nouvelle base de données
- Créer un compte Admin L3 (admin@kolo.com / Admin@2025)
- Déployer le frontend et backend
- Configurer Nginx
- Démarrer l'application avec PM2

---

## 🎯 MÉTHODE 2: Déploiement depuis Git

Si le fichier n'est pas encore sur GitHub, vous pouvez le transférer manuellement:

### Depuis Windows PowerShell:

```powershell
# Copier le script vers le VPS
scp deploy-to-vps.sh root@158.220.108.42:/root/deploy.sh

# Connexion SSH
ssh root@158.220.108.42

# Sur le VPS
chmod +x /root/deploy.sh
sudo bash /root/deploy.sh
```

---

## 🎯 MÉTHODE 3: Déploiement manuel étape par étape

Si vous préférez contrôler chaque étape:

```bash
# 1. Connexion
ssh root@158.220.108.42

# 2. Update système
apt update && apt upgrade -y

# 3. Clone le repository
git clone https://github.com/kalibanhall/Kolo-app.git /var/www/kolo
cd /var/www/kolo

# 4. Exécuter le script depuis le repo
chmod +x deploy-to-vps.sh
sudo bash deploy-to-vps.sh
```

---

## ✅ Vérification du déploiement

Une fois le script terminé, vous verrez:

```
========================================
   ✅ KOLO déployé avec succès !
========================================

🌐 URLs de l'application:
   Frontend: http://158.220.108.42
   API: http://158.220.108.42/api

🔐 Compte Admin:
   Email: admin@kolo.com
   Mot de passe: Admin@2025
   Niveau: L3
```

### Tester l'application

1. **Frontend**: Ouvrir http://158.220.108.42 dans votre navigateur
2. **API Health**: http://158.220.108.42/api/health
3. **Se connecter**: Utiliser admin@kolo.com / Admin@2025

---

## 🔧 Gestion de l'application après déploiement

### Voir les logs en temps réel
```bash
pm2 logs kolo-api
```

### Redémarrer le backend
```bash
pm2 restart kolo-api
```

### Vérifier le statut
```bash
pm2 status
systemctl status nginx
systemctl status postgresql
```

### Mettre à jour l'application

```bash
cd /var/www/kolo
git pull origin main

# Backend
cd server
npm install
pm2 restart kolo-api

# Frontend
cd ../client
npm install
npm run build
systemctl reload nginx
```

---

## 🔐 Sécuriser l'application (à faire après)

### 1. Configurer SSL avec Let's Encrypt

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

### 2. Changer le mot de passe Admin

Se connecter à l'app et changer le mot de passe depuis le profil.

### 3. Désactiver l'accès direct au port 3001

```bash
ufw delete allow 3001/tcp
ufw reload
```

---

## 🎨 Configuration des services externes

### PayDRC (Mobile Money)

Éditer `/var/www/kolo/server/.env`:
```env
PAYDRC_MERCHANT_ID=votre_merchant_id
PAYDRC_MERCHANT_SECRET=votre_secret
```

### Firebase (Notifications Push)

```env
FIREBASE_PROJECT_ID=votre_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nvotre_clé\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@votre-project.iam.gserviceaccount.com
```

### SendGrid (Emails)

```env
SENDGRID_API_KEY=votre_api_key
SENDGRID_FROM_EMAIL=noreply@kolo-app.com
```

Après modification:
```bash
pm2 restart kolo-api
```

---

## 🌐 Configuration d'un sous-domaine (plus tard)

Quand vous aurez un domaine (ex: tombola.votredomaine.com):

### 1. Configurer le DNS

Ajouter un enregistrement A:
```
Type: A
Nom: tombola (ou @)
Valeur: 158.220.108.42
TTL: 3600
```

### 2. Mettre à jour Nginx

```bash
nano /etc/nginx/sites-available/kolo
```

Changer `server_name 158.220.108.42;` par:
```nginx
server_name tombola.votredomaine.com www.tombola.votredomaine.com;
```

### 3. Configurer SSL

```bash
certbot --nginx -d tombola.votredomaine.com -d www.tombola.votredomaine.com
```

### 4. Mettre à jour les variables d'environnement

Dans `/var/www/kolo/server/.env`:
```env
API_URL=https://tombola.votredomaine.com
CLIENT_URL=https://tombola.votredomaine.com
CORS_ORIGIN=https://tombola.votredomaine.com
```

Redémarrer:
```bash
pm2 restart kolo-api
systemctl reload nginx
```

---

## 🆘 Dépannage

### Le site ne s'affiche pas

```bash
# Vérifier Nginx
systemctl status nginx
nginx -t

# Vérifier les logs
tail -f /var/log/nginx/error.log
```

### L'API ne répond pas

```bash
# Vérifier PM2
pm2 status
pm2 logs kolo-api

# Redémarrer
pm2 restart kolo-api
```

### Erreur de base de données

```bash
# Vérifier PostgreSQL
systemctl status postgresql

# Se connecter à la DB
sudo -u postgres psql -d kolo_db

# Vérifier les tables
\dt
```

---

## 📞 Aide

Si vous avez des problèmes:

1. Vérifier les logs: `pm2 logs kolo-api`
2. Vérifier le statut: `pm2 status`
3. Vérifier Nginx: `nginx -t`
4. Redémarrer tout: `pm2 restart all && systemctl reload nginx`

---

## 🎉 C'est tout !

Votre application KOLO est maintenant déployée et accessible sur:
**http://158.220.108.42**

Connectez-vous avec:
- **Email**: admin@kolo.com
- **Mot de passe**: Admin@2025
