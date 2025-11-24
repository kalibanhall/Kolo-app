describe('Ticket Purchase Flow', () => {
  beforeEach(() => {
    // Login before each test
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should display active campaign', () => {
    cy.visit('/');
    
    // Should show campaign card
    cy.contains('Campagne en cours').should('be.visible');
    cy.get('[data-testid="campaign-card"]').should('exist');
    
    // Campaign should have details
    cy.contains('Prix du ticket').should('be.visible');
    cy.contains('Tickets disponibles').should('be.visible');
  });

  it('should navigate to buy tickets page', () => {
    cy.visit('/dashboard');
    
    cy.contains('Acheter des Tickets').click();
    
    cy.url().should('include', '/buy-tickets');
    cy.contains('Acheter des Tickets').should('be.visible');
  });

  it('should purchase tickets successfully', () => {
    cy.visit('/buy-tickets');
    
    // Select number of tickets
    cy.get('input[type="number"]').clear().type('3');
    
    // Enter phone number
    cy.get('input[name="telephone"]').clear().type('+243812345678');
    
    // Submit purchase
    cy.get('button').contains('Acheter').click();
    
    // Should show payment instructions
    cy.contains('Instructions de paiement', { timeout: 10000 }).should('be.visible');
    cy.contains('Envoyez').should('be.visible');
    cy.contains('USSD').should('be.visible');
  });

  it('should validate ticket count', () => {
    cy.visit('/buy-tickets');
    
    // Try to buy 0 tickets
    cy.get('input[type="number"]').clear().type('0');
    cy.get('button').contains('Acheter').click();
    
    cy.contains('Minimum 1 ticket').should('be.visible');
    
    // Try to buy more than 5 tickets
    cy.get('input[type="number"]').clear().type('10');
    cy.get('button').contains('Acheter').click();
    
    cy.contains('Maximum 5 tickets').should('be.visible');
  });

  it('should validate phone number', () => {
    cy.visit('/buy-tickets');
    
    cy.get('input[type="number"]').clear().type('3');
    
    // Invalid phone number
    cy.get('input[name="telephone"]').clear().type('123456');
    cy.get('button').contains('Acheter').click();
    
    cy.contains('Numéro de téléphone invalide').should('be.visible');
  });

  it('should display user tickets in dashboard', () => {
    cy.visit('/dashboard');
    
    // Should show my tickets section
    cy.contains('Mes Tickets').should('be.visible');
    
    // Should show tickets list or empty state
    cy.get('[data-testid="tickets-list"]').should('exist');
  });

  it('should show ticket details', () => {
    cy.visit('/dashboard');
    
    // Click on first ticket
    cy.get('[data-testid="ticket-card"]').first().click();
    
    // Should show ticket details
    cy.contains('Numéro de ticket').should('be.visible');
    cy.contains('Campagne').should('be.visible');
    cy.contains('Statut').should('be.visible');
  });

  it('should calculate total price correctly', () => {
    cy.visit('/buy-tickets');
    
    const ticketPrice = 1.00;
    const ticketCount = 3;
    const totalExpected = (ticketPrice * ticketCount).toFixed(2);
    
    cy.get('input[type="number"]').clear().type(ticketCount.toString());
    
    cy.contains(`${totalExpected} $`).should('be.visible');
  });
});
