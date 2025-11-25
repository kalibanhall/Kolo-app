# 🧪 TESTS - Guide d'Exécution

## ⚠️ PRÉREQUIS TESTS BACKEND

Les tests backend nécessitent une configuration de base de données PostgreSQL.

### Configuration Base de Données Test

1. **Créer une base de données de test:**
```bash
createdb kolo_test
```

2. **Configurer les variables d'environnement pour les tests:**
Créer `.env.test` dans `server/`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/kolo_test
NODE_ENV=test
JWT_SECRET=test_secret_key
```

3. **Exécuter les migrations:**
```bash
cd server
npm run migrate
```

### Exécuter les Tests Backend

```bash
cd server
npm test                # Tests avec coverage
npm run test:watch      # Mode watch pour TDD
```

## ✅ RÉSULTAT ACTUEL

### Tests Backend (Jest + Supertest)
- ✅ Configuration Jest complète
- ✅ 17 test cases créés
- ✅ Coverage threshold: 70%
- ⚠️ **NÉCESSITE DB de test configurée**

**Fichiers de tests:**
- `tests/auth.test.js` - 13 tests authentification
- `tests/tickets.test.js` - 10 tests achat tickets
- `tests/campaigns.test.js` - 6 tests campagnes

### Tests E2E Frontend (Cypress)
- ✅ Configuration Cypress complète
- ✅ 24 test scenarios créés
- ⚠️ **NÉCESSITE Cypress installé + serveurs lancés**

**Fichiers de tests:**
- `cypress/e2e/auth-flow.cy.js` - 6 scénarios auth
- `cypress/e2e/purchase-flow.cy.js` - 8 scénarios achat
- `cypress/e2e/admin-flow.cy.js` - 10 scénarios admin

## 🚀 TESTS E2E CYPRESS

### Installation Cypress

**⚠️ ATTENTION:** L'installation a échoué précédemment à cause de problèmes réseau.

```bash
cd client
npm install --save-dev cypress @testing-library/cypress
```

Si l'installation échoue:
1. Vérifier la connexion Internet
2. Utiliser un proxy si nécessaire
3. Ou télécharger Cypress manuellement

### Exécuter Tests Cypress

**Mode interactif:**
```bash
cd client
npm run test:e2e
```

**Mode headless (CI):**
```bash
cd client
npm run test:e2e:ci
```

**Prérequis:**
- Backend en cours d'exécution: `http://localhost:5000`
- Frontend en cours d'exécution: `http://localhost:3000`

## 📊 STRUCTURE DES TESTS

### Backend Tests Structure
```
server/tests/
├── auth.test.js        # Authentication routes
├── tickets.test.js     # Ticket purchase & retrieval
└── campaigns.test.js   # Campaign management
```

### Frontend E2E Tests Structure
```
client/cypress/
├── e2e/
│   ├── auth-flow.cy.js      # Login, register, password reset
│   ├── purchase-flow.cy.js   # Ticket purchase flow
│   └── admin-flow.cy.js      # Admin dashboard & draw
├── support/
│   ├── commands.js           # Custom Cypress commands
│   └── e2e.js                # Global configuration
└── cypress.config.js         # Cypress configuration
```

## 🔧 DÉPANNAGE

### Erreur "Tenant or user not found"
**Cause:** Base de données PostgreSQL non configurée pour les tests

**Solution:**
1. Vérifier `DATABASE_URL` dans `.env`
2. Créer la base de données: `createdb kolo_test`
3. Exécuter les migrations
4. Relancer les tests

### Erreur "Module not found"
**Cause:** Dépendances manquantes

**Solution:**
```bash
cd server
npm install @sentry/node @sentry/profiling-node swagger-jsdoc swagger-ui-express nodemailer
```

### Cypress ne s'installe pas
**Cause:** Problèmes réseau ou taille du téléchargement

**Solutions:**
1. Utiliser `npm install cypress --legacy-peer-deps`
2. Définir `CYPRESS_INSTALL_BINARY=0` pour skip binary
3. Télécharger manuellement: https://download.cypress.io/desktop

## ✅ COMMANDES RAPIDES

```bash
# Backend - Tous les tests
cd server && npm test

# Backend - Mode watch
cd server && npm run test:watch

# Frontend E2E - Interface graphique
cd client && npm run test:e2e

# Frontend E2E - Headless (CI)
cd client && npm run test:e2e:ci

# Analyser le bundle
cd client && npm run analyze
```

## 📈 COUVERTURE ATTENDUE

### Objectifs Coverage Backend
- **Statements:** > 70%
- **Branches:** > 70%
- **Functions:** > 70%
- **Lines:** > 70%

### Tests E2E Coverage
- ✅ Flux d'inscription complet
- ✅ Flux de connexion
- ✅ Flux d'achat de tickets (1-5 tickets)
- ✅ Validation des formulaires
- ✅ Flux admin (tirage, participants)
- ✅ Gestion des erreurs

## 🎯 PROCHAINES ÉTAPES

1. **Configurer base de données test**
2. **Installer Cypress** (si échec réseau, skip pour l'instant)
3. **Exécuter tests backend:** `cd server && npm test`
4. **Exécuter tests E2E:** `cd client && npm run test:e2e`
5. **Vérifier coverage:** Consulter `server/coverage/lcov-report/index.html`

## 📝 NOTES

- Les tests backend utilisent **transactions DB** pour isolation
- Les tests E2E utilisent **intercepts** pour mock API
- Sentry est **désactivé en mode test**
- Tous les tests sont **indépendants** et peuvent s'exécuter dans n'importe quel ordre

---

**Projet KOLO** - Tests Automatisés  
*Configuration complète à 100%*  
*Exécution nécessite setup DB de test*
