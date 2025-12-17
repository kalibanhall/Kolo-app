# ÉTAPES POUR OBTENIR LES CLÉS MANQUANTES

## 1️⃣ SENDGRID API KEY
---

1. Aller à: https://app.sendgrid.com/login
2. Se connecter avec tes identifiants
3. Cliquer sur "Settings" (en bas à gauche)
4. Cliquer sur "API Keys"
5. Cliquer sur "Create API Key"
6. Donner un nom: "KOLO Production"
7. Sélectionner "Full Access" (ou personnalisé avec Mail Send)
8. Cliquer "Create & View"
9. **COPIER LA CLÉ** (commence par SG.)
10. Remplacer dans RENDER_VARIABLES.txt:
    SENDGRID_API_KEY=SG.xxx...

---

## 2️⃣ AFRICA'S TALKING CREDENTIALS
---

1. Aller à: https://africastalking.com/
2. Cliquer "Log in" (en haut)
3. Se connecter avec ton compte
4. Aller à: https://africastalking.com/sms/login
5. Dans le menu à gauche, cliquer sur "Settings"
6. Chercher "API Key" ou "API Keys"
7. Tu vas voir:
   - **API Username** → copier pour AT_USERNAME
   - **API Key** → copier pour AT_API_KEY
8. Remplacer dans RENDER_VARIABLES.txt:
   AT_USERNAME=xxx
   AT_API_KEY=xxx

---

## 3️⃣ CLOUDINARY CREDENTIALS
---

1. Aller à: https://cloudinary.com/console
2. Se connecter (ou créer compte si besoin)
3. Tu vas voir le dashboard avec 3 infos:
   - **Cloud Name** → copier
   - **API Key** → copier
   - **API Secret** → copier

4. Remplacer dans RENDER_VARIABLES.txt:
   CLOUDINARY_CLOUD_NAME=xxx
   CLOUDINARY_API_KEY=xxx
   CLOUDINARY_API_SECRET=xxx

---

## 4️⃣ FIREBASE PRIVATE KEY
---

1. Aller à: https://console.firebase.google.com
2. Sélectionner le projet "kolo-e4711"
3. Cliquer sur l'icône "⚙️ Settings" (engrenage en haut)
4. Cliquer sur "Project settings"
5. Aller à l'onglet "Service Accounts"
6. Cliquer sur "Generate New Private Key"
7. Un fichier JSON va se télécharger
8. Ouvrir le fichier avec un éditeur de texte
9. Chercher la section "private_key" 
10. **COPIER TOUT LE CONTENU** (incluant les sauts de ligne)
    - Commence par: -----BEGIN PRIVATE KEY-----
    - Finit par: -----END PRIVATE KEY-----
11. Remplacer dans RENDER_VARIABLES.txt:
    FIREBASE_PRIVATE_KEY=[LA_CLÉ_COMPLÈTE_AVEC_SAUTS_DE_LIGNE]

---

## APRÈS AVOIR COPIÉ TOUTES LES CLÉS:

1. Ouvrir RENDER_VARIABLES.txt
2. Remplacer les 6 variables manquantes
3. Vérifier qu'il n'y a plus de [VOTRE_...]
4. Copier-coller TOUT dans Render Dashboard

---

## RÉSUMÉ DES 6 VARIABLES À REMPLIR:

✅ SUPABASE_ANON_KEY → Déjà fait
✅ SUPABASE_SERVICE_ROLE_KEY → Déjà fait
⏳ SENDGRID_API_KEY
⏳ AT_USERNAME
⏳ AT_API_KEY
⏳ CLOUDINARY_CLOUD_NAME
⏳ CLOUDINARY_API_KEY
⏳ CLOUDINARY_API_SECRET
⏳ FIREBASE_PRIVATE_KEY

---

Commence par SendGrid! C'est le plus simple. 👍
