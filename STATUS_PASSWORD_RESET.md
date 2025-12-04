# Guide de Configuration SendGrid & Supabase - KOLO

## ✅ État actuel (ce qui est fait)

### Backend ✅
- [x] SendGrid configuré avec API Key: `SG.3Butb3rbRzmBjq2lIw5ipQ...`
- [x] Supabase initialisé et connecté
- [x] Firebase Admin SDK opérationnel
- [x] Routes `/api/password-reset` créées et fonctionnelles
- [x] Services email (sendgridService.js) prêts
- [x] Serveur tourne sur port 5000 ✅

### Frontend ✅
- [x] Pages `ForgotPasswordPage` et `ResetPasswordPage` créées
- [x] Routes intégrées dans App.jsx
- [x] Page de test HTML créée: `test-password-reset.html`

### Configuration ✅
- [x] `.env` configuré avec SendGrid API Key
- [x] Logger fonctions ajoutées (info, warn, error)
- [x] Dépendances installées: firebase-admin, bcrypt, @sendgrid/mail, @supabase/supabase-js

---

## ⚠️ CE QU'IL RESTE À FAIRE

### 1. Vérifier l'email expéditeur dans SendGrid ⚠️

**CRITIQUE**: SendGrid bloque l'envoi si l'email n'est pas vérifié!

