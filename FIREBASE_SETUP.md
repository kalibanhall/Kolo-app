# 🔔 Configuration Firebase pour les Notifications Push

## 📋 Prérequis

1. Compte Firebase (gratuit)
2. Projet Firebase créé
3. Application web enregistrée dans Firebase

---

## 🚀 Étape 1 : Créer un Projet Firebase

1. Aller sur https://console.firebase.google.com/
2. Cliquer sur **"Ajouter un projet"**
3. Nom du projet : `KOLO` ou `kolo-app`
4. Activer Google Analytics (optionnel)
5. Créer le projet

---

## 📱 Étape 2 : Ajouter une Application Web

1. Dans votre projet Firebase, cliquer sur l'icône **Web** (`</>`)
2. Nom de l'app : `KOLO Web`
3. Cocher **"Configurer Firebase Hosting"** (optionnel)
4. Cliquer sur **"Enregistrer l'application"**

Vous obtiendrez un objet de configuration comme ceci :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "kolo-app.firebaseapp.com",
  projectId: "kolo-app",
  storageBucket: "kolo-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
  measurementId: "G-XXXXXXXXXX"
};
```

---

## 🔑 Étape 3 : Activer Cloud Messaging

1. Dans Firebase Console, aller dans **"Build"** → **"Cloud Messaging"**
2. Cliquer sur **"Commencer"**
3. Générer une **clé VAPID** :
   - Aller dans **"Paramètres du projet"** (⚙️)
   - Onglet **"Cloud Messaging"**
   - Section **"Web Push certificates"**
   - Cliquer sur **"Generate key pair"**
   - Copier la clé VAPID générée

---

## 🔧 Étape 4 : Configuration dans KOLO

### 4.1 Variables d'Environnement Frontend

Créer/Modifier `client/.env` :

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=kolo-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kolo-app
VITE_FIREBASE_STORAGE_BUCKET=kolo-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_FIREBASE_VAPID_KEY=BHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4.2 Mettre à Jour firebase-messaging-sw.js

Modifier `client/public/firebase-messaging-sw.js` avec vos credentials :

```javascript
firebase.initializeApp({
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "kolo-app.firebaseapp.com",
  projectId: "kolo-app",
  storageBucket: "kolo-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
});
```

---

## 📦 Étape 5 : Installation des Dépendances

```bash
cd client
npm install firebase
```

---

## 🎯 Étape 6 : Intégration dans l'Application

### 6.1 Demander la Permission

Dans votre composant principal (ex: `App.jsx` ou `UserDashboard.jsx`) :

```javascript
import { requestNotificationPermission, onMessageListener } from './config/firebase';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Demander la permission au chargement
    requestNotificationPermission();

    // Écouter les messages en foreground
    onMessageListener()
      .then((payload) => {
        console.log('Notification reçue:', payload);
        // Afficher une notification personnalisée
        showToast(payload.notification.title, payload.notification.body);
      })
      .catch((err) => console.log('Error:', err));
  }, []);

  return <div>...</div>;
}
```

### 6.2 Route Backend pour Sauvegarder le Token

Créer `server/src/routes/users.js` :

```javascript
// Save FCM token
router.post('/fcm-token', verifyToken, async (req, res) => {
  try {
    const { fcm_token } = req.body;
    const userId = req.user.id;

    await query(
      'UPDATE users SET fcm_token = $1 WHERE id = $2',
      [fcm_token, userId]
    );

    res.json({ success: true, message: 'FCM token saved' });
  } catch (error) {
    console.error('Save FCM token error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
```

Ajouter la colonne dans la DB :

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
```

---

## 📤 Étape 7 : Envoyer des Notifications depuis le Backend

### 7.1 Installer Firebase Admin SDK

```bash
cd server
npm install firebase-admin
```

### 7.2 Télécharger la Clé Privée

1. Firebase Console → **Paramètres du projet** → **Comptes de service**
2. Cliquer sur **"Générer une nouvelle clé privée"**
3. Télécharger le fichier JSON
4. Placer dans `server/src/config/firebase-admin-key.json`
5. **IMPORTANT:** Ajouter à `.gitignore` !

### 7.3 Créer le Service de Notifications

Créer `server/src/services/firebaseNotifications.js` :

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('../config/firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Send notification to user
async function sendNotification(fcmToken, notification, data = {}) {
  const message = {
    notification: {
      title: notification.title,
      body: notification.body,
      icon: '/logo-kolo-192.png'
    },
    data: data,
    token: fcmToken
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    throw error;
  }
}

// Send to multiple users
async function sendBulkNotification(fcmTokens, notification, data = {}) {
  const message = {
    notification: {
      title: notification.title,
      body: notification.body,
      icon: '/logo-kolo-192.png'
    },
    data: data,
    tokens: fcmTokens // Array of tokens
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ ${response.successCount} notifications sent`);
    console.log(`❌ ${response.failureCount} notifications failed`);
    return response;
  } catch (error) {
    console.error('❌ Error sending bulk notifications:', error);
    throw error;
  }
}

module.exports = {
  sendNotification,
  sendBulkNotification
};
```

### 7.4 Utiliser dans les Routes

Exemple dans `payments.js` après confirmation de paiement :

```javascript
const { sendNotification } = require('../services/firebaseNotifications');

// After payment confirmed
if (user.fcm_token) {
  await sendNotification(
    user.fcm_token,
    {
      title: '🎉 Achat confirmé !',
      body: `Vos ${ticketCount} ticket(s) ont été générés avec succès`
    },
    {
      type: 'purchase_confirmation',
      ticket_count: ticketCount.toString(),
      url: '/dashboard'
    }
  );
}
```

---

## 🧪 Étape 8 : Tester les Notifications

### Test 1 : Permission

1. Ouvrir http://localhost:3000
2. Autoriser les notifications dans le navigateur
3. Vérifier dans la console : `✅ FCM Token: ...`

### Test 2 : Notification de Test

Dans Firebase Console → **Cloud Messaging** → **"Envoyer votre premier message"** :

1. Titre : `Test KOLO`
2. Texte : `Ceci est une notification de test`
3. Cible : **"Appareil unique"**
4. Token FCM : Coller le token de la console
5. Envoyer

### Test 3 : Notification depuis Backend

Créer une route de test :

```javascript
router.post('/test-notification', verifyToken, async (req, res) => {
  try {
    const user = await query('SELECT fcm_token FROM users WHERE id = $1', [req.user.id]);
    
    if (!user.rows[0].fcm_token) {
      return res.status(400).json({ error: 'No FCM token found' });
    }

    await sendNotification(
      user.rows[0].fcm_token,
      {
        title: '🔔 Test Notification',
        body: 'Ceci est une notification de test depuis le backend'
      },
      {
        type: 'test',
        url: '/dashboard'
      }
    );

    res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📝 Checklist de Déploiement

### Variables d'Environnement

- [ ] `VITE_FIREBASE_API_KEY` configurée
- [ ] `VITE_FIREBASE_VAPID_KEY` configurée
- [ ] Toutes les variables Firebase ajoutées à Vercel/Railway

### Fichiers

- [ ] `firebase-messaging-sw.js` avec credentials de production
- [ ] `firebase-admin-key.json` dans `.gitignore`
- [ ] Clé privée Firebase Admin uploadée sur serveur (Railway secrets)

### Base de Données

- [ ] Colonne `fcm_token` ajoutée à la table `users`
- [ ] Index créé sur `fcm_token` (performance)

### Tests

- [ ] Permission de notification accordée
- [ ] Token FCM sauvegardé en DB
- [ ] Notification de test reçue
- [ ] Notification background fonctionne
- [ ] Clic sur notification redirige correctement

---

## 🔒 Sécurité

### ⚠️ IMPORTANT

1. **Ne JAMAIS commiter `firebase-admin-key.json`**
2. Utiliser les variables d'environnement en production
3. Restreindre les clés Firebase aux domaines autorisés
4. Activer Firebase App Check (protection DDoS)

### Configuration Firebase Console

1. **Domaines autorisés** :
   - Ajouter `kolo.cd` et `*.vercel.app`
   - Paramètres → Domaines autorisés

2. **Restrictions API** :
   - Google Cloud Console → API Manager
   - Restreindre la clé API aux domaines

---

## 📊 Monitoring

### Firebase Console

- **Cloud Messaging** → Statistiques des envois
- **Analytics** → Événements de notifications
- **Crashlytics** → Erreurs liées aux notifications

### Logs Backend

```javascript
// Logger les notifications envoyées
await query(
  `INSERT INTO notification_logs (user_id, type, title, sent_at, success)
   VALUES ($1, $2, $3, NOW(), $4)`,
  [userId, 'push', notification.title, true]
);
```

---

## 🆘 Dépannage

### Problème : Permission refusée

**Solution :** L'utilisateur doit manuellement réautoriser dans les paramètres du navigateur.

### Problème : Token non sauvegardé

**Solution :** Vérifier que le service worker est enregistré : `navigator.serviceWorker.ready`

### Problème : Notifications non reçues

**Vérifications :**
1. Token FCM valide en DB
2. Service Worker actif
3. HTTPS en production (requis pour notifications)
4. Autorisation accordée dans le navigateur

### Problème : Erreur "messaging/invalid-vapid-key"

**Solution :** Vérifier que la clé VAPID est correcte dans `.env`

---

## 📚 Ressources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)
- [Service Workers](https://developers.google.com/web/fundamentals/primers/service-workers)

---

**Projet KOLO** - Configuration Firebase  
*Date: 24 novembre 2025*
