describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should register a new user successfully', () => {
    const uniqueEmail = `test${Date.now()}@example.com`;
    
    cy.contains('Créer un compte').click();
    
    // Fill registration form
    cy.get('input[name="prenom"]').type('Test');
    cy.get('input[name="nom"]').type('User');
    cy.get('input[name="email"]').type(uniqueEmail);
    cy.get('input[name="telephone"]').type('+243812345678');
    cy.get('input[name="password"]').type('SecurePass123!');
    cy.get('input[name="confirmPassword"]').type('SecurePass123!');
    
    // Submit form
    cy.get('button[type="submit"]').contains('Créer mon compte').click();
    
    // Should show success message
    cy.contains('Inscription réussie', { timeout: 10000 }).should('be.visible');
    cy.contains('Vérifiez votre email').should('be.visible');
  });

  it('should login existing user', () => {
    cy.visit('/login');
    
    // Use test user credentials
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    
    cy.get('button[type="submit"]').contains('Se connecter').click();
    
    // Should redirect to dashboard
    cy.url().should('include', '/dashboard');
    cy.contains('Tableau de Bord').should('be.visible');
  });

  it('should show error for invalid credentials', () => {
    cy.visit('/login');
    
    cy.get('input[name="email"]').type('wrong@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    
    cy.get('button[type="submit"]').click();
    
    // Should show error message
    cy.contains('Email ou mot de passe incorrect').should('be.visible');
  });

  it('should handle forgot password flow', () => {
    cy.visit('/login');
    
    cy.contains('Mot de passe oublié').click();
    
    cy.url().should('include', '/forgot-password');
    
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('button[type="submit"]').click();
    
    cy.contains('Email de réinitialisation envoyé').should('be.visible');
  });

  it('should validate form inputs', () => {
    cy.visit('/register');
    
    // Submit empty form
    cy.get('button[type="submit"]').click();
    
    // Should show validation errors
    cy.contains('Ce champ est requis').should('be.visible');
    
    // Invalid email
    cy.get('input[name="email"]').type('invalidemail');
    cy.get('input[name="email"]').blur();
    cy.contains('Email invalide').should('be.visible');
    
    // Invalid phone
    cy.get('input[name="telephone"]').type('123');
    cy.get('input[name="telephone"]').blur();
    cy.contains('Format du numéro invalide').should('be.visible');
    
    // Weak password
    cy.get('input[name="password"]').type('123');
    cy.get('input[name="password"]').blur();
    cy.contains('Mot de passe trop faible').should('be.visible');
  });

  it('should logout successfully', () => {
    // Login first
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    
    cy.url().should('include', '/dashboard');
    
    // Logout
    cy.contains('Déconnexion').click();
    
    // Should redirect to home
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });
});
