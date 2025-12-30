/**
 * Routes pour la récupération de mot de passe
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query } = require('../config/database');
const { sendPasswordResetEmail, sendPasswordChangedEmail } = require('../services/sendgridService');
const { storeResetToken, getResetToken, markTokenAsUsed } = require('../services/supabaseService');
const logger = require('../utils/logger');

/**
 * POST /api/password-reset/request
 * Demander une réinitialisation de mot de passe
 */
router.post('/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email requis' });
    }

    // Vérifier si l'utilisateur existe
    const usersResult = await query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email]
    );

    // Pour des raisons de sécurité, on renvoie toujours le même message
    // même si l'utilisateur n'existe pas
    if (usersResult.rows.length === 0) {
      logger.info(`Tentative de réinitialisation pour un email inexistant: ${email}`);
      return res.status(200).json({
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
      });
    }

    const user = usersResult.rows[0];

    // Générer un token de réinitialisation sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Le token expire dans 1 heure
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    try {
      // Stocker le token dans Supabase si disponible, sinon dans PostgreSQL local
      if (process.env.SUPABASE_URL) {
        await storeResetToken(user.id, hashedToken, expiresAt);
      } else {
        // Fallback: stocker dans PostgreSQL local
        await query(
          'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
          [user.id, hashedToken, expiresAt]
        );
      }
    } catch (dbError) {
      logger.error('Erreur lors du stockage du token:', dbError);
      return res.status(500).json({ message: 'Erreur lors de la création du token' });
    }

    // Envoyer l'email avec le token non haché
    try {
      await sendPasswordResetEmail(
        user.email,
        user.name,
        resetToken,
        process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://kolo.cd'
      );
    } catch (emailError) {
      logger.error('Erreur lors de l\'envoi de l\'email:', emailError);
      return res.status(500).json({ 
        message: 'Erreur lors de l\'envoi de l\'email. Vérifiez votre configuration SendGrid.' 
      });
    }

    logger.info(`✅ Email de réinitialisation envoyé à ${email}`);
    
    res.status(200).json({
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
    });

  } catch (error) {
    logger.error('Erreur lors de la demande de réinitialisation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/password-reset/verify
 * Vérifier la validité d'un token
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token requis' });
    }

    // Hasher le token reçu pour le comparer
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    let tokenData;

    try {
      if (process.env.SUPABASE_URL) {
        // Utiliser Supabase
        tokenData = await getResetToken(hashedToken);
      } else {
        // Fallback: PostgreSQL local
        const tokensResult = await query(
          `SELECT * FROM password_reset_tokens 
           WHERE token = $1 
           AND used = FALSE 
           AND expires_at > NOW()`,
          [hashedToken]
        );
        tokenData = tokensResult.rows[0] || null;
      }
    } catch (dbError) {
      logger.error('Erreur lors de la vérification du token:', dbError);
      return res.status(500).json({ message: 'Erreur lors de la vérification' });
    }

    if (!tokenData) {
      return res.status(400).json({ 
        message: 'Token invalide ou expiré' 
      });
    }

    res.status(200).json({ 
      valid: true,
      message: 'Token valide' 
    });

  } catch (error) {
    logger.error('Erreur lors de la vérification du token:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/password-reset/reset
 * Réinitialiser le mot de passe avec un token valide
 */
router.post('/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token et nouveau mot de passe requis' });
    }

    // Valider le mot de passe
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }

    // Hasher le token reçu
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    let tokenData;

    try {
      if (process.env.SUPABASE_URL) {
        tokenData = await getResetToken(hashedToken);
      } else {
        const tokensResult = await query(
          `SELECT * FROM password_reset_tokens 
           WHERE token = $1 
           AND used = FALSE 
           AND expires_at > NOW()`,
          [hashedToken]
        );
        tokenData = tokensResult.rows[0] || null;
      }
    } catch (dbError) {
      logger.error('Erreur lors de la récupération du token:', dbError);
      return res.status(500).json({ message: 'Erreur lors de la vérification' });
    }

    if (!tokenData) {
      return res.status(400).json({ 
        message: 'Token invalide ou expiré' 
      });
    }

    // Récupérer les informations de l'utilisateur
    const usersResult = await query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [tokenData.user_id]
    );

    if (usersResult.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const user = usersResult.rows[0];

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, user.id]
    );

    // Marquer le token comme utilisé
    try {
      if (process.env.SUPABASE_URL) {
        await markTokenAsUsed(hashedToken);
      } else {
        await query(
          'UPDATE password_reset_tokens SET used = TRUE, used_at = NOW() WHERE token = $1',
          [hashedToken]
        );
      }
    } catch (updateError) {
      logger.error('Erreur lors de la mise à jour du token:', updateError);
      // Ne pas bloquer le processus
    }

    // Envoyer un email de confirmation
    try {
      await sendPasswordChangedEmail(user.email, user.name);
    } catch (emailError) {
      logger.error('Erreur lors de l\'envoi de l\'email de confirmation:', emailError);
      // Ne pas bloquer le processus
    }

    logger.info(`✅ Mot de passe réinitialisé pour ${user.email}`);

    res.status(200).json({ 
      message: 'Mot de passe réinitialisé avec succès' 
    });

  } catch (error) {
    logger.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/password-reset/cleanup
 * Nettoyer les tokens expirés (route admin)
 */
router.post('/cleanup', async (req, res) => {
  try {
    // TODO: Ajouter une vérification admin ici
    
    let deletedCount = 0;

    if (process.env.SUPABASE_URL) {
      const { cleanExpiredTokens } = require('../services/supabaseService');
      deletedCount = await cleanExpiredTokens();
    } else {
      const result = await query(
        'DELETE FROM password_reset_tokens WHERE expires_at < NOW()'
      );
      deletedCount = result.rowCount || 0;
    }

    res.status(200).json({ 
      message: 'Nettoyage effectué',
      deletedCount 
    });

  } catch (error) {
    logger.error('Erreur lors du nettoyage des tokens:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
