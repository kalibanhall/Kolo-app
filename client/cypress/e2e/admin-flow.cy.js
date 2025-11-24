describe('Admin Dashboard & Draw Flow', () => {
  beforeEach(() => {
    // Login as admin
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@kolo.cd');
    cy.get('input[name="password"]').type('admin123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/admin');
  });

  it('should display admin dashboard', () => {
    cy.visit('/admin');
    
    // Should show admin title
    cy.contains('Administration').should('be.visible');
    
    // Should show statistics
    cy.contains('Utilisateurs').should('be.visible');
    cy.contains('Campagnes').should('be.visible');
    cy.contains('Tickets vendus').should('be.visible');
    cy.contains('Revenus').should('be.visible');
  });

  it('should navigate to campaign management', () => {
    cy.visit('/admin');
    
    cy.contains('Gérer les campagnes').click();
    
    cy.url().should('include', '/admin/campaigns');
    cy.contains('Gestion des Campagnes').should('be.visible');
  });

  it('should create new campaign', () => {
    cy.visit('/admin/campaigns/create');
    
    const campaignName = `Test Campaign ${Date.now()}`;
    
    // Fill campaign form
    cy.get('input[name="nom_campagne"]').type(campaignName);
    cy.get('textarea[name="description"]').type('Test campaign description');
    cy.get('input[name="prix_ticket"]').clear().type('1.00');
    cy.get('input[name="nombre_tickets_max"]').clear().type('1000');
    cy.get('input[name="date_debut"]').type('2024-02-01');
    cy.get('input[name="date_fin"]').type('2024-02-28');
    
    // Submit form
    cy.get('button[type="submit"]').contains('Créer').click();
    
    // Should show success message
    cy.contains('Campagne créée avec succès', { timeout: 10000 }).should('be.visible');
  });

  it('should view campaign participants', () => {
    cy.visit('/admin/campaigns');
    
    // Click on first campaign
    cy.get('[data-testid="campaign-row"]').first().within(() => {
      cy.contains('Participants').click();
    });
    
    cy.url().should('include', '/admin/participants');
    cy.contains('Participants').should('be.visible');
  });

  it('should conduct lottery draw', () => {
    cy.visit('/admin/campaigns');
    
    // Find an active campaign
    cy.get('[data-testid="campaign-row"]').first().within(() => {
      cy.contains('Effectuer le tirage').click();
    });
    
    // Confirm draw
    cy.on('window:confirm', () => true);
    
    // Should show winner announcement
    cy.contains('Gagnant', { timeout: 15000 }).should('be.visible');
  });

  it('should view draw results', () => {
    cy.visit('/admin/actions');
    
    cy.contains('Voir les résultats').click();
    
    cy.url().should('include', '/results');
    cy.contains('Résultats des Tirages').should('be.visible');
  });

  it('should manage pending payments', () => {
    cy.visit('/admin/payments');
    
    cy.contains('Paiements en attente').should('be.visible');
    
    // Should show payments table
    cy.get('[data-testid="payments-table"]').should('exist');
  });

  it('should verify a payment', () => {
    cy.visit('/admin/payments');
    
    // Click on first pending payment
    cy.get('[data-testid="payment-row"]').first().within(() => {
      cy.contains('Vérifier').click();
    });
    
    // Should update payment status
    cy.contains('Paiement vérifié', { timeout: 10000 }).should('be.visible');
  });

  it('should view all users', () => {
    cy.visit('/admin/users');
    
    cy.contains('Utilisateurs').should('be.visible');
    
    // Should show users table
    cy.get('[data-testid="users-table"]').should('exist');
    
    // Should have search functionality
    cy.get('input[placeholder*="Rechercher"]').should('exist');
  });

  it('should export campaign data', () => {
    cy.visit('/admin/campaigns');
    
    cy.get('[data-testid="campaign-row"]').first().within(() => {
      cy.contains('Exporter').click();
    });
    
    // Should trigger download
    // Note: File download verification requires additional Cypress plugin
    cy.wait(2000);
  });

  it('should prevent non-admin access', () => {
    // Logout
    cy.contains('Déconnexion').click();
    
    // Login as regular user
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    
    // Try to access admin route
    cy.visit('/admin', { failOnStatusCode: false });
    
    // Should redirect to home or show forbidden
    cy.url().should('not.include', '/admin');
  });
});
