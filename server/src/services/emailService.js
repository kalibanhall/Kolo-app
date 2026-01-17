const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid initialized for emailService');
} else {
  console.warn('⚠️ SENDGRID_API_KEY not configured - Emails will not be sent');
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'support@kolo.cd';
const FROM_NAME = process.env.FROM_NAME || 'KOLO | Koma Propriétaire';
const LOGO_URL = 'https://res.cloudinary.com/djuyrqof8/image/upload/v1737158400/kolo/logo-kolo.png';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://kolo.cd';

/**
 * Template HTML de base pour tous les emails KOLO
 */
const getEmailTemplate = (content, preheader = '') => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>KOLO | Koma Propriétaire</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; }
    .preheader { display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; color: #f3f4f6; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; }
    .email-wrapper { width: 100%; background-color: #f3f4f6; padding: 40px 20px; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
    .email-header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%); padding: 32px 40px; text-align: center; }
    .logo-container { margin-bottom: 16px; }
    .logo { height: 60px; width: auto; }
    .brand-name { color: #ffffff; font-size: 14px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-top: 8px; }
    .email-body { padding: 40px; }
    .greeting { font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 16px; }
    .content { color: #4b5563; font-size: 16px; margin-bottom: 24px; }
    .highlight-box { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #bae6fd; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .success-box { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #a7f3d0; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .warning-box { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1px solid #fde68a; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .danger-box { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 1px solid #fecaca; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .ticket-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
    .ticket-number { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; padding: 10px 18px; border-radius: 8px; font-weight: 700; font-size: 14px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3); }
    .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #6b7280; font-size: 14px; }
    .detail-value { color: #1f2937; font-weight: 600; font-size: 14px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff !important; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; text-align: center; margin: 24px 0; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4); transition: all 0.3s ease; }
    .cta-button:hover { box-shadow: 0 6px 20px rgba(79, 70, 229, 0.5); }
    .cta-button-success { background: linear-gradient(135deg, #059669 0%, #10b981 100%); box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4); }
    .cta-button-danger { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4); }
    .email-footer { background-color: #f9fafb; padding: 32px 40px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer-logo { height: 40px; margin-bottom: 16px; opacity: 0.8; }
    .footer-text { color: #6b7280; font-size: 13px; margin-bottom: 8px; }
    .footer-links { margin: 16px 0; }
    .footer-link { color: #4f46e5; text-decoration: none; font-size: 13px; margin: 0 12px; }
    .social-links { margin-top: 20px; }
    .social-icon { display: inline-block; margin: 0 8px; }
    .divider { height: 1px; background: linear-gradient(90deg, transparent, #e5e7eb, transparent); margin: 24px 0; }
    
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 16px 8px; }
      .email-header { padding: 24px 20px; }
      .email-body { padding: 24px 20px; }
      .email-footer { padding: 24px 20px; }
      .greeting { font-size: 20px; }
      .cta-button { display: block; text-align: center; }
    }
  </style>
</head>
<body>
  <span class="preheader">${preheader}</span>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <div class="logo-container">
          <img src="${LOGO_URL}" alt="KOLO" class="logo" />
        </div>
        <div class="brand-name">Koma Propriétaire</div>
      </div>
      <div class="email-body">
        ${content}
      </div>
      <div class="email-footer">
        <img src="${LOGO_URL}" alt="KOLO" class="footer-logo" />
        <p class="footer-text"><strong>KOLO | Koma Propriétaire</strong></p>
        <p class="footer-text">Là où un ticket peut changer une vie</p>
        <div class="footer-links">
          <a href="${FRONTEND_URL}" class="footer-link">Site Web</a>
          <a href="${FRONTEND_URL}/about" class="footer-link">À propos</a>
          <a href="${FRONTEND_URL}/contact" class="footer-link">Contact</a>
        </div>
        <div class="divider"></div>
        <p class="footer-text">📧 support@kolo.cd | 📞 +243 841 209 627</p>
        <p class="footer-text" style="margin-top: 16px; font-size: 11px; color: #9ca3af;">
          Cet email a été envoyé automatiquement. Merci de ne pas y répondre directement.
        </p>
        <p class="footer-text" style="font-size: 11px; color: #9ca3af;">
          © ${new Date().getFullYear()} KOLO. Tous droits réservés.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Envoie un email de confirmation d'achat avec facture
 */
async function sendPurchaseConfirmation(options) {
  const { to, userName, ticketCount, ticketNumbers, totalAmount, campaignTitle, pdfAttachment, invoiceNumber } = options;

  const ticketNumbersHtml = ticketNumbers.map(num => 
    `<span class="ticket-number">${num}</span>`
  ).join('');

  const content = `
    <h1 class="greeting">🎉 Félicitations ${userName} !</h1>
    <p class="content">Votre achat a été confirmé avec succès. Vous êtes maintenant officiellement en lice pour la tombola <strong>${campaignTitle}</strong>.</p>
    
    <div class="success-box">
      <h3 style="color: #059669; font-size: 18px; margin-bottom: 16px;">📋 Détails de votre achat</h3>
      <div class="detail-row">
        <span class="detail-label">Campagne</span>
        <span class="detail-value">${campaignTitle}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Nombre de tickets</span>
        <span class="detail-value">${ticketCount} ticket${ticketCount > 1 ? 's' : ''}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Montant total</span>
        <span class="detail-value">${totalAmount} $</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">N° Facture</span>
        <span class="detail-value">${invoiceNumber}</span>
      </div>
    </div>

    <div class="highlight-box">
      <h3 style="color: #0369a1; font-size: 16px; margin-bottom: 12px;">🎟️ Vos numéros de tickets</h3>
      <div class="ticket-grid">
        ${ticketNumbersHtml}
      </div>
      <p style="color: #64748b; font-size: 13px; margin-top: 16px;">
        Conservez précieusement ces numéros. Ils seront vérifiés lors du tirage au sort.
      </p>
    </div>

    <p class="content">
      ✅ Votre facture est jointe à cet email en pièce jointe (PDF).
    </p>

    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/profile" class="cta-button cta-button-success">
        👀 Voir mes tickets
      </a>
    </div>

    <div class="divider"></div>
    
    <p class="content" style="text-align: center;">
      🍀 <strong>Bonne chance pour le tirage au sort !</strong><br>
      <span style="font-size: 14px; color: #6b7280;">Que la chance soit avec vous.</span>
    </p>
  `;

  const msg = {
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: '🎉 Achat confirmé - Vos tickets KOLO',
    html: getEmailTemplate(content, `Félicitations ${userName}! Votre achat de ${ticketCount} ticket(s) KOLO a été confirmé.`),
    attachments: pdfAttachment ? [{
      content: pdfAttachment.toString('base64'),
      filename: `facture-${invoiceNumber}.pdf`,
      type: 'application/pdf',
      disposition: 'attachment'
    }] : []
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Purchase confirmation email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
}

/**
 * Envoie un email de notification de gain
 */
async function sendWinnerNotification(options) {
  const { to, userName, prize, ticketNumber, campaignTitle } = options;

  const content = `
    <div style="text-align: center; padding: 20px 0;">
      <div style="font-size: 64px; margin-bottom: 16px;">🎊🏆🎊</div>
      <h1 style="font-size: 32px; color: #f59e0b; margin-bottom: 8px;">FÉLICITATIONS !</h1>
      <p style="font-size: 20px; color: #1f2937; font-weight: 600;">Vous avez GAGNÉ !</p>
    </div>

    <p class="content">Cher(e) <strong>${userName}</strong>,</p>
    <p class="content">Nous avons l'immense plaisir de vous annoncer une EXCELLENTE nouvelle ! Votre ticket a été tiré au sort et vous êtes officiellement <strong>GAGNANT(E)</strong> !</p>
    
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 16px; padding: 32px; margin: 24px 0; text-align: center;">
      <p style="color: #92400e; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">🏆 Votre Lot</p>
      <h2 style="color: #78350f; font-size: 28px; font-weight: 700; margin-bottom: 16px;">${prize}</h2>
      <div style="background: #ffffff; border-radius: 8px; padding: 12px; display: inline-block;">
        <p style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Ticket gagnant</p>
        <p style="color: #4f46e5; font-size: 20px; font-weight: 700;">${ticketNumber}</p>
      </div>
      <p style="color: #78350f; font-size: 14px; margin-top: 16px;">Campagne: ${campaignTitle}</p>
    </div>

    <div class="highlight-box">
      <h3 style="color: #0369a1; font-size: 16px; margin-bottom: 16px;">📞 Prochaines étapes</h3>
      <ul style="color: #4b5563; font-size: 14px; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Notre équipe vous contactera sous <strong>48 heures</strong></li>
        <li style="margin-bottom: 8px;">Nous vérifierons votre identité</li>
        <li style="margin-bottom: 8px;">Nous organiserons la remise de votre lot</li>
      </ul>
    </div>

    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/profile" class="cta-button" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
        🎁 Voir mes gains
      </a>
    </div>
  `;

  const msg = {
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: '🏆 FÉLICITATIONS ! Vous avez GAGNÉ !',
    html: getEmailTemplate(content, `Félicitations ${userName}! Vous avez gagné ${prize} avec le ticket ${ticketNumber}!`)
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Winner notification sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Winner notification failed:', error);
    throw error;
  }
}

/**
 * Envoie un email de vérification
 */
async function sendVerificationEmail(options) {
  const { to, userName, verificationToken } = options;
  const verificationUrl = `${FRONTEND_URL}/verify-email/${verificationToken}`;

  const content = `
    <h1 class="greeting">Bienvenue ${userName} ! 👋</h1>
    <p class="content">Merci de vous être inscrit(e) sur <strong>KOLO | Koma Propriétaire</strong>. Vous êtes à un pas de pouvoir participer à nos tombolas et peut-être changer votre vie !</p>
    
    <div class="highlight-box">
      <h3 style="color: #0369a1; font-size: 16px; margin-bottom: 12px;">✉️ Vérifiez votre adresse email</h3>
      <p style="color: #4b5563; font-size: 14px;">
        Pour activer votre compte et accéder à toutes les fonctionnalités, veuillez confirmer votre adresse email.
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${verificationUrl}" class="cta-button">
        ✅ Vérifier mon email
      </a>
    </div>

    <div class="divider"></div>

    <p style="color: #6b7280; font-size: 13px; text-align: center;">
      Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
      <a href="${verificationUrl}" style="color: #4f46e5; word-break: break-all; font-size: 12px;">${verificationUrl}</a>
    </p>

    <div class="warning-box" style="margin-top: 24px;">
      <p style="color: #92400e; font-size: 13px;">
        ⏰ <strong>Ce lien expire dans 24 heures.</strong> Si vous n'avez pas créé de compte KOLO, ignorez cet email.
      </p>
    </div>
  `;

  const msg = {
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: '✉️ Vérifiez votre email - KOLO | Koma Propriétaire',
    html: getEmailTemplate(content, `${userName}, vérifiez votre adresse email pour activer votre compte KOLO.`)
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Verification email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Verification email failed:', error);
    throw error;
  }
}

/**
 * Envoie un email de réinitialisation de mot de passe
 */
async function sendPasswordResetEmail(options) {
  const { to, userName, resetToken } = options;
  const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;

  const content = `
    <h1 class="greeting">Réinitialisation de mot de passe 🔐</h1>
    <p class="content">Bonjour <strong>${userName}</strong>,</p>
    <p class="content">Vous avez demandé à réinitialiser votre mot de passe pour votre compte <strong>KOLO | Koma Propriétaire</strong>.</p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" class="cta-button cta-button-danger">
        🔑 Réinitialiser mon mot de passe
      </a>
    </div>

    <div class="danger-box">
      <h3 style="color: #dc2626; font-size: 14px; margin-bottom: 8px;">⚠️ Important</h3>
      <p style="color: #7f1d1d; font-size: 13px; margin-bottom: 0;">
        Si vous n'avez <strong>pas</strong> demandé cette réinitialisation, ignorez simplement cet email. Votre mot de passe actuel reste sécurisé et ne sera pas modifié.
      </p>
    </div>

    <div class="divider"></div>

    <p style="color: #6b7280; font-size: 13px; text-align: center;">
      Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
      <a href="${resetUrl}" style="color: #dc2626; word-break: break-all; font-size: 12px;">${resetUrl}</a>
    </p>

    <div class="warning-box" style="margin-top: 24px;">
      <p style="color: #92400e; font-size: 13px;">
        ⏰ <strong>Ce lien expire dans 1 heure.</strong> Après ce délai, vous devrez faire une nouvelle demande.
      </p>
    </div>

    <div class="highlight-box" style="margin-top: 24px;">
      <h4 style="color: #0369a1; font-size: 14px; margin-bottom: 8px;">🛡️ Conseils de sécurité</h4>
      <ul style="color: #4b5563; font-size: 13px; padding-left: 20px; margin: 0;">
        <li>Utilisez un mot de passe unique et complexe</li>
        <li>Ne partagez jamais votre mot de passe</li>
        <li>Activez la double authentification si disponible</li>
      </ul>
    </div>
  `;

  const msg = {
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: '🔐 Réinitialisation de mot de passe - KOLO',
    html: getEmailTemplate(content, `${userName}, voici le lien pour réinitialiser votre mot de passe KOLO.`)
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Password reset email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Password reset email failed:', error);
    throw error;
  }
}

/**
 * Envoie un email de test
 */
async function sendTestEmail(to) {
  const content = `
    <h1 class="greeting">Test Email KOLO 🧪</h1>
    <p class="content">Ceci est un email de test pour vérifier que la configuration SendGrid fonctionne correctement.</p>
    
    <div class="success-box">
      <h3 style="color: #059669; font-size: 16px; margin-bottom: 8px;">✅ Configuration réussie !</h3>
      <p style="color: #065f46; font-size: 14px;">
        Si vous recevez cet email, votre service d'envoi d'emails est correctement configuré.
      </p>
    </div>

    <div class="highlight-box">
      <h4 style="color: #0369a1; font-size: 14px; margin-bottom: 8px;">📊 Informations techniques</h4>
      <div class="detail-row">
        <span class="detail-label">Date d'envoi</span>
        <span class="detail-value">${new Date().toLocaleString('fr-FR')}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Service</span>
        <span class="detail-value">SendGrid</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Environnement</span>
        <span class="detail-value">${process.env.NODE_ENV || 'development'}</span>
      </div>
    </div>
  `;

  const msg = {
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: '🧪 Test Email - KOLO | Koma Propriétaire',
    html: getEmailTemplate(content, 'Ceci est un email de test de la plateforme KOLO.')
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Test email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Test email failed:', error);
    throw error;
  }
}

module.exports = {
  sendPurchaseConfirmation,
  sendWinnerNotification,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTestEmail
};
