# Test Suite KOLO - Documentation Complète

## 📋 Vue d'ensemble

KOLO dispose d'une suite de tests complète couvrant :
- ✅ **Tests Unitaires Backend** (Jest + Supertest)
- ✅ **Tests Unitaires Frontend** (Vitest)
- ✅ **Tests d'Intégration** (Supertest)
- ✅ **Tests E2E** (Cypress)

## 🧪 Tests Backend (Node.js + Jest + Supertest)

### Fichiers de Test
```
server/tests/
├── auth.test.js          # Tests d'authentification (register, login, verify)
├── campaigns.test.js     # Tests des campagnes
└── tickets.test.js       # Tests des tickets et achats
```

### Commandes d'exécution

```bash
# Installer Jest (si nécessaire)
npm install --save-dev jest supertest

# Exécuter tous les tests
cd server
npm test

# Exécuter un fichier de test spécifique
npm test -- auth.test.js

# Tests en mode watch (re-exécution automatique)
npm test -- --watch

# Avec coverage (couverture de code)
npm test -- --coverage
```

### Couverture de Tests Backend

#### Authentication (`auth.test.js`)
- ✅ Enregistrement utilisateur
- ✅ Validation email
- ✅ Connexion utilisateur
- ✅ Vérification token JWT
- ✅ Gestion des erreurs

#### Campaigns (`campaigns.test.js`)
- ✅ Création de campagne
- ✅ Modification de campagne
- ✅ Récupération des campagnes
- ✅ Gestion des statuts

#### Tickets (`tickets.test.js`)
- ✅ Achat de tickets
- ✅ Génération de numéros uniques
- ✅ Historique utilisateur
- ✅ Validation des tickets

## 🎨 Tests Frontend (React + Vitest)

### Configuration
```bash
# Installer Vitest (si nécessaire)
cd client
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# Exécuter les tests
npm run test

# Mode watch
npm run test:watch

# Avec coverage
npm run test:coverage
```

### Composants à Tester (optionnel)
- `NotificationBell.jsx` - Affichage et gestion des notifications
- `WinnerContactModal.jsx` - Modal de contact des gagnants
- `NotificationsPanel.jsx` - Panneau des notifications
- `UserInvoicesPage.jsx` - Page des factures

## 🎯 Tests E2E (Cypress)

### Fichiers de Test
```
client/cypress/e2e/
├── auth-flow.cy.js       # Flux d'authentification complet
├── purchase-flow.cy.js   # Flux d'achat de tickets
└── admin-flow.cy.js      # Flux administration (tirage, etc.)
```

### Commandes d'exécution

```bash
cd client

# Ouvrir Cypress UI (mode interactif)
npx cypress open

# Exécuter tous les tests en headless (terminal)
npx cypress run

# Exécuter un test spécifique
npx cypress run --spec "cypress/e2e/auth-flow.cy.js"

# Avec vidéo
npx cypress run --record
```

### Couverture de Tests E2E

#### Auth Flow (`auth-flow.cy.js`)
- ✅ Inscription nouvel utilisateur
- ✅ Vérification email
- ✅ Connexion utilisateur
- ✅ Réinitialisation mot de passe
- ✅ Déconnexion

#### Purchase Flow (`purchase-flow.cy.js`)
- ✅ Navigation vers campagne
- ✅ Sélection de tickets
- ✅ Processus de paiement
- ✅ Confirmation et facture

#### Admin Flow (`admin-flow.cy.js`)
- ✅ Connexion admin
- ✅ Création de campagne
- ✅ Tirage au sort
- ✅ Notification des gagnants
- ✅ Dashboard stats

## 📊 Configuration de la CI/CD (GitHub Actions)

### Exemple `.github/workflows/tests.yml`
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      # Tests Backend
      - name: Install Backend Dependencies
        run: cd server && npm install
      
      - name: Run Backend Tests
        run: cd server && npm test
      
      # Tests Frontend
      - name: Install Frontend Dependencies
        run: cd client && npm install
      
      - name: Run Frontend Tests
        run: cd client && npm run test:run
      
      # Tests E2E
      - name: Run Cypress Tests
        run: cd client && npx cypress run
```

## 🚨 Métriques de Qualité

### Objectifs de Couverture
- **Backend**: Minimum 70% couverture
- **Frontend**: Minimum 60% couverture
- **E2E**: Tous les workflows critiques couverts

### Rapports de Couverture
```bash
# Backend
cd server
npm test -- --coverage --coveragePathIgnorePatterns=node_modules

# Frontend
cd client
npm run test:coverage
```

## 🐛 Debugging Tests

### Backend (Jest)
```bash
# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Logs détaillés
npm test -- --verbose
```

### Frontend (Vitest)
```bash
# Mode debug
npm run test:debug
```

### Cypress
```bash
# Plus de verbosité
npx cypress run --headed --no-exit

# Capture des vidéos
npx cypress run --video
```

## 📝 Bonnes Pratiques

1. **Écrire des tests avant le code** (TDD)
2. **Tests = Documentation vivante**
3. **Chaque test doit être indépendant**
4. **Utiliser des descriptions claires**
5. **Tester les cas d'erreur**
6. **Mock les dépendances externes**

## 🔗 Ressources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Vitest Documentation](https://vitest.dev/)
- [Cypress Documentation](https://docs.cypress.io/)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)

---

**Dernière mise à jour**: 15 Décembre 2025  
**Auteur**: GitHub Copilot  
**Projet**: KOLO Tombola Application
