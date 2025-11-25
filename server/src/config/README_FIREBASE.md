# 🔥 Firebase Admin Key

**⚠️ IMPORTANT: Ce fichier doit être placé ici avec vos vraies credentials**

## 📥 Comment obtenir la clé

1. Aller dans [Firebase Console](https://console.firebase.google.com/)
2. Sélectionner votre projet KOLO
3. Aller dans **Paramètres du projet** (⚙️)
4. Onglet **Comptes de service**
5. Cliquer sur **"Générer une nouvelle clé privée"**
6. Télécharger le fichier JSON
7. Renommer en `firebase-admin-key.json`
8. Placer dans ce répertoire (`server/src/config/`)

## 🔒 Sécurité

- **NE JAMAIS** commiter ce fichier dans Git
- Le fichier est déjà dans `.gitignore`
- En production, utiliser les secrets/variables d'environnement de votre plateforme (Railway, Heroku, etc.)

## ✅ Vérification

Le fichier doit ressembler à `firebase-admin-key.example.json` mais avec vos vraies credentials.

Si le fichier n'existe pas, le serveur démarrera mais les notifications push Firebase seront désactivées.
