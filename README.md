# 🎲 KOLO - Plateforme de Tombola Moderne

Application web complète de tombola avec gestion des rôles (Admin/Client), paiement Mobile Money, et dashboard administrateur professionnel.

## 🎯 Points forts

- ✅ **Architecture modulaire** - Backend et Frontend séparés
- ✅ **Zéro mock** - Toutes les données viennent de PostgreSQL/Supabase
- ✅ **Gestion des rôles** - Admin et Client avec permissions distinctes
- ✅ **Dashboard admin professionnel** - 6 cartes de stats, sidebar navigation
- ✅ **Authentification JWT** - Sécurisée avec bcrypt
- ✅ **Paiement Mobile Money** - Integration Africa's Talking (M-Pesa, Orange, Airtel)
- ✅ **Webhook sécurisé** - Tickets générés UNIQUEMENT après confirmation de paiement
- ✅ **Audit trail complet** - Logs de toutes les actions admin

## ✨ Fonctionnalités

### 👤 Client (Utilisateur normal)
- 📝 **Inscription & Connexion** - JWT avec validation
- 🎫 **Achat de tickets** - 1-10 tickets par transaction
- 💳 **Paiement Mobile Money** - M-Pesa, Orange Money, Airtel Money
- 📊 **Dashboard personnel** - Mes tickets, statistiques
- 🏆 **Visualisation** - Voir si mes tickets ont gagné

### 👨‍💼 Admin (Administrateur)
- 📊 **Dashboard complet** - 6 cartes de statistiques temps réel
  - Tickets vendus (X / total)
  - Participants uniques
  - Recettes totales ($)
  - Tirage effectué ? (✓/✗)
  - Gagnants bonus (X / 3)
  - Taux d'occupation (%)
- 👥 **Gestion participants** - Liste paginée, tri, filtres
- 🎯 **Tirage au sort** - Sélection aléatoire sécurisée
- 🏆 **Résultats** - Affichage gagnant principal + bonus
- ➕ **Gestion campagnes** - Créer, modifier, clôturer
- 🛡️ **Logs d'audit** - Journal complet de toutes les actions

## 🏗️ Architecture Technique

### Frontend (React)
```
client/src/
├── components/          # Composants réutilisables
│   ├── AdminLayout.jsx       # Layout admin avec sidebar
│   ├── StatCard.jsx          # Carte de statistique
│   └── ProtectedRoute.jsx    # Protection des routes
├── context/
│   └── AuthContext.jsx       # Gestion auth, token JWT, rôles
├── pages/               # Pages de l'application
│   ├── HomePage.jsx          # Accueil public
│   ├── LoginPage.jsx         # Connexion
│   ├── RegisterPage.jsx      # Inscription
│   ├── UserDashboard.jsx     # Dashboard client
│   ├── BuyTicketsPage.jsx    # Achat tickets
│   ├── AdminDashboard.jsx    # Dashboard admin (6 cartes)
│   ├── ParticipantsPage.jsx  # Liste participants
│   ├── DrawResultsPage.jsx   # Résultats tirages
│   └── CreateCampaignPage.jsx # Créer campagne
├── services/
│   └── api.js               # Service API centralisé (5 modules)
└── App.jsx                  # Router avec React Router
```

**Stack** :
- React 18 + React Router DOM
- Tailwind CSS
- Service API centralisé avec JWT automatique
- Context API pour l'état global

### Backend (Node.js/Express)
```
server/src/
├── config/
│   └── database.js          # Pool PostgreSQL + helpers
├── database/
│   └── schema.sql           # Schéma complet (10 tables)
├── middleware/
│   └── auth.js              # JWT verification + admin check
├── routes/                  # Routes API (100% SQL, 0% mock)
│   ├── auth.js              # Register, login, verify
│   ├── campaigns.js         # CRUD campagnes
│   ├── tickets.js           # Achat tickets
│   ├── payments.js          # Webhook Africa's Talking
│   ├── admin.js             # Stats, tirage, participants
│   └── users.js             # Profil utilisateur
├── services/
│   └── africasTalking.js    # Integration paiement
├── utils/
│   ├── helpers.js           # Fonctions utilitaires
│   └── logger.js            # Logs admin
└── server.js                # Point d'entrée Express
```

**Stack** :
- Express.js + PostgreSQL (via pg)
- JWT + bcrypt
- Africa's Talking API
- express-validator
- CORS configuré

