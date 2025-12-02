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
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    const msg = {
      to: toEmail,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject: 'Réinitialisation de votre mot de passe KOLO',
      text: `Bonjour ${userName},\n\nVous avez demandé à réinitialiser votre mot de passe.\n\nCliquez sur ce lien pour créer un nouveau mot de passe:\n${resetUrl}\n\nCe lien expire dans 1 heure.\n\nSi vous n'avez pas demandé cette réinitialisation, ignorez cet email.\n\nCordialement,\nL'équipe KOLO`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Réinitialisation de mot de passe</title>
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
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            .content p {
              margin-bottom: 20px;
              font-size: 16px;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .button {
              display: inline-block;
              padding: 15px 40px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white !important;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              font-size: 16px;
              transition: transform 0.2s;
            }
            .button:hover {
              transform: translateY(-2px);
            }
            .warning {
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
            .footer a {
              color: #667eea;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎰 KOLO Tombola</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>${userName}</strong>,</p>
              <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte KOLO.</p>
              <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
              
              <div class="button-container">
                <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
              </div>
              
              <div class="warning">
                ⚠️ <strong>Important :</strong> Ce lien expire dans <strong>1 heure</strong> pour des raisons de sécurité.
              </div>
              
              <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
              <p style="word-break: break-all; color: #667eea; font-size: 14px;">${resetUrl}</p>
              
              <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">
                Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe actuel reste inchangé.
              </p>
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
    logger.info(`✅ Email de réinitialisation envoyé à ${toEmail}`);
  } catch (error) {
    logger.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    throw new Error('Impossible d\'envoyer l\'email de réinitialisation');
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
