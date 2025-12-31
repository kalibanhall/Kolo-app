/**
 * Service de gestion des emails avec SendGrid
 */
const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

// Initialiser SendGrid avec la clé API
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  logger.warn('⚠️ SENDGRID_API_KEY non configurée - Les emails ne seront pas envoyés');
}

/**
 * Configuration de l'expéditeur
 */
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@kolo-app.com';
const FROM_NAME = process.env.FROM_NAME || 'KOLO Tombola';

/**
 * Envoyer un email de réinitialisation de mot de passe
 * @param {string} toEmail - Email du destinataire
 * @param {string} userName - Nom de l'utilisateur
 * @param {string} resetToken - Token de réinitialisation
 * @param {string} frontendUrl - URL du frontend (ex: http://localhost:3000)
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail(toEmail, userName, resetToken, frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000') {
  try {
    // URL corrigée: utilise /:token au lieu de ?token=
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
    
    const msg = {
      to: toEmail,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject: 'Réinitialisation de votre mot de passe - KOLO',
      text: `Bonjour ${userName},\n\nVous avez demandé à réinitialiser votre mot de passe.\n\nCliquez sur ce lien pour créer un nouveau mot de passe:\n${resetUrl}\n\nCe lien expire dans 1 heure.\n\nSi vous n'avez pas demandé cette réinitialisation, ignorez cet email.\n\nCordialement,\nL'équipe KOLO`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Réinitialisation de mot de passe</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
                  
                  <!-- Header avec logo KOLO -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #0891b2 0%, #3b82f6 100%); padding: 32px 30px; text-align: center;">
                      <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                        <tr>
                          <td style="width: 48px; height: 48px; background: linear-gradient(135deg, #06b6d4, #3b82f6); border-radius: 12px; text-align: center; vertical-align: middle;">
                            <span style="color: white; font-size: 24px; font-weight: bold;">K</span>
                          </td>
                          <td style="padding-left: 12px;">
                            <span style="color: white; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">KOLO</span>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 12px 0 0; color: rgba(255,255,255,0.8); font-size: 13px; letter-spacing: 1px;">TOMBOLA EN LIGNE</p>
                    </td>
                  </tr>
                  
                  <!-- Contenu principal -->
                  <tr>
                    <td style="padding: 40px 32px;">
                      <h2 style="color: #f1f5f9; font-size: 22px; font-weight: 700; margin: 0 0 24px; text-align: center;">
                        Réinitialisation du mot de passe
                      </h2>
                      
                      <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
                        Bonjour <strong style="color: #06b6d4;">${userName}</strong>,
                      </p>
                      
                      <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 32px;">
                        Vous avez demandé à réinitialiser votre mot de passe pour votre compte KOLO. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
                      </p>
                      
                      <!-- Bouton CTA -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 8px 0 32px;">
                            <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">
                              Créer un nouveau mot de passe
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Warning Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(251, 191, 36, 0.1); border-radius: 12px; border-left: 3px solid #f59e0b;">
                        <tr>
                          <td style="padding: 16px 20px;">
                            <p style="margin: 0; color: #fbbf24; font-size: 14px; font-weight: 600;">
                              Ce lien expire dans 1 heure
                            </p>
                            <p style="margin: 6px 0 0; color: #94a3b8; font-size: 13px;">
                              Pour des raisons de sécurité, ce lien n'est valable qu'une seule fois.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Lien alternatif -->
                      <div style="margin-top: 28px; padding: 16px; background: #0f172a; border-radius: 12px; border: 1px solid #334155;">
                        <p style="color: #64748b; font-size: 12px; margin: 0 0 8px;">
                          Si le bouton ne fonctionne pas, copiez ce lien :
                        </p>
                        <p style="color: #06b6d4; font-size: 11px; word-break: break-all; margin: 0; font-family: monospace;">
                          ${resetUrl}
                        </p>
                      </div>
                      
                      <!-- Note sécurité -->
                      <p style="margin: 28px 0 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                        Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email. Votre mot de passe reste inchangé.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background: #0f172a; padding: 24px 32px; text-align: center; border-top: 1px solid #334155;">
                      <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">
                        Cet email a été envoyé par <strong style="color: #94a3b8;">KOLO</strong>
                      </p>
                      <p style="margin: 0; color: #475569; font-size: 12px;">
                        La plateforme de tombola en ligne
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    await sgMail.send(msg);
    logger.info(`✅ Email de réinitialisation envoyé à ${toEmail}`);
  } catch (error) {
    logger.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    if (error.response) {
      logger.error('SendGrid response error:', error.response.body);
    }
    // Vérifier si la clé API est configurée
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('Configuration SendGrid manquante. Veuillez contacter le support.');
    }
    throw new Error('Impossible d\'envoyer l\'email de réinitialisation. Veuillez réessayer plus tard.');
  }
}

/**
 * Envoyer un email de confirmation de changement de mot de passe
 * @param {string} toEmail - Email du destinataire
 * @param {string} userName - Nom de l'utilisateur
 * @returns {Promise<void>}
 */
async function sendPasswordChangedEmail(toEmail, userName) {
  try {
    const msg = {
      to: toEmail,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject: 'Votre mot de passe a été modifié',
      text: `Bonjour ${userName},\n\nVotre mot de passe a été modifié avec succès.\n\nSi vous n'êtes pas à l'origine de ce changement, contactez immédiatement notre support.\n\nCordialement,\nL'équipe KOLO`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Mot de passe modifié</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: white;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 40px 30px;
            }
            .success-icon {
              text-align: center;
              font-size: 60px;
              margin-bottom: 20px;
            }
            .alert {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              font-size: 14px;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #6c757d;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎰 KOLO Tombola</h1>
            </div>
            <div class="content">
              <div class="success-icon">✅</div>
              <h2 style="text-align: center; color: #28a745;">Mot de passe modifié avec succès</h2>
              <p>Bonjour <strong>${userName}</strong>,</p>
              <p>Votre mot de passe a été modifié avec succès.</p>
              <p>Vous pouvez maintenant vous connecter à votre compte KOLO avec votre nouveau mot de passe.</p>
              
              <div class="alert">
                ⚠️ <strong>Vous n'êtes pas à l'origine de ce changement ?</strong><br>
                Si vous n'avez pas demandé cette modification, contactez immédiatement notre support à <a href="mailto:support@kolo-app.com">support@kolo-app.com</a>
              </div>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé par <strong>KOLO Tombola</strong></p>
              <p>Des questions ? Contactez-nous à <a href="mailto:support@kolo-app.com">support@kolo-app.com</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await sgMail.send(msg);
    logger.info(`✅ Email de confirmation envoyé à ${toEmail}`);
  } catch (error) {
    logger.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    // Ne pas bloquer le processus si l'email de confirmation échoue
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendPasswordChangedEmail
};