### Base de Données (PostgreSQL/Supabase)

**10 tables** :
1. **users** - Utilisateurs (email, password_hash, is_admin)
2. **campaigns** - Campagnes de tombola
3. **purchases** - Transactions (pending → completed)
4. **tickets** - Tickets (générés après webhook)
5. **invoices** - Factures PDF
6. **draw_results** - Résultats tirages
7. **bonus_winners** - Gagnants bonus
8. **admin_logs** - Journal d'audit
9. **payment_webhooks** - Logs webhooks
10. **notifications** - Notifications utilisateurs

**Avec** : Triggers, indexes, foreign keys, views

## 🚀 Installation & Démarrage

### Prérequis
- Node.js 18+ 
- PostgreSQL (via Supabase - gratuit)
- Compte Africa's Talking (optionnel pour dev)

### Installation Complète

**1. Cloner le projet**
```powershell
git clone https://github.com/votre-repo/kolo.git
cd kolo
```

**2. Installer les dépendances**
```powershell
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

**3. Configurer Supabase (Base de données)**

Suivre le guide détaillé : `DATABASE_SETUP.md`

```powershell
# Créer compte Supabase (gratuit)
# Créer un projet
# Copier DATABASE_URL

cd server
# Éditer .env et ajouter :
# DATABASE_URL=postgresql://user:pass@host:port/database
```

**4. Créer les tables**
```powershell
cd server
npm run migrate
```

**5. Démarrer les serveurs**

Terminal 1 - Backend :
```powershell
cd server
npm run dev
# ✅ Backend sur http://localhost:5000
```

Terminal 2 - Frontend :
```powershell
cd client
npm run dev
# ✅ Frontend sur http://localhost:3000
```

**6. Tester l'application**

Ouvrir : `http://localhost:3000`

**Comptes de test** :
- Admin : `admin@kolo.com` / `Admin@2025`
- Client : S'inscrire via `/register`

## 📚 Documentation

| Document | Description |
|----------|-------------|
| `DATABASE_SETUP.md` | Guide configuration Supabase |
| `LANCEMENT_FINAL.md` | Guide démarrage rapide |
| `GUIDE_TEST_COMPLET.md` | Tests pas à pas avec checklist |
| `TESTS_API.md` | Tests API avec curl/PowerShell |
| `FRONTEND_GUIDE.md` | Architecture frontend complète |
| `CHANGEMENTS_FRONTEND.md` | Changelog frontend |
| `CHANGEMENTS_EFFECTUES.md` | Changelog backend |
| `RESUME_FINAL.md` | Résumé complet du projet |

## 🎯 Routes de l'application

### Frontend (React Router)

| Route | Accès | Description |
|-------|-------|-------------|
| `/` | Public | Page d'accueil |
| `/login` | Public | Connexion |
| `/register` | Public | Inscription |
| `/dashboard` | 🔐 Client | Dashboard client |
| `/buy` | 🔐 Client | Acheter des tickets |
| `/admin` | 👨‍💼 Admin | Dashboard admin (6 cartes) |
| `/admin/participants` | 👨‍💼 Admin | Liste participants |
| `/admin/draw` | 👨‍💼 Admin | Résultats tirages |
| `/admin/campaigns` | 👨‍💼 Admin | Créer campagne |
| `/admin/logs` | 👨‍💼 Admin | Logs d'audit |

