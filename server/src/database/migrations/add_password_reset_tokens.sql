-- Migration: Ajouter la table pour les tokens de réinitialisation de mot de passe
-- Date: 2025-01-02

-- Table pour les tokens de réinitialisation de mot de passe
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Index pour améliorer les performances
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

-- Commentaires pour la documentation
COMMENT ON TABLE password_reset_tokens IS 'Stocke les tokens de réinitialisation de mot de passe';
COMMENT ON COLUMN password_reset_tokens.token IS 'Token unique généré pour la réinitialisation';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Date d''expiration du token (généralement 1 heure)';
COMMENT ON COLUMN password_reset_tokens.used IS 'Indique si le token a déjà été utilisé';