**Étapes:**
1. Aller sur https://app.sendgrid.com/settings/sender_auth
2. Cliquer sur **"Verify a Single Sender"**
3. Remplir le formulaire:
   - **From Email**: `test@example.com` (l'email dans votre .env)
   - **From Name**: `KOLO Tombola`
   - **Reply To**: Même email
   - **Company Address**: Votre adresse
4. **Soumettre** → Vous recevrez un email
5. **Cliquer sur le lien** de vérification dans l'email
6. ✅ L'email est maintenant vérifié!

**OU utiliser votre propre email:**
Si `test@example.com` n'est pas votre email, changez dans `.env`:
```env
FROM_EMAIL=votre-vrai-email@gmail.com
```
Puis vérifiez CET email dans SendGrid.

---

### 2. Créer la table `password_reset_tokens` dans Supabase 📊

**Option A: Via l'interface Supabase (RECOMMANDÉ)**

1. Aller sur https://supabase.com/dashboard/project/wzthlhxtdtkqdnofzyrh
2. Dans le menu gauche: **SQL Editor**
3. Cliquer sur **"New Query"**
4. Coller ce SQL:

```sql
-- Créer la table pour les tokens de réinitialisation
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ajouter les index pour la performance
CREATE INDEX IF NOT EXISTS idx_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_expires_at ON password_reset_tokens(expires_at);

-- Ajouter des commentaires
COMMENT ON TABLE password_reset_tokens IS 'Tokens de réinitialisation de mot de passe';
COMMENT ON COLUMN password_reset_tokens.token IS 'Token unique hashé (SHA-256)';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Date d''expiration (1 heure après création)';
COMMENT ON COLUMN password_reset_tokens.used IS 'Indique si le token a déjà été utilisé';
```

5. Cliquer sur **"Run"** (ou F5)
6. Vous devriez voir: ✅ **"Success. No rows returned"**

**Vérification:**
- Aller dans **"Table Editor"**
- Vous devriez voir la table `password_reset_tokens` dans la liste

**Option B: Via le script Node.js (si erreur Supabase)**

Si vous avez des erreurs de connexion Supabase, la table sera automatiquement créée dans votre PostgreSQL local au premier usage.

---

### 3. Configurer Supabase ANON Key (optionnel) 🔑

Si vous voulez utiliser Supabase pour stocker les tokens (sinon PostgreSQL local):

1. Aller sur https://supabase.com/dashboard/project/wzthlhxtdtkqdnofzyrh/settings/api
2. Copier la clé **"anon public"** (section Project API keys)
3. Dans `server/.env`, remplacer:
```env
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```
Par:
```env
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBh...
```

**Note**: Si vous ne configurez pas Supabase, ce n'est pas grave! Le système utilisera PostgreSQL local automatiquement.

---

## 🧪 TESTER LE SYSTÈME

### Méthode 1: Via la page de test HTML ✅ (PLUS SIMPLE)

1. **Ouvrir**: `c:\kolo\test-password-reset.html` (déjà ouvert dans votre navigateur)

2. **Créer un utilisateur de test** (si pas déjà fait):
   - Aller sur http://localhost:3000/register
   - Créer un compte avec un email réel que vous contrôlez

3. **Dans la page de test**:
   - Entrer l'email du compte créé
   - Cliquer sur "Demander une réinitialisation"
   - Attendre 10-30 secondes
   - **Vérifier votre boîte email** (et spam!)
   - Copier le token depuis le lien (ex: `?token=abc123...`)
   - Coller dans le champ "Token"
   - Entrer un nouveau mot de passe
   - Cliquer "Réinitialiser"

### Méthode 2: Via l'application React

1. **Démarrer les serveurs** (déjà fait):
   ```bash
   # Backend: http://localhost:5000 ✅
   # Frontend: http://localhost:3000
   ```

2. **Aller sur**: http://localhost:3000/forgot-password

3. **Entrer votre email** et cliquer "Envoyer"

4. **Vérifier votre email** (peut prendre 1-2 minutes la première fois)

5. **Cliquer sur le lien** dans l'email → Vous serez redirigé vers `/reset-password?token=...`

6. **Entrer nouveau mot de passe** et soumettre

7. **Se connecter** avec le nouveau mot de passe

---

## 🐛 DÉPANNAGE

### Email non reçu?

1. **Vérifier les spams** 📧
2. **Vérifier que l'email expéditeur est vérifié** dans SendGrid
3. **Vérifier la console du serveur**:
   ```
   ✅ Email de réinitialisation envoyé à xxx@xxx.com
   ```
4. **Vérifier le quota SendGrid**: 100 emails/jour (plan gratuit)

### Erreur "Tenant or user not found"?

➡️ **Normal!** Le système utilisera PostgreSQL local au lieu de Supabase.
Pas besoin de configurer SUPABASE_ANON_KEY si vous ne voulez pas utiliser Supabase.

### Erreur "Token invalide ou expiré"?

➡️ Les tokens expirent après **1 heure**. Demandez un nouveau lien.

### Serveur ne démarre pas?

Vérifier que toutes les dépendances sont installées:
```bash
cd server
npm install
```

---

## 📊 PROCHAINES ÉTAPES

Une fois le système de récupération de mot de passe testé et fonctionnel, on peut continuer avec:

1. **💳 Orange Money** - Paiements réels via API Orange Money Cameroun
2. **📊 Dashboard avec graphiques** - Chart.js pour les statistiques admin
3. **🤝 Système de parrainage** - Code de parrainage + récompenses
4. **⭐ Programme de fidélité** - Points, niveaux, badges
5. **🌙 Mode sombre** - Toggle light/dark theme
6. **🎮 Gamification** - Leaderboard, achievements

---

## ✅ CHECKLIST FINALE

Avant de passer aux autres features, vérifiez:

- [ ] SendGrid: Email expéditeur vérifié ⚠️ **CRITIQUE**
- [ ] Supabase: Table `password_reset_tokens` créée (ou skip si PostgreSQL local)
- [ ] Test: Email reçu et lien fonctionne
- [ ] Test: Réinitialisation du mot de passe réussie
- [ ] Test: Connexion avec nouveau mot de passe OK

**Status actuel**: Backend ✅ | Frontend ✅ | SendGrid API ✅ | Test créé ✅

**Ce qu'il manque**: Vérifier l'email dans SendGrid + Créer la table Supabase

---

**Besoin d'aide?** Dites-moi:
- "Email vérifié" → Je vous aide à créer la table
- "Table créée" → On teste ensemble
- "Ça marche!" → On passe aux autres features 🚀
- "Problème..." → Je vous aide à débugger
