# 🚀 Guide de Déploiement - GitHub & Vercel

## 📋 Vue d'ensemble

Ce guide vous accompagne pour déployer KOLO sur:
- **GitHub** - Pour héberger votre code
- **Vercel** - Pour le Frontend (React)
- **Render/Railway** - Pour le Backend (Node.js)
- **Supabase** - Pour la base de données PostgreSQL

---

## 🎯 Étape 1: Préparation du Projet

### 1.1 Vérifier que les fichiers sensibles sont ignorés

```powershell
# Vérifier que .gitignore existe et contient:
Get-Content .gitignore
```

Le `.gitignore` doit contenir au minimum:
```
node_modules/
.env
.env.local
.env.production
*.log
dist/
build/
```

### 1.2 Créer les fichiers .env nécessaires

Vérifier que vous avez:
- ✅ `server/.env.example` (template)
- ✅ `client/.env.example` (template)
- ⚠️ **JAMAIS** committer les fichiers `.env` réels

---

## 🐙 Étape 2: Pousser sur GitHub

### 2.1 Initialiser Git (si pas déjà fait)

```powershell
# Dans le dossier c:\kolo
cd c:\kolo

# Vérifier si Git est initialisé
git status

# Si pas initialisé:
git init
git branch -M main
```

### 2.2 Créer un nouveau repository sur GitHub

