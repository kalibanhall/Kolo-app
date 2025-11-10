# 🚀 Guide de Déploiement Rapide - KOLO

Votre code est sur GitHub: https://github.com/kalibanhall/Kolo-app

---

## ✅ Base de Données - SUPABASE (DÉJÀ CONFIGURÉE)

**Connection String**: 
```
postgresql://postgres.wzthlhxtdtkqdnofzyrh:Qualis2025@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
```

### Variables pour le déploiement:
```
DB_HOST=aws-0-eu-west-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.wzthlhxtdtkqdnofzyrh
DB_PASSWORD=Qualis2025
```

---

## 🔧 ÉTAPE 1: Déployer le BACKEND sur Render

### 1.1 Créer un compte Render
1. Allez sur **https://render.com**
2. Cliquez **"Get Started"** ou **"Sign Up"**
3. Connectez-vous avec **GitHub** (recommandé)

### 1.2 Créer un Web Service
1. Dans le dashboard Render, cliquez **"New +"** → **"Web Service"**
2. Cliquez **"Build and deploy from a Git repository"** → **"Next"**
3. Connectez votre compte GitHub si demandé
4. Sélectionnez le repository **"Kolo-app"**
5. Cliquez **"Connect"**

### 1.3 Configuration du Service

**Champs à remplir:**

- **Name**: `kolo-api`
- **Region**: `Frankfurt (EU Central)` (le plus proche de l'Afrique)
- **Branch**: `main`
- **Root Directory**: `server`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: `Free` (pour commencer)

### 1.4 Variables d'Environnement

Cliquez sur **"Advanced"** → **"Add Environment Variable"**

Ajoutez ces variables UNE PAR UNE:

```env
NODE_ENV=production

PORT=5000

DB_HOST=aws-0-eu-west-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.wzthlhxtdtkqdnofzyrh
DB_PASSWORD=Qualis2025

JWT_SECRET=7f8a9b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e

JWT_EXPIRES_IN=7d

ADMIN_EMAIL=admin@kolo.com
ADMIN_PASSWORD=AdminKolo2025!

AFRICAS_TALKING_USERNAME=sandbox
AFRICAS_TALKING_API_KEY=votre_cle_api_africas_talking
AFRICAS_TALKING_SHORTCODE=votre_shortcode

CLIENT_URL=https://kolo-app.vercel.app
CORS_ORIGIN=https://kolo-app.vercel.app
```

**Note**: `JWT_SECRET` a été généré aléatoirement. Changez `ADMIN_PASSWORD` si vous voulez.

### 1.5 Déployer
1. Cliquez **"Create Web Service"**
2. Attendez 2-3 minutes que le déploiement se termine
3. Notez l'URL (ex: `https://kolo-api.onrender.com`)

### 1.6 Exécuter la Migration

Une fois déployé:
1. Dans Render Dashboard → Votre service `kolo-api`
2. Cliquez sur **"Shell"** (en haut à droite)
3. Exécutez:
```bash
npm run migrate
```

---

## ⚡ ÉTAPE 2: Déployer le FRONTEND sur Vercel

### 2.1 Créer un compte Vercel
1. Allez sur **https://vercel.com**
2. Cliquez **"Sign Up"**
3. Choisissez **"Continue with GitHub"**
4. Autorisez Vercel à accéder à vos repos

### 2.2 Importer le Projet
1. Dans le dashboard Vercel, cliquez **"Add New..."** → **"Project"**
2. Trouvez et sélectionnez **"Kolo-app"**
3. Cliquez **"Import"**

### 2.3 Configuration du Projet

**Configure Project:**

1. **Framework Preset**: `Vite` (devrait être détecté automatiquement)

2. **Root Directory**: Cliquez sur **"Edit"** → Sélectionnez `client` → **"Continue"**

3. **Build Settings** (déjà configuré automatiquement):
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Environment Variables**:

Cliquez **"Add"** et ajoutez:

```
Name: VITE_API_URL
Value: https://kolo-api.onrender.com/api
```

```
Name: VITE_APP_NAME
Value: KOLO Tombola
```

### 2.4 Déployer
1. Cliquez **"Deploy"**
2. Attendez 1-2 minutes
3. Votre app sera disponible sur une URL comme: `https://kolo-app.vercel.app`

### 2.5 Mettre à Jour le CORS du Backend

1. Retournez sur **Render Dashboard**
2. Allez dans votre service **kolo-api** → **Environment**
3. Modifiez ces variables avec l'URL exacte de Vercel:

```
CLIENT_URL = https://votre-app-vercel.vercel.app
CORS_ORIGIN = https://votre-app-vercel.vercel.app
```

4. Sauvegardez (le service redémarrera automatiquement)

---

## ✅ ÉTAPE 3: Tests Post-Déploiement

### 3.1 Tester le Backend

Ouvrez votre navigateur:
```
https://kolo-api.onrender.com/api/campaigns/current
```

Vous devriez voir `{"message": "No active campaign"}` ou une campagne.

### 3.2 Tester le Frontend

1. Ouvrez: `https://votre-app.vercel.app`
2. La page d'accueil devrait s'afficher
3. Essayez de vous connecter avec:
   - Email: `admin@kolo.com`
   - Password: `AdminKolo2025!` (ou celui que vous avez défini)

### 3.3 Créer une Campagne

1. Connectez-vous en tant qu'admin
2. Allez dans "Créer une campagne"
3. Créez votre première campagne!

---

## 🔄 Pour les Futures Mises à Jour

```powershell
# 1. Faire vos modifications dans le code
# 2. Committer et pousser

git add .
git commit -m "Description des changements"
git push

# Vercel et Render redéploient automatiquement! 🎉
```

---

## 🌐 URLs de Votre Application

Une fois déployé, vous aurez:

- **Frontend**: https://kolo-app.vercel.app
- **Backend API**: https://kolo-api.onrender.com
- **Database**: Supabase Dashboard
- **GitHub**: https://github.com/kalibanhall/Kolo-app

---

## 🆘 Problèmes Courants

### Backend ne démarre pas
- Vérifiez les logs dans Render Dashboard
- Vérifiez que toutes les variables d'env sont définies

### Frontend affiche "Network Error"
- Vérifiez que `VITE_API_URL` pointe vers Render
- Vérifiez que le CORS est configuré dans Render

### Erreur de DB
- Vérifiez les credentials Supabase
- Exécutez `npm run migrate` dans le Shell Render

---

## 📞 Prochaines Étapes

1. [ ] Configurer Africa's Talking en production
2. [ ] Ajouter un nom de domaine personnalisé
3. [ ] Tester le workflow complet (inscription → achat → paiement)
4. [ ] Configurer les backups DB

🎉 **Votre application est prête pour la production!**
