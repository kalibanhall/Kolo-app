// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Disable uncaught exception handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  console.error('Uncaught exception:', err);
  return false;
});

// Clear local storage before each test
beforeEach(() => {
  cy.clearLocalStorage();
  cy.clearCookies();
});

// Setup API intercepts
beforeEach(() => {
  // Intercept auth requests
  cy.intercept('POST', '/api/auth/login').as('login');
  cy.intercept('POST', '/api/auth/register').as('register');
  
  // Intercept campaign requests
  cy.intercept('GET', '/api/campaigns/**').as('getCampaigns');
  
  // Intercept ticket requests
  cy.intercept('POST', '/api/tickets/purchase').as('purchaseTickets');
  cy.intercept('GET', '/api/tickets/**').as('getTickets');
});