### Backend API

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/auth/register` | POST | - | Inscription |
| `/api/auth/login` | POST | - | Connexion |
| `/api/auth/verify` | GET | 🔐 | Vérifier token |
| `/api/campaigns/current` | GET | - | Campagne active |
| `/api/campaigns` | GET | 👨‍💼 | Toutes campagnes |
| `/api/campaigns` | POST | 👨‍💼 | Créer campagne |
| `/api/campaigns/:id/status` | PATCH | 👨‍💼 | Modifier statut |
| `/api/tickets/purchase` | POST | 🔐 | Acheter tickets |
| `/api/tickets/user/:id` | GET | 🔐 | Mes tickets |
| `/api/tickets/validate/:number` | GET | - | Valider ticket |
| `/api/payments/webhook` | POST | - | Webhook AT (sécurisé) |
| `/api/payments/status/:id` | GET | 🔐 | Statut paiement |
| `/api/admin/stats` | GET | 👨‍💼 | Statistiques |
| `/api/admin/participants` | GET | 👨‍💼 | Liste participants |
| `/api/admin/draw` | POST | 👨‍💼 | Effectuer tirage |
| `/api/admin/draws` | GET | 👨‍💼 | Résultats tirages |
| `/api/admin/logs` | GET | 👨‍💼 | Logs d'audit |

Légende : 🔐 = Authentifié, 👨‍💼 = Admin uniquement

## 🔐 Sécurité

### Backend
- ✅ JWT avec expiration (7 jours)
- ✅ Bcrypt avec 12 rounds de hashing
- ✅ Middleware d'authentification (`verifyToken`)
- ✅ Middleware d'autorisation (`verifyAdmin`)
- ✅ Validation avec `express-validator`
- ✅ Webhook signature verification (Africa's Talking)
- ✅ Transactions SQL atomiques
- ✅ Logs d'audit complets

### Frontend
- ✅ Token JWT dans localStorage
- ✅ Vérification du rôle avant affichage
- ✅ ProtectedRoute pour routes sensibles
- ✅ Déconnexion automatique si token invalide
- ✅ Validation des formulaires côté client

## 🔄 Flux de Paiement

```
1. User clique "Acheter des tickets"
   ↓
2. Frontend appelle POST /api/tickets/purchase
   ↓
3. Backend crée purchase avec status="pending"
   ↓
4. Backend appelle Africa's Talking API
   ↓
5. User reçoit USSD sur téléphone
   ↓
6. User confirme paiement
   ↓
7. Africa's Talking envoie webhook POST /api/payments/webhook
   ↓
8. Backend vérifie signature webhook
   ↓
9. Backend génère les tickets (UNIQUEMENT si paiement OK)
   ↓
10. Backend crée facture et notification
    ↓
11. User voit ses tickets dans /dashboard
```

**Sécurité** : Les tickets ne sont JAMAIS générés avant confirmation de paiement.

## 🎨 Design

# Frontend
cd ..\client
npm install
```

5. **Créer les tables de la base de données**
```powershell
cd ..\server
npm run migrate
```

6. **Démarrer l'application**
```powershell
# Backend (Terminal 1)
cd server
npm run dev

# Frontend (Terminal 2)
cd client
npm run dev
```

7. **Accéder à l'application**
- Frontend : http://localhost:5173
- Backend API : http://localhost:5000/api
- Login admin : `admin@kolo.com` / `Admin@2025`

## 📚 Documentation

- **[DEMARRAGE_RAPIDE.md](./DEMARRAGE_RAPIDE.md)** - Guide de démarrage complet
- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - Configuration de la base de données
- **[CHANGEMENTS_EFFECTUES.md](./CHANGEMENTS_EFFECTUES.md)** - Changelog détaillé

## 📁 Structure du Projet

```
kolo/
├── client/                          # Frontend React
│   ├── public/
│   ├── src/
│   │   ├── App.jsx                 # Application principale
│   │   ├── main.jsx
│   │   └── index.css
│   └── package.json
│
├── server/                          # Backend Node.js
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js        # Connexion PostgreSQL
│   │   ├── database/
│   │   │   └── schema.sql         # Schéma BD complet
│   │   ├── middleware/
│   │   │   └── auth.js            # Middleware JWT
│   │   ├── routes/
│   │   │   ├── auth.js            # Authentification
│   │   │   ├── campaigns.js       # Campagnes
│   │   │   ├── tickets.js         # Achat de tickets
│   │   │   ├── payments.js        # Paiements + webhook
│   │   │   ├── admin.js           # Administration
│   │   │   └── users.js           # Gestion utilisateurs
│   │   ├── services/
│   │   │   └── africasTalking.js  # API Africa's Talking
│   │   ├── utils/
│   │   │   ├── helpers.js         # Fonctions utilitaires
│   │   │   └── logger.js          # Audit logging
│   │   └── server.js              # Point d'entrée
│   ├── migrate.js                 # Script de migration
│   ├── .env.development           # Template config
│   └── package.json
│
├── DATABASE_SETUP.md              # Guide config BD
├── DEMARRAGE_RAPIDE.md            # Guide démarrage
├── CHANGEMENTS_EFFECTUES.md       # Changelog
└── README.md                      # Ce fichier
│   └── vite.config.js     # Configuration Vite
├── server/                # API Node.js backend
│   ├── src/
│   │   ├── routes/        # Routes API
│   │   │   ├── auth.js    # Authentification
│   │   │   ├── campaigns.js # Campagnes
│   │   │   ├── tickets.js # Tickets
│   │   │   ├── payments.js # Paiements
│   │   │   ├── admin.js   # Administration
│   │   │   └── users.js   # Utilisateurs
│   │   └── server.js      # Serveur principal
│   ├── .env               # Variables d'environnement
│   └── package.json       # Dépendances backend
└── README.md              # Documentation
```