1. Aller sur [github.com](https://github.com)
2. Cliquer sur **"+"** → **"New repository"**
3. Nom du repo: `kolo-tombola`
4. Description: "Plateforme de tombola moderne avec paiement Mobile Money"
5. ⚠️ **NE PAS** cocher "Initialize with README" (vous en avez déjà un)
6. Cliquer **"Create repository"**

### 2.3 Lier votre projet local à GitHub

```powershell
# Remplacer VOTRE_USERNAME par votre nom d'utilisateur GitHub
git remote add origin https://github.com/VOTRE_USERNAME/kolo-tombola.git

# Vérifier la connexion
git remote -v
```

### 2.4 Faire votre premier commit

```powershell
# Ajouter tous les fichiers
git add .

# Créer le commit
git commit -m "🎉 Initial commit - KOLO Tombola Production Ready"

# Pousser sur GitHub
git push -u origin main
```

**Note:** Si vous avez des erreurs d'authentification:
1. Aller dans **GitHub Settings** → **Developer Settings** → **Personal Access Tokens**
2. Créer un nouveau token (classic)
3. Cocher les permissions: `repo`, `workflow`
4. Utiliser le token comme mot de passe

---

## ☁️ Étape 3: Déployer le Backend sur Render

### 3.1 Créer un compte Render

1. Aller sur [render.com](https://render.com)
2. S'inscrire avec GitHub (recommandé)

### 3.2 Créer un Web Service

1. Cliquer **"New +"** → **"Web Service"**
2. Connecter votre repository `kolo-tombola`
3. Configuration:
   - **Name**: `kolo-api`
   - **Region**: Frankfurt (le plus proche de l'Afrique)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (pour commencer)

### 3.3 Ajouter les variables d'environnement

Dans **Environment** → **Environment Variables**, ajouter:

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=GENERER_UNE_CLE_SECURISEE_ICI
JWT_EXPIRES_IN=7d

# Supabase (voir étape 4)
DB_HOST=db.xxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=VOTRE_MOT_DE_PASSE_SUPABASE

# Admin
ADMIN_EMAIL=admin@kolo.com
ADMIN_PASSWORD=VOTRE_MOT_DE_PASSE_ADMIN

# Africa's Talking
AFRICAS_TALKING_USERNAME=sandbox
AFRICAS_TALKING_API_KEY=VOTRE_CLE_API
AFRICAS_TALKING_SHORTCODE=VOTRE_SHORTCODE

# URLs (à mettre à jour après déploiement Vercel)
CLIENT_URL=https://votre-app.vercel.app
CORS_ORIGIN=https://votre-app.vercel.app
```

**Générer un JWT_SECRET sécurisé:**
```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3.4 Déployer

1. Cliquer **"Create Web Service"**
2. Attendre le déploiement (2-3 minutes)
3. Noter l'URL: `https://kolo-api.onrender.com`

### 3.5 Initialiser la base de données

```powershell
# Après le déploiement, exécuter la migration
# Option 1: Via Render Shell
# Dans Render Dashboard → Shell → Exécuter:
npm run migrate

# Option 2: Localement avec l'URL de production
# Modifier temporairement server/.env avec les credentials de prod
# Puis:
cd server
node migrate.js
```

---

## 🗄️ Étape 4: Configurer Supabase (Base de Données)

### 4.1 Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Cliquer **"New Project"**
3. Configuration:
   - **Name**: `kolo-tombola`
   - **Database Password**: Générer un mot de passe fort (le sauvegarder!)
   - **Region**: Frankfurt (Europe centrale)
4. Attendre 2 minutes (création du projet)

### 4.2 Récupérer les credentials

1. Dans le projet Supabase → **Settings** → **Database**
2. Scroll vers **Connection Info** ou **Connection String**
3. Noter:
   - **Host**: `db.xxx.supabase.co`
   - **Database name**: `postgres`
   - **Port**: `5432`
   - **User**: `postgres`
   - **Password**: Celui que vous avez créé

### 4.3 Exécuter le schéma SQL

1. Dans Supabase → **SQL Editor**
2. Créer une nouvelle query
3. Copier tout le contenu de `server/src/database/schema.sql`
4. Coller et cliquer **"Run"**
5. ✅ Vérifier qu'il n'y a pas d'erreurs

### 4.4 Mettre à jour les variables d'environnement Render

Retourner sur Render → votre service `kolo-api` → **Environment**:
- Mettre à jour `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Cliquer **"Save Changes"**
- Le service va redémarrer automatiquement

---

## ⚡ Étape 5: Déployer le Frontend sur Vercel

### 5.1 Préparer le projet

Créer `client/.env.production`:
```env
VITE_API_URL=https://kolo-api.onrender.com/api
VITE_APP_NAME=KOLO Tombola
```

Committer ce changement:
```powershell
git add client/.env.production
git commit -m "Add production environment variables"
git push
```

### 5.2 Créer un compte Vercel

1. Aller sur [vercel.com](https://vercel.com)
2. Cliquer **"Sign Up"**
3. S'inscrire avec GitHub (recommandé)

### 5.3 Importer le projet

1. Cliquer **"Add New..."** → **"Project"**
2. Sélectionner votre repository `kolo-tombola`
3. Cliquer **"Import"**

### 5.4 Configurer le projet

**Framework Preset**: Vite

**Root Directory**: Cliquer **"Edit"** → Sélectionner `client`

**Build Settings**:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

**Environment Variables**: Ajouter:
```
VITE_API_URL = https://kolo-api.onrender.com/api
VITE_APP_NAME = KOLO Tombola
```

### 5.5 Déployer

1. Cliquer **"Deploy"**
2. Attendre 1-2 minutes
3. ✅ Votre app est en ligne!
4. Noter l'URL: `https://kolo-tombola.vercel.app`

### 5.6 Mettre à jour le CORS du Backend

Retourner sur Render → `kolo-api` → **Environment**:
```
CLIENT_URL = https://kolo-tombola.vercel.app
CORS_ORIGIN = https://kolo-tombola.vercel.app
```

Sauvegarder (le service redémarre automatiquement).

---

## ✅ Étape 6: Tests Post-Déploiement

### 6.1 Tester l'API Backend

```powershell
# Test de santé
curl https://kolo-api.onrender.com/api/health

# Test campagne active
curl https://kolo-api.onrender.com/api/campaigns/current
```

### 6.2 Tester le Frontend

1. Ouvrir `https://kolo-tombola.vercel.app`
2. Vérifier que la page s'affiche
3. Tester la connexion admin:
   - Email: `admin@kolo.com`
   - Password: Celui défini dans `ADMIN_PASSWORD`

### 6.3 Tester le workflow complet

1. ✅ Inscription d'un utilisateur
2. ✅ Connexion
3. ✅ Voir la campagne active
4. ✅ Acheter des tickets (mode test)
5. ✅ Voir les tickets dans le dashboard

---

## 🔄 Workflow de Développement Continu

### Faire des modifications

```powershell
# 1. Modifier votre code localement
# 2. Tester localement

# 3. Committer et pousser
git add .
git commit -m "Description des changements"
git push

# Vercel redéploie automatiquement le frontend!
# Render redéploie automatiquement le backend!
```

### Branches de développement

```powershell
# Créer une branche pour développer
git checkout -b feature/nouvelle-fonctionnalite

# Faire vos modifications
# ...

# Pousser la branche
git push -u origin feature/nouvelle-fonctionnalite

# Sur Vercel, vous pouvez créer un preview deployment pour cette branche!
```

---

## 🔒 Sécurité Post-Déploiement

### Checklist

- [ ] `.env` jamais commité sur GitHub
- [ ] `JWT_SECRET` différent de celui de développement
- [ ] `ADMIN_PASSWORD` fort et sécurisé
- [ ] `DB_PASSWORD` fort et sécurisé
- [ ] HTTPS activé (automatique avec Vercel/Render)
- [ ] CORS configuré correctement
- [ ] Variables sensibles uniquement dans Render/Vercel dashboard

---

## 🌍 Étape 7: Nom de Domaine Personnalisé (Optionnel)

### Pour Vercel (Frontend)

1. Acheter un domaine (ex: Namecheap, GoDaddy)
2. Dans Vercel → Votre projet → **Settings** → **Domains**
3. Ajouter votre domaine: `www.kolo-tombola.com`
4. Suivre les instructions DNS
5. ✅ SSL automatique!

### Pour Render (Backend)

1. Dans Render → Votre service → **Settings** → **Custom Domain**
2. Ajouter: `api.kolo-tombola.com`
3. Configurer les DNS selon les instructions
4. ✅ SSL automatique!

### Mettre à jour les variables d'environnement

**Render** (`kolo-api`):
```
CLIENT_URL = https://www.kolo-tombola.com
CORS_ORIGIN = https://www.kolo-tombola.com
```

**Vercel** (`client`):
```
VITE_API_URL = https://api.kolo-tombola.com/api
```

---

## 🆘 Troubleshooting

### Erreur CORS

**Symptôme**: `Access to fetch at 'https://kolo-api.onrender.com/api/...' from origin 'https://kolo-tombola.vercel.app' has been blocked by CORS`

**Solution**:
1. Vérifier `CORS_ORIGIN` dans Render
2. Pas de `/` à la fin de l'URL
3. URL exactement identique au domaine Vercel

### Backend ne démarre pas

**Symptôme**: Error 500 ou service indisponible

**Solution**:
1. Render Dashboard → Logs
2. Vérifier les variables d'environnement
3. Vérifier la connexion à Supabase
4. Re-déployer manuellement

### Frontend affiche des erreurs API

**Symptôme**: "Network Error" ou "Failed to fetch"

**Solution**:
1. Vérifier que `VITE_API_URL` est correct
2. Tester l'API directement: `curl https://kolo-api.onrender.com/api/health`
3. Vérifier les logs Render

### Base de données vide après déploiement

**Solution**:
```powershell
# Se connecter à la DB de production et exécuter:
cd server
# Modifier .env temporairement avec les credentials de prod
node migrate.js
```

---

## 📊 Monitoring

### Render Dashboard

- **Logs**: Voir les logs en temps réel
- **Metrics**: CPU, RAM, Network
- **Events**: Déploiements, restarts

### Vercel Analytics

1. Activer Vercel Analytics (gratuit)
2. Voir les visiteurs, pages vues, performance

### Supabase Dashboard

- **Table Editor**: Voir les données
- **SQL Editor**: Exécuter des requêtes
- **Logs**: Voir les requêtes SQL

---

## 💰 Coûts

### Gratuit (pour commencer)

- ✅ **GitHub**: Gratuit (repos publics illimités)
- ✅ **Vercel**: Gratuit (100GB bandwidth/mois)
- ✅ **Render**: Gratuit (750h/mois, sleep après 15min d'inactivité)
- ✅ **Supabase**: Gratuit (500MB database, 2GB bandwidth)

### Si vous avez du trafic

- **Vercel Pro**: $20/mois (plus de bandwidth)
- **Render Starter**: $7/mois (pas de sleep, plus de ressources)
- **Supabase Pro**: $25/mois (8GB database)

---

## 🎉 Félicitations!

Votre application KOLO est maintenant en production sur:
- ✅ Code: GitHub
- ✅ Frontend: Vercel
- ✅ Backend: Render
- ✅ Database: Supabase

### URLs de votre application

- **Frontend**: https://kolo-tombola.vercel.app
- **Backend API**: https://kolo-api.onrender.com
- **GitHub**: https://github.com/VOTRE_USERNAME/kolo-tombola

---

## 📞 Prochaines Étapes

1. [ ] Configurer Africa's Talking en production
2. [ ] Ajouter un nom de domaine personnalisé
3. [ ] Activer les analytics
4. [ ] Configurer les backups de la DB
5. [ ] Créer votre première campagne!

🚀 **Bon lancement!**
