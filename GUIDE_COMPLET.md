# 🎰 KOLO TOMBOLA - APPLICATION COMPLÈTE

Application web moderne de tombola avec React, Node.js, PostgreSQL et intégrations complètes.

## ✅ FONCTIONNALITÉS COMPLÉTÉES (15/15 - 100%)

### 🎯 Fonctionnalités Principales
1. ✅ **Authentification & Autorisation**
   - JWT avec refresh tokens
   - Rôles (user, admin)
   - Protection des routes
   - Password reset avec Supabase

2. ✅ **Gestion des Campagnes**
   - CRUD complet
   - Statuts automatiques (open, active, closed, completed)
   - Tirage aléatoire de gagnants
   - Upload d'images avec Cloudinary

3. ✅ **Système de Tickets**
   - Achat de 1-5 tickets
   - Génération automatique de numéros
   - Historique utilisateur
   - Validation et réservation

4. ✅ **Paiements Mobile Money**
   - M-Pesa, Orange Money, Airtel Money
   - Webhooks et callbacks
   - Statuts (pending, completed, failed, refunded)
   - Gestion des paiements en attente

5. ✅ **Notifications**
   - Email (SendGrid)
   - SMS (Africa's Talking)
   - Push notifications (Firebase)
   - Cloche de notifications UI
   - Emails de confirmation d'achat
   - Notifications de gain

6. ✅ **Factures & PDFs**
   - Génération automatique PDF
   - Envoi par email
   - Téléchargement utilisateur
   - Page "Mes Factures" avec historique

7. ✅ **Dashboard Admin**
   - Statistiques en temps réel
   - 6 graphiques (recharts): Revenue, Participants, Status, Trends, Top 5, Payment Methods
   - Gestion des campagnes
   - Gestion des participants
   - Résultats de tirage
   - Paiements en attente

8. ✅ **Gestion Livraison des Prix**
   - 5 statuts de livraison: pending, contacted, shipped, delivered, claimed
   - Suivi avec numéro de tracking
   - Adresse de livraison
   - Notes internes
   - Mise à jour groupée
   - Notifications automatiques

9. ✅ **Export de Données**
   - CSV/Excel export
   - 5 fonctions: participants, campagnes, tickets, transactions, gagnants
   - Format UTF-8 avec BOM pour Excel
   - Mapping français des colonnes

10. ✅ **Filtres Avancés**
    - FilterPanel réutilisable
    - Filtres: recherche, statut, date, prix
    - Badges actifs avec suppression
    - Intégré dans pages admin

11. ✅ **Logs & Sécurité**
    - Page admin logs avec pagination
    - Statistiques des actions
    - Filtres par action, entité, admin, date
    - Rate limiting (8 limiters différents)
    - Protection CSRF
    - Helmet.js

12. ✅ **Upload d'Images**
    - Cloudinary intégration
    - Composant ImageUpload réutilisable
    - Validation (5MB, formats)
    - Preview et suppression
    - Upload simple et multiple

13. ✅ **Mode Sombre/Clair**
    - Context API (ThemeContext)
    - Toggle animé (soleil/lune)
    - Persistence localStorage
    - Détection préférence système
    - Classes Tailwind dark:

14. ✅ **Tâches Automatisées (Cron)**
    - Mise à jour statuts campagnes (hourly)
    - Rappels campagnes (daily 9am)
    - Nettoyage données (Sunday 2am)

15. ✅ **Formulaire Contact**
    - Backend avec validation
    - Email admin + confirmation user
    - Rate limiting (5/h)
    - Templates HTML professionnels

## 🏗️ ARCHITECTURE

```
kolo/
├── client/                    # Frontend React + Vite
│   ├── src/
│   │   ├── components/       # Composants réutilisables
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── FilterPanel.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Icons.jsx
│   │   │   ├── ImageUpload.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── LogoKolo.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── NotificationBell.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── PublicRoute.jsx
│   │   │   ├── ScrollToTop.jsx
│   │   │   ├── SplashScreen.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── ThemeToggle.jsx
│   │   │   └── UIComponents.jsx
│   │   ├── context/          # Contexts React
│   │   │   ├── AuthContext.jsx
│   │   │   ├── CampaignContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── hooks/            # Custom hooks
│   │   │   └── useIdleTimer.js
│   │   ├── pages/            # Pages principales
│   │   │   ├── AboutPage.jsx
│   │   │   ├── AdminActionsPage.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminLogsPage.jsx
│   │   │   ├── BuyTicketsPage.jsx
│   │   │   ├── CampaignDetailPage.jsx
│   │   │   ├── CampaignsManagementPage.jsx
│   │   │   ├── ContactPage.jsx
│   │   │   ├── CreateCampaignPage.jsx
│   │   │   ├── DrawResultsPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ParticipantsPage.jsx
│   │   │   ├── PendingPaymentsPage.jsx
│   │   │   ├── PrizeDeliveryPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── ResetPasswordPage.jsx
│   │   │   ├── UserDashboard.jsx
│   │   │   ├── UserInvoicesPage.jsx
│   │   │   ├── UserProfilePage.jsx
│   │   │   ├── VerifyEmailPage.jsx
│   │   │   └── VisionPage.jsx
│   │   ├── services/         # API services
│   │   │   └── api.js
│   │   ├── utils/            # Utilitaires
│   │   │   ├── exportUtils.js
│   │   │   └── phoneValidation.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                    # Backend Node.js + Express
│   ├── src/
│   │   ├── config/           # Configuration
│   │   │   ├── database.js
│   │   │   ├── sentry.js
│   │   │   └── swagger.js
│   │   ├── database/         # Base de données
│   │   │   ├── migrations/
│   │   │   │   ├── add_address_fields.sql
│   │   │   │   └── add_delivery_tracking.sql
│   │   │   └── schema.sql
│   │   ├── middleware/       # Middlewares
│   │   │   ├── auth.js
│   │   │   └── rateLimiter.js
│   │   ├── routes/           # Routes API
│   │   │   ├── admin.js
│   │   │   ├── auth.js
│   │   │   ├── campaigns.js
│   │   │   ├── contact.js
│   │   │   ├── invoices.js
│   │   │   ├── notifications.js
│   │   │   ├── passwordReset.js
│   │   │   ├── payments.js
│   │   │   ├── tickets.js
│   │   │   ├── upload.js
│   │   │   └── users.js
│   │   ├── services/         # Services externes
│   │   │   ├── africasTalking.js
│   │   │   ├── cloudinaryService.js
│   │   │   ├── cronJobs.js
│   │   │   ├── emailService.js
│   │   │   ├── firebaseNotifications.js
│   │   │   ├── pdfGenerator.js
│   │   │   ├── sendgridService.js
│   │   │   └── supabaseService.js
│   │   ├── utils/            # Utilitaires
│   │   │   ├── helpers.js
│   │   │   └── logger.js
│   │   └── server.js
│   ├── .env.example
│   ├── migrate.js
│   └── package.json
│
└── README.md
```

## 🚀 INSTALLATION

### Prérequis
- Node.js 18+ 
- PostgreSQL 14+
- Compte SendGrid
- Compte Cloudinary
- Compte Africa's Talking (SMS)
- Compte Supabase (password reset)

### 1. Cloner le projet
```bash
git clone https://github.com/kalibanhall/Kolo-app.git
cd kolo
```

### 2. Backend Setup
```bash
cd server
npm install
```

Créer `.env` depuis `.env.example` :
```bash
cp .env.example .env
```

Configurer toutes les variables (voir section Variables d'Environnement)

Créer la base de données PostgreSQL :
```sql
CREATE DATABASE kolo_db;
```

Exécuter les migrations :
```bash
node migrate.js
```

Démarrer le serveur :
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

L'application sera accessible sur :
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- API Docs: http://localhost:5000/api/docs

## 🔐 VARIABLES D'ENVIRONNEMENT

### Essentielles (OBLIGATOIRES)

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/kolo_db

# JWT
JWT_SECRET=your-super-secret-key-minimum-32-characters

# SendGrid Email
SENDGRID_API_KEY=SG.your-sendgrid-api-key
FROM_EMAIL=support@kolo.cd
ADMIN_EMAIL=admin@kolo.cd

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Optionnelles (mais recommandées)

```env
# Africa's Talking (SMS)
AT_USERNAME=your-username
AT_API_KEY=your-api-key

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-email
FIREBASE_PRIVATE_KEY="your-private-key"

# Sentry (Error Tracking)
SENTRY_DSN=https://your-dsn@sentry.io/project

# Mobile Money (M-Pesa, Orange, Airtel)
MPESA_CONSUMER_KEY=your-key
ORANGE_MONEY_API_KEY=your-key
AIRTEL_MONEY_CLIENT_ID=your-id
```

## 📊 BASE DE DONNÉES

### Tables Principales

1. **users** - Utilisateurs et admins
2. **campaigns** - Campagnes de tombola
3. **purchases** - Achats de tickets
4. **tickets** - Tickets individuels
5. **invoices** - Factures
6. **notifications** - Notifications utilisateurs
7. **admin_logs** - Logs des actions admin
8. **password_reset_tokens** - Tokens de reset (Supabase)

### Migrations

Toutes les migrations SQL sont dans `server/src/database/migrations/`

Pour appliquer manuellement :
```sql
-- 1. Schema principal
\i server/src/database/schema.sql

-- 2. Champs d'adresse
\i server/src/database/migrations/add_address_fields.sql

-- 3. Suivi de livraison
\i server/src/database/migrations/add_delivery_tracking.sql
```

## 🎨 DESIGN & UX

- **Framework CSS**: Tailwind CSS 3.x
- **Mode sombre**: Intégré avec préférence système
- **Responsive**: Mobile-first design
- **Animations**: Transitions fluides
- **Icons**: SVG inline
- **Couleurs**: Palette purple/blue

## 🔒 SÉCURITÉ

- ✅ JWT avec expiration
- ✅ Bcrypt password hashing (10 rounds)
- ✅ Rate limiting (8 limiters)
- ✅ Helmet.js headers
- ✅ CORS configuré
- ✅ SQL injection protection (parameterized queries)
- ✅ XSS protection
- ✅ Admin logs pour audit

## 📧 EMAILS (SendGrid)

Templates HTML professionnels pour :
- Confirmation d'achat
- Notification de gain
- Reset password
- Contact (admin + confirmation user)
- Livraison (shipping, delivered)

## 📱 NOTIFICATIONS

1. **Email** (SendGrid) - Prioritaire
2. **SMS** (Africa's Talking) - Backup
3. **Push** (Firebase) - Optionnel
4. **In-app** (Bell icon) - Temps réel

## 🎯 POINTS D'ENTRÉE

### Frontend Routes
- `/` - Accueil
- `/login` - Connexion
- `/register` - Inscription
- `/profile` - Profil utilisateur
- `/profile/invoices` - Factures
- `/buy` - Achat tickets
- `/admin` - Dashboard admin
- `/admin/campaigns` - Gestion campagnes
- `/admin/participants` - Participants
- `/admin/payments` - Paiements
- `/admin/draw` - Tirage
- `/admin/delivery` - Livraison prix
- `/admin/logs` - Logs & Sécurité

### Backend API
- `GET /api/health` - Health check
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription
- `GET /api/campaigns` - Liste campagnes
- `POST /api/tickets/purchase` - Acheter tickets
- `POST /api/upload/image` - Upload image
- `GET /api/admin/winners` - Liste gagnants
- Voir Swagger: `/api/docs`

## 🔄 TÂCHES CRON

1. **Hourly (XX:00)** - Mise à jour statuts campagnes
2. **Daily (09:00)** - Rappels campagnes
3. **Weekly (Sunday 02:00)** - Nettoyage données anciennes

## 📦 DÉPENDANCES PRINCIPALES

### Backend
- `express` - Web framework
- `pg` - PostgreSQL client
- `jsonwebtoken` - JWT auth
- `bcryptjs` - Password hashing
- `@sendgrid/mail` - Email service
- `cloudinary` - Image uploads
- `multer` - File handling
- `node-cron` - Scheduled tasks
- `express-rate-limit` - Rate limiting
- `helmet` - Security headers
- `pdfkit` - PDF generation

### Frontend
- `react` 18.x - UI library
- `react-router-dom` - Routing
- `axios` - HTTP client
- `recharts` - Charts
- `papaparse` - CSV export
- `tailwindcss` - CSS framework

## 🚢 DÉPLOIEMENT

### Supabase (Database)
1. Créer projet Supabase
2. Copier DATABASE_URL
3. Exécuter migrations SQL
4. Créer table `password_reset_tokens`

### Vercel (Frontend)
```bash
cd client
vercel --prod
```

Variables d'environnement :
- `VITE_API_URL=https://your-backend.com`

### Render/Railway (Backend)
1. Connecter repository
2. Build: `cd server && npm install`
3. Start: `cd server && npm start`
4. Ajouter toutes variables .env

### Cloudinary
1. Créer compte
2. Copier cloud_name, api_key, api_secret
3. Créer dossier "kolo" pour uploads

## 🧪 TESTS

```bash
# Backend
cd server
npm test

# Frontend
cd client
npm test
```

## 📈 PERFORMANCES

- Lazy loading des pages React
- Pagination des listes (20 items)
- Index database sur colonnes fréquentes
- Compression gzip
- CDN pour assets (Cloudinary)
- Rate limiting pour protection

## 🐛 DÉBOGAGE

### Logs Backend
```bash
cd server
npm run dev
# Logs dans console + fichiers logs/
```

### Sentry Error Tracking
Si configuré, tous les errors sont tracés automatiquement

### Database Queries
Les queries SQL sont loggées en development mode

## 📝 CONVENTIONS DE CODE

- **Backend**: CommonJS, 2 spaces
- **Frontend**: ES6+, 2 spaces
- **Naming**: camelCase (JS), snake_case (SQL)
- **Comments**: JSDoc pour fonctions importantes

## 🤝 CONTRIBUTION

1. Fork le projet
2. Créer branche feature (`git checkout -b feature/amazing`)
3. Commit changements (`git commit -m 'Add amazing feature'`)
4. Push branche (`git push origin feature/amazing`)
5. Ouvrir Pull Request

## 📄 LICENSE

MIT License - voir LICENSE file

## 👥 ÉQUIPE

- **Développeur Principal**: Kalibanhall
- **Email**: support@kolo.cd
- **GitHub**: https://github.com/kalibanhall/Kolo-app

## 🎉 STATUT DU PROJET

**✅ PROJET TERMINÉ À 100%**

Toutes les 15 fonctionnalités prévues ont été implémentées avec succès !

---

**Made with ❤️ for KOLO Tombola**