## 🛠️ Installation et Configuration

### Prérequis
- Node.js (v18 ou supérieur)
- npm ou yarn
- Git

### 1. Cloner le projet
```bash
git clone <votre-repo>
cd kolo
```

### 2. Installation du Backend
```bash
cd server
npm install
cp .env.example .env
# Éditer le fichier .env avec vos paramètres
npm run dev
```

### 3. Installation du Frontend
```bash
cd ../client
npm install
npm run dev
```

## � Démarrage Rapide

### Option 1: Script PowerShell (Le Plus Simple)
```powershell
.\start.ps1
```

### Option 2: Tâches VS Code
1. Appuyez sur `Ctrl+Shift+B` dans VS Code
2. Sélectionnez "Start Both Servers"

### Option 3: Manuel

1. **Backend** (Port 5000):
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Frontend** (Port 3000):
   ```bash
   cd client
   npm install
   npm run dev
   ```

3. Ouvrir votre navigateur sur `http://localhost:3000`

## 📱 Comptes de Test

### Utilisateur Admin
- **Email**: admin@kolo.com
- **Mot de passe**: admin123
- **Accès**: Tableau de bord administrateur

### Utilisateur Standard
- **Email**: julien.kazadi@gmail.com
- **Mot de passe**: password123
- **Accès**: Interface utilisateur standard

## 🎮 Utilisation

### Pour les Utilisateurs
1. **Inscription/Connexion** - Créer un compte ou se connecter
2. **Explorer les Campagnes** - Voir les tombolas disponibles
3. **Acheter des Tickets** - Sélectionner et acheter des tickets
4. **Paiement Mobile Money** - Payer via M-Pesa, Orange ou Airtel
5. **Suivi des Tickets** - Voir ses tickets dans "Mon Compte"

### Pour les Administrateurs
1. **Tableau de Bord** - Statistiques et métriques
2. **Gestion des Participants** - Liste et analyse des utilisateurs
3. **Gestion des Campagnes** - Créer et modifier les tombolas
4. **Tirage au Sort** - Effectuer les tirages
5. **Exports** - Exporter les données (CSV/PDF)

## 💳 Paiements Mobile Money

L'application supporte les principaux opérateurs de RDC:
- **M-Pesa** (Vodacom)
- **Orange Money** (Orange)
- **Airtel Money** (Airtel)

Les paiements sont sécurisés et confirmés via SMS.

## 🔒 Sécurité

- Authentification JWT
- Hachage des mots de passe avec bcrypt
- Validation des données côté serveur
- Protection CORS
- Rate limiting
- Helmet.js pour la sécurité des headers

## 📊 API Endpoints

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription
- `GET /api/auth/verify` - Vérification du token

### Campagnes
- `GET /api/campaigns/current` - Campagne active
- `GET /api/campaigns/:id` - Détails d'une campagne

### Tickets
- `GET /api/tickets/user/:userId` - Tickets d'un utilisateur
- `POST /api/tickets/purchase` - Achat de tickets

### Paiements
- `POST /api/payments/mobile-money` - Paiement mobile money
- `GET /api/payments/status/:id` - Statut d'un paiement

## 🚀 Déploiement

### Production
1. Build du frontend:
   ```bash
   cd client
   npm run build
   ```

2. Configuration de l'environnement de production dans `server/.env`

3. Démarrage du serveur:
   ```bash
   cd server
   npm start
   ```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou support:
- **Email**: support@kolo.com
- **Site Web**: https://kolo-tombola.com

## 🎉 Roadmap

- [ ] Base de données MongoDB/PostgreSQL
- [ ] Notifications push
- [ ] Application mobile (React Native)
- [ ] Intégration blockchain pour la transparence
- [ ] Support multi-langues (Français, Lingala, Swahili)
- [ ] Système de parrainage
- [ ] Tirage en live stream

---

**KOLO** - Participez à la tombola et devenez propriétaire ! 🚗✨