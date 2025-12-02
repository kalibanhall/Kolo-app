# Configuration de SendGrid et Supabase

## 📧 SendGrid (Service d'envoi d'emails)

### 1. Créer un compte SendGrid
1. Aller sur https://sendgrid.com/
2. S'inscrire (plan gratuit: 100 emails/jour)
3. Vérifier votre email

### 2. Créer une clé API
1. Aller dans **Settings** > **API Keys**
2. Cliquer sur **Create API Key**
3. Nom: `KOLO Password Reset`
4. Permissions: **Full Access** (ou au minimum **Mail Send**)
5. Copier la clé générée (commence par `SG.`)

### 3. Vérifier l'expéditeur
1. Aller dans **Settings** > **Sender Authentication**
2. Choisir **Single Sender Verification**
3. Remplir le formulaire avec votre email
4. Vérifier l'email reçu

### 4. Configuration dans .env
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=votre@email.com
FROM_NAME=KOLO Tombola
```

---

## 🔐 Supabase (Base de données PostgreSQL + Storage)

### Option 1: Utiliser PostgreSQL local
Si vous avez déjà un PostgreSQL local, vous pouvez ignorer Supabase.
Les tokens seront stockés dans votre base locale.

### Option 2: Utiliser Supabase (recommandé)
1. Aller sur https://supabase.com/
2. S'inscrire (plan gratuit disponible)
3. Créer un nouveau projet
4. Attendre 2-3 minutes que le projet soit créé

### Configuration Supabase

#### 1. Récupérer les credentials
Dans votre projet Supabase:
1. Aller dans **Settings** > **API**
2. Copier:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`

#### 2. Créer la table dans Supabase
1. Aller dans **SQL Editor**
2. Cliquer sur **New Query**
3. Coller ce SQL:

```sql
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX idx_token ON password_reset_tokens(token);
CREATE INDEX idx_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_expires_at ON password_reset_tokens(expires_at);

-- Commentaires
COMMENT ON TABLE password_reset_tokens IS 'Stocke les tokens de réinitialisation de mot de passe';
```

4. Cliquer sur **Run**

#### 3. Configuration dans .env
```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx...
```

---

## ⚙️ Configuration finale dans server/.env

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=votre@email.com
FROM_NAME=KOLO Tombola

# Supabase Configuration (optionnel)
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx...

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

---

## 🧪 Test rapide

1. **Démarrer le serveur**:
   ```bash
   cd server
   npm run dev
   ```

2. **Tester l'endpoint**:
   ```bash
   curl -X POST http://localhost:5000/api/password-reset/request \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

3. **Vérifier**:
   - Console du serveur: message "✅ Email de réinitialisation envoyé"
   - Boîte email: email reçu avec lien de réinitialisation
   - Supabase: token créé dans la table `password_reset_tokens`

---

## 📝 Notes importantes

### SendGrid
- **Plan gratuit**: 100 emails/jour
- **Délai**: Les premiers emails peuvent prendre 5-10 minutes
- **Spam**: Vérifier le dossier spam
- **Production**: Configurer un domaine custom pour meilleure délivrabilité

### Supabase
- **Facultatif**: Le système fonctionne aussi avec PostgreSQL local
- **Avantage**: Backup automatique, dashboard, API REST
- **Plan gratuit**: 500 MB de données, 50 MB de stockage

### Sécurité
- ✅ Tokens hashés avec SHA-256
- ✅ Expiration 1 heure
- ✅ Usage unique (marqué comme utilisé)
- ✅ Nettoyage automatique des tokens expirés
- ✅ Rate limiting sur les routes auth

---

## 🔧 Dépannage

### Erreur "SENDGRID_API_KEY non configurée"
➡️ Vérifier que la clé est dans `.env` et commence par `SG.`

### Email non reçu
➡️ Vérifier:
1. Dossier spam
2. Email expéditeur vérifié dans SendGrid
3. Console du serveur pour erreurs
4. Quota SendGrid (100/jour)

### Erreur "Supabase non configuré"
➡️ Normal si vous n'utilisez pas Supabase
➡️ Les tokens seront stockés dans PostgreSQL local

### Token invalide ou expiré
➡️ Les tokens expirent après 1 heure
➡️ Demander un nouveau lien de réinitialisation
