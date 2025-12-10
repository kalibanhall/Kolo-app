# 🚀 Configuration Firebase pour Production (Vercel & Render)

## 🔐 Variables d'Environnement Firebase

Vous devez configurer ces variables dans vos services de production :

```
VITE_FIREBASE_API_KEY=AIzaSyCAiYvJFyps22vtwxjbD8GxTQ87dS6Vvw0
VITE_FIREBASE_AUTH_DOMAIN=kolo-e4711.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kolo-e4711
VITE_FIREBASE_STORAGE_BUCKET=kolo-e4711.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=556561408264
VITE_FIREBASE_APP_ID=1:556561408264:web:f061f8eeaa21a13efa0cbd
VITE_FIREBASE_MEASUREMENT_ID=G-30CWWRKY2C
VITE_FIREBASE_VAPID_KEY=BMu_W8HLI86t-qkRWUu9Vcq9OMTtO6qu1rx7fN0FQdD1215eB3jokrvFT99KN-7XQQ4PoJ7vQBflF0BNOkutYRM
```

---

## 📱 VERCEL (Frontend React)

### Étape 1: Aller sur Vercel Dashboard
1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet **Kolo-app**

### Étape 2: Ajouter les Variables d'Environnement
1. Cliquez sur **Settings** (en haut)
2. Allez à **Environment Variables**
3. Cliquez **Add New** pour chaque variable :

| Key | Value |
|-----|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyCAiYvJFyps22vtwxjbD8GxTQ87dS6Vvw0` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `kolo-e4711.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `kolo-e4711` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `kolo-e4711.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `556561408264` |
| `VITE_FIREBASE_APP_ID` | `1:556561408264:web:f061f8eeaa21a13efa0cbd` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-30CWWRKY2C` |
| `VITE_FIREBASE_VAPID_KEY` | `BMu_W8HLI86t-qkRWUu9Vcq9OMTtO6qu1rx7fN0FQdD1215eB3jokrvFT99KN-7XQQ4PoJ7vQBflF0BNOkutYRM` |

### Étape 3: Redéployer
1. Allez à **Deployments**
2. Cliquez les **...** (trois points) à côté du dernier déploiement
3. Cliquez **Redeploy**

---

## 🖥️ RENDER (Backend Node.js)

### Étape 1: Aller sur Render Dashboard
1. Allez sur https://dashboard.render.com
2. Sélectionnez votre service **kolo-backend**

### Étape 2: Ajouter les Variables d'Environnement
1. Cliquez sur **Environment**
2. Cliquez **Add Environment Variable** pour chaque variable
3. Remplissez avec les mêmes valeurs que ci-dessus

### Étape 3: Sauvegarder et Redéployer
1. Cliquez **Save**
2. Le service se redéploiera automatiquement

---

## ✅ Vérification

Après configuration, vérifiez que :

1. **Frontend** (Vercel) :
   - Allez sur votre site
   - Ouvrez **Console (F12)**
   - Vous devriez voir ✅ `Firebase Auth initialized` (pas d'erreur)
   - Google Sign-In devrait fonctionner

2. **Backend** (Render) :
   - Allez sur logs (Render Dashboard > Service > Logs)
   - Vérifiez qu'il n'y a pas d'erreurs Firebase

---

## 🛠️ Fichiers Modifiés

- ✅ `client/.env` - Variables locales (déjà à jour)
- ✅ `render.yaml` - Configuration pour Render (à déployer)

Pour Vercel, utilisez le **Vercel Dashboard** (pas de fichier config pour les env vars)

---

## 🚨 Dépannage

**Erreur: `auth/configuration-not-found`**
- Vérifiez que TOUTES les variables sont configurées
- Vérifiez les valeurs exactes (pas d'espaces supplémentaires)
- Redéployez après les changements

**Google Sign-In ne fonctionne pas**
- Dans Firebase Console > Authentication > Settings
- Vérifiez que votre domaine Vercel est dans "Authorized JavaScript origins"
- Exemple: `https://votre-app.vercel.app`

**Push Notifications ne marchent pas**
- Vérifiez le VAPID_KEY
- Vérifiez que le Service Worker est activé
- Vérifiez que le navigateur accepte les notifications
