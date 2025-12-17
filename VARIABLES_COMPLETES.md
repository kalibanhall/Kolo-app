# KOLO - Toutes les Variables d'Environnement Production

## ============================================
## VERCEL FRONTEND (copy-paste directement)
## ============================================

### Aller à: https://vercel.com/dashboard
### Sélectionner le projet "kolo-6ig8f222c"
### Aller à: Settings → Environment Variables
### Ajouter chaque variable:

VITE_API_URL
https://kolo-api.onrender.com/api

VITE_FIREBASE_API_KEY
AIzaSyCAiYvJFyps22vtwxjbD8GxTQ87dS6Vvw0

VITE_FIREBASE_AUTH_DOMAIN
kolo-e4711.firebaseapp.com

VITE_FIREBASE_PROJECT_ID
kolo-e4711

VITE_FIREBASE_STORAGE_BUCKET
kolo-e4711.firebasestorage.app

VITE_FIREBASE_MESSAGING_SENDER_ID
556561408264

VITE_FIREBASE_APP_ID
1:556561408264:web:f061f8eeaa21a13efa0cbd

VITE_FIREBASE_MEASUREMENT_ID
G-30CWWRKY2C

VITE_FIREBASE_VAPID_KEY
BMu_W8HLI86t-qkRWUu9Vcq9OMTtO6qu1rx7fN0FQdD1215eB3jokrvFT99KN-7XQQ4PoJ7vQBflF0BNOkutYRM

VITE_APP_NAME
KOLO Tombola

VITE_ENABLE_ANALYTICS
true

---

## ============================================
## RENDER BACKEND (copy-paste directement)
## ============================================

### Aller à: https://dashboard.render.com
### Sélectionner le service "kolo-backend"
### Aller à: Environment → Add Environment Variable
### Ajouter chaque variable:

NODE_ENV
production

PORT
5000

DATABASE_URL
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

SUPABASE_URL
https://[PROJECT-REF].supabase.co

SUPABASE_ANON_KEY
[VOTRE_ANON_KEY_SUPABASE]

SUPABASE_SERVICE_ROLE_KEY
[VOTRE_SERVICE_ROLE_KEY_SUPABASE]

CORS_ORIGIN
https://kolo-6ig8f222c-kalibanhalls-projects.vercel.app

CLIENT_URL
https://kolo-6ig8f222c-kalibanhalls-projects.vercel.app

JWT_SECRET
kolo_super_secret_jwt_key_change_in_production_2025

JWT_EXPIRE
7d

SENDGRID_API_KEY
SG.[VOTRE_CLE_SENDGRID]

FROM_EMAIL
support@kolo.cd

FROM_NAME
KOLO Tombola

ADMIN_EMAIL
admin@kolo.cd

AT_USERNAME
[VOTRE_USERNAME_AFRICAS_TALKING]

AT_API_KEY
[VOTRE_API_KEY_AFRICAS_TALKING]

AT_SENDER_ID
KOLO

CLOUDINARY_CLOUD_NAME
[VOTRE_CLOUD_NAME_CLOUDINARY]

CLOUDINARY_API_KEY
[VOTRE_API_KEY_CLOUDINARY]

CLOUDINARY_API_SECRET
[VOTRE_API_SECRET_CLOUDINARY]

FIREBASE_PROJECT_ID
kolo-e4711

FIREBASE_CLIENT_EMAIL
firebase-adminsdk-xxxxx@kolo-e4711.iam.gserviceaccount.com

FIREBASE_PRIVATE_KEY
[VOTRE_PRIVATE_KEY_FIREBASE_COMPLÈTE_AVEC_SAUTS_DE_LIGNE]

FIREBASE_DATABASE_URL
https://kolo-e4711.firebaseio.com

MAX_TICKETS_PER_PURCHASE
5

TICKET_PRICE
1

MIN_TICKET_PRICE
1

DEFAULT_CAMPAIGN_TICKETS
15200

DEFAULT_CURRENCY
USD

TIMEZONE
Africa/Kinshasa

BCRYPT_ROUNDS
10

SESSION_SECRET
kolo_session_secret_key_2025

RATE_LIMIT_WINDOW_MS
900000

RATE_LIMIT_MAX_REQUESTS
100

WEBHOOK_SECRET
kolo_webhook_secret_key_2025

---

## ============================================
## FIREBASE AUTHORIZED DOMAINS
## ============================================

### Aller à: https://console.firebase.google.com
### Sélectionner le projet "kolo-e4711"
### Aller à: Authentication → Settings → Authorized domains
### Cliquer "Add domain" et ajouter:

kolo-6ig8f222c-kalibanhalls-projects.vercel.app

---

## ============================================
## FICHIER .env.development (LOCAL)
## ============================================

VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=KOLO Tombola
VITE_ENABLE_ANALYTICS=false

VITE_FIREBASE_API_KEY=AIzaSyCAiYvJFyps22vtwxjbD8GxTQ87dS6Vvw0
VITE_FIREBASE_AUTH_DOMAIN=kolo-e4711.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kolo-e4711
VITE_FIREBASE_STORAGE_BUCKET=kolo-e4711.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=556561408264
VITE_FIREBASE_APP_ID=1:556561408264:web:f061f8eeaa21a13efa0cbd
VITE_FIREBASE_MEASUREMENT_ID=G-30CWWRKY2C
VITE_FIREBASE_VAPID_KEY=BMu_W8HLI86t-qkRWUu9Vcq9OMTtO6qu1rx7fN0FQdD1215eB3jokrvFT99KN-7XQQ4PoJ7vQBflF0BNOkutYRM

---

## ============================================
## DÉTAILS POUR CHAQUE SERVICE
## ============================================

### SUPABASE (Base de données)
Aller à: https://supabase.com/dashboard
Sélectionner le projet KOLO
Aller à: Settings → Database
Copier:
- Connection String (pour DATABASE_URL)
- Anon Key (pour SUPABASE_ANON_KEY)
- Service Role Key (pour SUPABASE_SERVICE_ROLE_KEY)

### SENDGRID (Email)
Aller à: https://app.sendgrid.com
Aller à: Settings → API Keys
Créer une nouvelle clé API (ou utiliser existante)
Copier la clé (commence par "SG.")

### AFRICA'S TALKING (SMS)
Aller à: https://africastalking.com/sms/login
Sélectionner votre application
Aller à: API Key
Copier: Username et API Key

### CLOUDINARY (Image storage)
Aller à: https://cloudinary.com/console
Aller à: Dashboard
Copier: Cloud Name, API Key, API Secret

### FIREBASE (Notifications & Auth)
Aller à: https://console.firebase.google.com
Sélectionner le projet "kolo-e4711"
Aller à: Project Settings (icône engrenage)
Copier: projectId
Aller à: Service Accounts
Cliquer "Generate New Private Key"
Copier tout le contenu (incluant les sauts de ligne)
Ce sera votre FIREBASE_PRIVATE_KEY

---

## ============================================
## ORDRE DES ÉTAPES (IMPORTANT)
## ============================================

1. VERCEL - Ajouter toutes les variables (10 variables)
   - Attendre que le déploiement commence

2. RENDER - Ajouter toutes les variables (30+ variables)
   - Cliquer "Manual Deploy"
   - Attendre le déploiement

3. FIREBASE - Ajouter le domaine Vercel
   - Attendre 2-5 minutes

4. TESTER - Ouvrir l'app et vérifier
   - Pas d'erreur 401
   - OAuth Google fonctionne
   - API répond

---

## ============================================
## NOTES DE SÉCURITÉ IMPORTANTES
## ============================================

⚠️ JAMAIS commiter les fichiers .env en production
⚠️ JAMAIS partager les API keys
⚠️ JAMAIS mettre les secrets dans les commentaires
⚠️ Changer JWT_SECRET avec valeur aléatoire
⚠️ Changer WEBHOOK_SECRET avec valeur aléatoire
⚠️ Activer 2FA sur tous les services (Vercel, Render, Firebase, etc.)
⚠️ Monitorer les logs régulièrement

---

## ============================================
## VÉRIFICATION FINALE
## ============================================

Après avoir configuré TOUT:

1. Ouvrir: https://kolo-6ig8f222c-kalibanhalls-projects.vercel.app
2. Ouvrir la console (F12)
3. Vérifier qu'il n'y a PAS d'erreur:
   - manifest.json 401
   - OAuth Firebase
   - Unauthorized API

4. Essayer de vous connecter avec Google

5. Si tout fonctionne: Configuration OK!

---

## ============================================
## EN CAS DE PROBLÈME
## ============================================

Erreur 401 manifest.json?
→ Vérifier vercel.json (déjà OK)
→ Vérifier cache navigateur (F5 ou Ctrl+Maj+R)

OAuth Firebase échoue?
→ Vérifier que domaine est dans Firebase Authorized Domains
→ Attendre 5 minutes
→ Tester en incognito

API 401?
→ Vérifier CORS_ORIGIN sur Render
→ Vérifier que Render a redéployé
→ Vérifier les logs Render

Notifications ne arrivent pas?
→ Vérifier VITE_FIREBASE_VAPID_KEY sur Vercel
→ Vérifier FIREBASE_PRIVATE_KEY sur Render
→ Tester sur incognito (cache)

---

Version finale: 15 Décembre 2025
