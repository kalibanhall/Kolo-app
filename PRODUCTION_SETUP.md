# Configuration Production - Vercel et Render

## Étape 1: Configurer Vercel (Frontend)

### Aller sur Vercel Dashboard:
1. Ouvrez https://vercel.com/dashboard
2. Cliquez sur le projet "kolo-6ig8f222c"

### Ajouter les Variables d'Environnement:
1. Cliquez sur **Settings** (en haut)
2. Allez à **Environment Variables**
3. Cliquez **Add New** et complétez chaque variable:

```
VITE_API_URL=https://kolo-api.onrender.com/api

VITE_FIREBASE_API_KEY=AIzaSyCAiYvJFyps22vtwxjbD8GxTQ87dS6Vvw0
VITE_FIREBASE_AUTH_DOMAIN=kolo-e4711.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kolo-e4711
VITE_FIREBASE_STORAGE_BUCKET=kolo-e4711.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=556561408264
VITE_FIREBASE_APP_ID=1:556561408264:web:f061f8eeaa21a13efa0cbd
VITE_FIREBASE_MEASUREMENT_ID=G-30CWWRKY2C
VITE_FIREBASE_VAPID_KEY=BMu_W8HLI86t-qkRWUu9Vcq9OMTtO6qu1rx7fN0FQdD1215eB3jokrvFT99KN-7XQQ4PoJ7vQBflF0BNOkutYRM
```

### Redéployer:
1. Allez à **Deployments** (dans le menu gauche)
2. Trouvez le dernier déploiement
3. Cliquez les **...** (trois points)
4. Sélectionnez **Redeploy**
5. Attendez le redéploiement (2-3 minutes)

---

## Étape 2: Configurer Render (Backend)

### Aller sur Render Dashboard:
1. Ouvrez https://dashboard.render.com
2. Cliquez sur le service "kolo-backend"

### Ajouter les Variables d'Environnement:
1. Allez à **Environment**
2. Cliquez **Add Environment Variable**
3. Ajoutez chaque variable (voir liste ci-dessous)

```
NODE_ENV=production
PORT=5000

DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=[ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE-ROLE-KEY]

CORS_ORIGIN=https://kolo-6ig8f222c-kalibanhalls-projects.vercel.app
CLIENT_URL=https://kolo-6ig8f222c-kalibanhalls-projects.vercel.app

JWT_SECRET=kolo_super_secret_jwt_key_change_in_production_2025
JWT_EXPIRE=7d

SENDGRID_API_KEY=SG.[VOTRE_CLE]
FROM_EMAIL=support@kolo.cd
FROM_NAME=KOLO Tombola
ADMIN_EMAIL=admin@kolo.cd

AT_USERNAME=[USERNAME_AFRICAS_TALKING]
AT_API_KEY=[API_KEY_AFRICAS_TALKING]
AT_SENDER_ID=KOLO

CLOUDINARY_CLOUD_NAME=[VOTRE_CLOUD_NAME]
CLOUDINARY_API_KEY=[VOTRE_API_KEY]
CLOUDINARY_API_SECRET=[VOTRE_API_SECRET]

FIREBASE_PROJECT_ID=kolo-e4711
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@kolo-e4711.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=[VOTRE_PRIVATE_KEY]
FIREBASE_DATABASE_URL=https://kolo-e4711.firebaseio.com

MAX_TICKETS_PER_PURCHASE=5
TICKET_PRICE=1
DEFAULT_CAMPAIGN_TICKETS=15200
TIMEZONE=Africa/Kinshasa

WEBHOOK_SECRET=kolo_webhook_secret_key_2025
```

### Redéployer:
1. Une fois toutes les variables ajoutées, cliquez **Manual Deploy**
2. Sélectionnez la branche **main**
3. Attendez le redéploiement

---

## Étape 3: Configurer Firebase (Authorized Domains)

### Ajouter Vercel Domain:
1. Ouvrez https://console.firebase.google.com
2. Sélectionnez le projet **kolo-e4711**
3. Allez à **Authentication** (Authentification)
4. Cliquez sur **Settings** (Paramètres)
5. Sous **Authorized domains**, cliquez **Add domain**
6. Entrez: `kolo-6ig8f222c-kalibanhalls-projects.vercel.app`
7. Cliquez **Add**
8. Attendez 2-5 minutes que Firebase synchronise

---

## Étape 4: Vérifier la Configuration

### Tester l'API:
```bash
curl https://kolo-api.onrender.com/api/admin/stats
# Devrait retourner une erreur 401 ou 403 (normal, authentification requise)
```

### Tester Firebase:
1. Allez sur https://kolo-6ig8f222c-kalibanhalls-projects.vercel.app
2. Ouvrez la console (F12)
3. Vérifiez qu'il n'y a pas d'erreur 401 sur manifest.json
4. Essayez de vous connecter avec Google OAuth

---

## Troubleshooting

### Erreur 401 manifest.json
- Vérifiez que les headers sont corrects dans vercel.json
- Vérifiez que .env.production existe et a les bonnes variables

### OAuth Firebase échoue
- Vérifiez que le domaine Vercel est dans Firebase Authorized Domains
- Attendez 5 minutes après l'ajout
- Testez en incognito (cache navigateur)

### API 401
- Vérifiez que CORS_ORIGIN sur Render contient le domaine Vercel exact
- Vérifiez que les variables d'environnement sont bien sauvegardées
- Redéployez le backend

### Notifications n'arrivent pas
- Vérifiez que VITE_FIREBASE_VAPID_KEY est correct dans Vercel
- Vérifiez que FIREBASE_PRIVATE_KEY est correct dans Render (respect des sauts de ligne)

---

## Notes de Sécurité

1. **Ne jamais commiter** les fichiers .env en production
2. **Changer JWT_SECRET** en production (valeur aléatoire)
3. **Changer WEBHOOK_SECRET** en production
4. **Activer HTTPS** partout (déjà fait par Vercel/Render)
5. **Monitorer les logs** régulièrement
