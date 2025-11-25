# 🔔 Intégration Firebase - Résumé

## ✅ Fichiers Créés

### Frontend
- `client/src/config/firebase.js` - Configuration Firebase + fonctions d'initialisation
- `client/public/firebase-messaging-sw.js` - Service Worker pour les notifications push
- `client/.env.example` - Ajout des variables Firebase

### Backend
- `server/src/services/firebaseNotifications.js` - Service d'envoi de notifications
- `server/src/config/firebase-admin-key.example.json` - Template pour la clé privée
- `server/src/config/README_FIREBASE.md` - Instructions pour la clé privée
- `server/database/migrations/add_fcm_token.sql` - Migration DB pour tokens FCM

### Documentation
- `FIREBASE_SETUP.md` - Guide complet de configuration (8 étapes détaillées)

### Routes Ajoutées
- `POST /api/users/fcm-token` - Sauvegarder le token FCM de l'utilisateur
- `DELETE /api/users/fcm-token` - Supprimer le token FCM (logout)

---

## 🚀 Notifications Automatiques Intégrées

### 1. Achat de Tickets (`payments.js`)
Quand un utilisateur achète des tickets :
```javascript
notifyTicketPurchase(userId, ticketCount, campaignName)
```
**Message:** "🎉 Vos X ticket(s) ont été générés avec succès"

### 2. Tirage au Sort (`admin.js`)
Quand un admin effectue le tirage :

**a) Notification au gagnant principal :**
```javascript
notifyWinner(userId, campaignName, prizeAmount)
```
**Message:** "🏆 Félicitations, vous avez gagné X CDF !"

**b) Notification à tous les participants :**
```javascript
notifyLotteryDrawn(campaignId, campaignName, winnerCount)
```
**Message:** "🎊 Les X gagnant(s) ont été tirés au sort"

---

## 📦 Dépendances à Installer

### Frontend
```bash
cd client
npm install firebase
```

### Backend
```bash
cd server
npm install firebase-admin
```

---

## ⚙️ Configuration Requise

### 1️⃣ Créer un Projet Firebase
1. https://console.firebase.google.com/
2. "Ajouter un projet" → `KOLO`
3. Activer Google Analytics (optionnel)

### 2️⃣ Ajouter une Application Web
1. Icône Web (`</>`)
2. Nom : `KOLO Web`
3. Copier `firebaseConfig`

### 3️⃣ Activer Cloud Messaging
1. Build → Cloud Messaging
2. Paramètres → Cloud Messaging tab
3. Générer une **clé VAPID**

### 4️⃣ Variables d'Environnement Frontend
Créer `client/.env` avec :
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

### 5️⃣ Clé Privée Backend
1. Firebase Console → Paramètres → Comptes de service
2. "Générer une nouvelle clé privée"
3. Télécharger JSON
4. Renommer en `firebase-admin-key.json`
5. Placer dans `server/src/config/`

### 6️⃣ Migration Base de Données
```bash
psql -U your_user -d kolo_db -f server/database/migrations/add_fcm_token.sql
```

---

## 🧪 Test des Notifications

### Test 1 : Permission
1. Ouvrir http://localhost:3000
2. Autoriser les notifications
3. Console : `✅ FCM Token: ...`

### Test 2 : Achat de Ticket
1. Acheter un ticket
2. Vérifier la notification push

### Test 3 : Tirage au Sort
1. Admin effectue un tirage
2. Gagnant reçoit notification immédiate
3. Tous les participants reçoivent notification

### Test 4 : Console Firebase
1. Firebase Console → Cloud Messaging
2. "Envoyer votre premier message"
3. Copier le token de la console
4. Envoyer

---

## 🔒 Sécurité

### ⚠️ CRITIQUE
1. **JAMAIS** commiter `firebase-admin-key.json`
2. Fichier ajouté à `.gitignore`
3. En production, utiliser les secrets de la plateforme

### Configuration Production
**Railway/Heroku:**
- Uploader `firebase-admin-key.json` comme secret file
- Ou convertir en variable d'environnement JSON encodée

**Vercel:**
- Utiliser Vercel Secrets
- Encoder le JSON en base64

---

## 📊 Monitoring

### Firebase Console
- **Cloud Messaging** → Statistiques
- Voir les envois réussis/échoués
- Taux de livraison

### Backend Logs
```javascript
✅ Push notification sent: <message_id>
❌ Error sending push notification: <error>
⚠️  Invalid FCM token (automatically cleaned)
```

---

## 🆘 Dépannage

### Problème : "Firebase not initialized"
**Solution :** Vérifier que `firebase-admin-key.json` existe dans `server/src/config/`

### Problème : Notifications non reçues
**Vérifier :**
1. Token FCM sauvegardé en DB (`SELECT fcm_token FROM users WHERE id = X`)
2. Service Worker actif (DevTools → Application → Service Workers)
3. Permission accordée (DevTools → Application → Permissions)
4. HTTPS en production (obligatoire)

### Problème : "messaging/invalid-vapid-key"
**Solution :** Vérifier `VITE_FIREBASE_VAPID_KEY` dans `.env`

---

## 📚 Documentation Complète

Pour le guide détaillé étape par étape, voir : **`FIREBASE_SETUP.md`**

---

## 🎯 Fonctionnalités Supplémentaires

Le service `firebaseNotifications.js` inclut aussi :

### Notification Fin de Campagne
```javascript
notifyCampaignEnding(campaignId, campaignName, hoursRemaining)
```
**Usage :** Cron job pour rappeler fin de tombola

### Notification Personnalisée
```javascript
sendNotification(fcmToken, { title, body }, { url, type })
```
**Usage :** Événements custom

### Notification Bulk
```javascript
sendBulkNotification(tokens[], notification, data)
```
**Usage :** Annoncer nouvelle campagne à tous

---

**Statut:** ✅ Intégration complète  
**Tests manuels requis:** Firebase credentials + npm install  
**Production ready:** Oui (avec credentials configurés)

---

*Configuration Firebase pour KOLO - Novembre 2024*
