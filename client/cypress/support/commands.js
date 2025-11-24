// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Login command
Cypress.Commands.add('login', (email = 'test@example.com', password = 'password123') => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('not.include', '/login');
});

// Admin login command
Cypress.Commands.add('loginAsAdmin', () => {
  cy.login('admin@kolo.cd', 'admin123');
  cy.url().should('include', '/admin');
});

// Create test user command
Cypress.Commands.add('createUser', (userData) => {
  const defaultData = {
    prenom: 'Test',
    nom: 'User',
    email: `test${Date.now()}@example.com`,
    telephone: '+243812345678',
    password: 'SecurePass123!'
  };

  const user = { ...defaultData, ...userData };

  cy.request('POST', `${Cypress.env('apiUrl')}/auth/register`, user)
    .its('status')
    .should('eq', 201);

  return cy.wrap(user);
});

// Purchase tickets command
Cypress.Commands.add('purchaseTickets', (count = 1, phone = '+243812345678') => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/tickets/purchase`,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('token')}`
    },
    body: {
      campagne_id: 1,
      nombre_tickets: count,
      telephone: phone
    }
  }).its('status').should('be.oneOf', [200, 201]);
});

// Clear database command (for testing)
Cypress.Commands.add('clearTestData', () => {
  // Only for test environment
  if (Cypress.env('NODE_ENV') === 'test') {
    cy.request('POST', `${Cypress.env('apiUrl')}/admin/clear-test-data`);
  }
});

// Check for toast notification
Cypress.Commands.add('checkToast', (message) => {
  cy.get('[role="alert"]', { timeout: 10000 })
    .should('be.visible')
    .and('contain', message);
});

// Wait for API request
Cypress.Commands.add('waitForApi', (alias) => {
  cy.wait(alias).its('response.statusCode').should('be.oneOf', [200, 201, 204]);
});

// Take screenshot with custom name
Cypress.Commands.add('screenshot', (name) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  cy.screenshot(`${name}-${timestamp}`);
});
