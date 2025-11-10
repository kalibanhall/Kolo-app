# 🧪 Test de Production - KOLO

## ✅ Statut du Déploiement

### Backend (Render)
- **URL** : https://kolo-api.onrender.com
- **Statut** : ✅ Service actif
- **Port** : 5000
- **Environment** : production

### Frontend (Vercel)
- **URL** : https://kolo-app-gamma.vercel.app
- **Statut** : ✅ Déployé

### Base de données (Supabase)
- **Host** : aws-1-eu-west-1.pooler.supabase.com
- **Port** : 5432
- **Database** : postgres
- **Statut** : ✅ DATABASE_URL configurée

---

## 🔍 Tests à Effectuer

### Test 1 : Vérifier la connexion à la base de données

Ouvrez PowerShell et exécutez :

```powershell
Invoke-WebRequest -Uri "https://kolo-api.onrender.com/api/campaigns/current" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Résultat attendu** :
- ✅ Si vous voyez `{"success":false,"message":"No active campaign"}` → **Connexion DB OK !**
- ✅ Si vous voyez des données de campagne → **Connexion DB OK !**
- ❌ Si vous voyez `500 Internal Server Error` → Problème de connexion DB

### Test 2 : Tester l'endpoint de santé

```powershell
Invoke-WebRequest -Uri "https://kolo-api.onrender.com/api/auth/verify" -UseBasicParsing
```

**Résultat attendu** :
- StatusCode : 401 (Unauthorized) → **Normal** (pas de token fourni)
- ❌ StatusCode : 500 → Problème de connexion DB

### Test 3 : Vérifier les logs Render

1. Allez sur : https://dashboard.render.com
2. Cliquez sur : `kolo-api`
3. Allez dans : `Logs`
4. Cherchez :
   - ✅ `✅ Connected to PostgreSQL database` → **Connexion réussie**
   - ❌ `Database query error: Tenant or user not found` → DATABASE_URL incorrecte
   - ❌ `ECONNREFUSED` → DATABASE_URL manquante

### Test 4 : Tester l'application complète

1. Ouvrez : https://kolo-app-gamma.vercel.app
2. Cliquez sur **"Connexion"**
3. Essayez de vous connecter avec :
   - Email : `admin@kolo.com`
   - Mot de passe : `AdminKolo2025!`

**Résultat attendu** :
- ✅ Redirection vers `/admin` → **Tout fonctionne !**
- ❌ Erreur "Erreur de connexion au serveur" → Problème backend

---

## 📋 Checklist de Vérification

### Variables d'environnement Render

Vérifiez que ces variables sont configurées :

- [ ] `DATABASE_URL` = `postgresql://postgres.wzthlhxtdtkqdnofzyrh:KoloTombola2025@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`
- [ ] `JWT_SECRET` = (votre clé secrète)
- [ ] `ADMIN_PASSWORD` = `AdminKolo2025!`
- [ ] `CLIENT_URL` = `https://kolo-app-gamma.vercel.app`
- [ ] `NODE_ENV` = `production`

### Variables d'environnement Vercel

- [ ] `VITE_API_URL` = `https://kolo-api.onrender.com/api`
- [ ] `VITE_APP_NAME` = `KOLO Tombola`

---

## 🐛 Dépannage

### Si vous voyez toujours "Tenant or user not found"

1. **Vérifiez DATABASE_URL sur Render** :
   - Dashboard Render → kolo-api → Environment
   - DATABASE_URL doit être exactement :
     ```
     postgresql://postgres.wzthlhxtdtkqdnofzyrh:KoloTombola2025@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
     ```

2. **Vérifiez le mot de passe Supabase** :
   - Supabase Dashboard → Project Settings → Database
   - Si le mot de passe a changé, réinitialisez-le
   - Mettez à jour DATABASE_URL sur Render

3. **Redémarrez le service Render** :
   - Dashboard Render → kolo-api → Manual Deploy → Deploy latest commit

### Si vous voyez "ECONNREFUSED"

- DATABASE_URL n'est pas configurée
- Ajoutez-la dans Render → Environment

### Si l'application frontend ne charge pas

1. Vérifiez que `VITE_API_URL` est bien configurée sur Vercel
2. Ouvrez la console du navigateur (F12) pour voir les erreurs

---

## ✅ Confirmation du Succès

Votre application est **100% fonctionnelle** si :

1. ✅ `/api/campaigns/current` retourne JSON (pas d'erreur 500)
2. ✅ Les logs Render montrent "Connected to PostgreSQL database"
3. ✅ Vous pouvez vous connecter sur https://kolo-app-gamma.vercel.app
4. ✅ Le dashboard admin s'affiche après connexion

---

## 📞 Prochaines Étapes

Une fois que tous les tests passent :

1. **Créer une campagne de test** via le dashboard admin
2. **Tester l'achat de tickets** (en mode test)
3. **Vérifier les statistiques** sur le dashboard
4. **Configurer Africa's Talking** pour les paiements réels

🎉 **Félicitations !** Votre application KOLO est déployée en production !
