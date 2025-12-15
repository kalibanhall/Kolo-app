# Checklist de Configuration Production - KOLO

## Phase 1: Configuration Locale (Déjà Fait)
- [x] Créer .env.production pour client (Vercel)
- [x] Créer .env.production pour server (Render)
- [x] Vérifier vercel.json (CORS, headers)
- [x] Vérifier vite.config.js
- [x] Créer guide PRODUCTION_SETUP.md

## Phase 2: Configuration Vercel (À FAIRE)
- [ ] Ouvrir https://vercel.com/dashboard
- [ ] Sélectionner projet "kolo-6ig8f222c"
- [ ] Aller à **Settings** → **Environment Variables**
- [ ] Ajouter variable: `VITE_API_URL` = `https://kolo-api.onrender.com/api`
- [ ] Ajouter variable: `VITE_FIREBASE_API_KEY` = `AIzaSyCAiYvJFyps22vtwxjbD8GxTQ87dS6Vvw0`
- [ ] Ajouter variable: `VITE_FIREBASE_AUTH_DOMAIN` = `kolo-e4711.firebaseapp.com`
- [ ] Ajouter variable: `VITE_FIREBASE_PROJECT_ID` = `kolo-e4711`
- [ ] Ajouter variable: `VITE_FIREBASE_STORAGE_BUCKET` = `kolo-e4711.firebasestorage.app`
- [ ] Ajouter variable: `VITE_FIREBASE_MESSAGING_SENDER_ID` = `556561408264`
- [ ] Ajouter variable: `VITE_FIREBASE_APP_ID` = `1:556561408264:web:f061f8eeaa21a13efa0cbd`
- [ ] Ajouter variable: `VITE_FIREBASE_MEASUREMENT_ID` = `G-30CWWRKY2C`
- [ ] Ajouter variable: `VITE_FIREBASE_VAPID_KEY` = `BMu_W8HLI86t-qkRWUu9Vcq9OMTtO6qu1rx7fN0FQdD1215eB3jokrvFT99KN-7XQQ4PoJ7vQBflF0BNOkutYRM`
- [ ] Aller à **Deployments**
- [ ] Cliquer **...** sur le dernier déploiement
- [ ] Cliquer **Redeploy**
- [ ] Attendre 2-3 minutes

## Phase 3: Configuration Render (À FAIRE)
- [ ] Ouvrir https://dashboard.render.com
- [ ] Sélectionner service "kolo-backend"
- [ ] Aller à **Environment**
- [ ] Ajouter toutes les variables (voir PRODUCTION_SETUP.md)
- [ ] Cliquer **Manual Deploy**
- [ ] Sélectionner branche **main**
- [ ] Attendre le redéploiement

### Variables Render à Ajouter:
```
NODE_ENV=production
PORT=5000
DATABASE_URL=[À OBTENIR DE SUPABASE]
SUPABASE_URL=[À OBTENIR DE SUPABASE]
SUPABASE_ANON_KEY=[À OBTENIR DE SUPABASE]
SUPABASE_SERVICE_ROLE_KEY=[À OBTENIR DE SUPABASE]
CORS_ORIGIN=https://kolo-6ig8f222c-kalibanhalls-projects.vercel.app
CLIENT_URL=https://kolo-6ig8f222c-kalibanhalls-projects.vercel.app
JWT_SECRET=kolo_super_secret_jwt_key_change_in_production_2025
JWT_EXPIRE=7d
SENDGRID_API_KEY=[À OBTENIR]
FROM_EMAIL=support@kolo.cd
FROM_NAME=KOLO Tombola
ADMIN_EMAIL=admin@kolo.cd
AT_USERNAME=[À OBTENIR]
AT_API_KEY=[À OBTENIR]
AT_SENDER_ID=KOLO
CLOUDINARY_CLOUD_NAME=[À OBTENIR]
CLOUDINARY_API_KEY=[À OBTENIR]
CLOUDINARY_API_SECRET=[À OBTENIR]
FIREBASE_PROJECT_ID=kolo-e4711
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@kolo-e4711.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=[À OBTENIR]
FIREBASE_DATABASE_URL=https://kolo-e4711.firebaseio.com
MAX_TICKETS_PER_PURCHASE=5
TICKET_PRICE=1
DEFAULT_CAMPAIGN_TICKETS=15200
TIMEZONE=Africa/Kinshasa
WEBHOOK_SECRET=kolo_webhook_secret_key_2025
```

## Phase 4: Configuration Firebase (À FAIRE)
- [ ] Ouvrir https://console.firebase.google.com
- [ ] Sélectionner projet **kolo-e4711**
- [ ] Aller à **Authentication** (Authentification)
- [ ] Cliquer **Settings** (Paramètres)
- [ ] Aller à l'onglet **Authorized domains**
- [ ] Cliquer **Add domain**
- [ ] Entrer: `kolo-6ig8f222c-kalibanhalls-projects.vercel.app`
- [ ] Cliquer **Add**
- [ ] Attendre 2-5 minutes

## Phase 5: Vérification (À FAIRE)
- [ ] Ouvrir https://kolo-6ig8f222c-kalibanhalls-projects.vercel.app
- [ ] Ouvrir la console (F12)
- [ ] Vérifier: Pas d'erreur 401 sur manifest.json
- [ ] Vérifier: Pas d'erreur OAuth Firebase
- [ ] Vérifier: Pas d'erreur API 401
- [ ] Tester la connexion avec Google OAuth
- [ ] Tester la page admin
- [ ] Tester la création de campagne
- [ ] Tester l'achat de ticket

## Phase 6: Monitoring (À FAIRE)
- [ ] Configurer Sentry pour erreur tracking (optionnel)
- [ ] Vérifier les logs Render régulièrement
- [ ] Configurer alertes Vercel
- [ ] Tester les notifications push
- [ ] Tester les emails SendGrid
- [ ] Tester les SMS Africa's Talking

## Notes Importantes

### Clés à Obtenir/Vérifier:
- [ ] **Supabase**: DATABASE_URL, ANON_KEY, SERVICE_KEY
- [ ] **SendGrid**: API_KEY (SG....)
- [ ] **Africa's Talking**: USERNAME, API_KEY
- [ ] **Cloudinary**: CLOUD_NAME, API_KEY, API_SECRET
- [ ] **Firebase**: PRIVATE_KEY (pour backend)

### Sécurité:
- [ ] Ne JAMAIS partager les variables sensibles
- [ ] Activer 2FA sur Firebase, Vercel, Render
- [ ] Monitorer l'utilisation des clés
- [ ] Rotationner les secrets périodiquement

### Production vs Development:
- [ ] Development (.env.development): localhost
- [ ] Production (.env.production): URLs HTTPS
- [ ] .env.production n'est PAS commité (sécurité)

## Support

Si vous avez des erreurs:
1. Consultez PRODUCTION_SETUP.md (Troubleshooting)
2. Vérifiez les logs Render
3. Vérifiez la console Vercel (F12)
4. Vérifiez Firebase Console > Cloud Messaging

## Commandes Utiles

```bash
# Tester l'API depuis local
curl http://localhost:5000/api/admin/stats -H "Authorization: Bearer TOKEN"

# Vérifier status Render
curl https://kolo-api.onrender.com/api/health

# Vérifier status Vercel
curl https://kolo-6ig8f222c-kalibanhalls-projects.vercel.app
```
