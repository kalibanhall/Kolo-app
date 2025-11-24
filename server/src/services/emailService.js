const nodemailer = require('nodemailer');

// Configuration du transporteur email
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Configuration pour production (ex: Gmail, SendGrid, etc.)
    return nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else {
    // Configuration pour développement (Ethereal Email - emails de test)
    return nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.EMAIL_USER || 'ethereal.user@ethereal.email',
        pass: process.env.EMAIL_PASSWORD || 'ethereal_password'
      }
    });
  }
};

/**
 * Envoie un email de confirmation d'achat avec facture
 * @param {object} options - Options d'envoi
 * @param {string} options.to - Email du destinataire
 * @param {string} options.userName - Nom de l'utilisateur
 * @param {number} options.ticketCount - Nombre de tickets achetés
 * @param {array} options.ticketNumbers - Numéros de tickets
 * @param {number} options.totalAmount - Montant total
 * @param {string} options.campaignTitle - Titre de la campagne
 * @param {Buffer} options.pdfAttachment - Buffer du PDF de la facture
 */
async function sendPurchaseConfirmation(options) {
  const { to, userName, ticketCount, ticketNumbers, totalAmount, campaignTitle, pdfAttachment, invoiceNumber } = options;

  const transporter = createTransporter();

  const mailOptions = {
    from: `"KOLO Tombola" <${process.env.EMAIL_USER || 'no-reply@kolo.cd'}>`,
    to,
    subject: '🎉 Achat confirmé - Vos tickets KOLO',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .ticket-box { background: white; border: 2px dashed #4f46e5; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .ticket-number { display: inline-block; background: #e0e7ff; color: #4f46e5; padding: 8px 16px; margin: 5px; border-radius: 5px; font-weight: bold; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎊 Félicitations ${userName} !</h1>
            <p>Votre achat a été confirmé avec succès</p>
          </div>
          <div class="content">
            <p>Bonjour <strong>${userName}</strong>,</p>
            <p>Nous sommes ravis de vous confirmer l'achat de vos tickets pour la tombola <strong>${campaignTitle}</strong>.</p>
            
            <div class="ticket-box">
              <h3>📋 Détails de votre achat</h3>
              <p><strong>Nombre de tickets :</strong> ${ticketCount}</p>
              <p><strong>Montant total :</strong> ${totalAmount} $</p>
              <p><strong>Numéro de facture :</strong> ${invoiceNumber}</p>
              
              <h4>🎟️ Vos numéros de tickets :</h4>
              <div>
                ${ticketNumbers.map(num => `<span class="ticket-number">${num}</span>`).join('')}
              </div>
            </div>

            <p>✅ Votre facture est jointe à cet email en pièce jointe.</p>
            <p>🍀 <strong>Bonne chance pour le tirage au sort !</strong></p>

            <p style="margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile" class="button">
                Voir mes tickets
              </a>
            </p>
          </div>
          <div class="footer">
            <p>KOLO - Tombola Digitale</p>
            <p>contact@kolo.cd | +243 841 209 627</p>
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    attachments: pdfAttachment ? [
      {
        filename: `facture-${invoiceNumber}.pdf`,
        content: pdfAttachment,
        contentType: 'application/pdf'
      }
    ] : []
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
}

/**
 * Envoie un email de notification de gain
 * @param {object} options - Options d'envoi
 */
async function sendWinnerNotification(options) {
  const { to, userName, prize, ticketNumber, campaignTitle } = options;

  const transporter = createTransporter();

  const mailOptions = {
    from: `"KOLO Tombola" <${process.env.EMAIL_USER || 'no-reply@kolo.cd'}>`,
    to,
    subject: '🏆 FÉLICITATIONS ! Vous avez gagné !',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fffbeb; padding: 30px; border-radius: 0 0 10px 10px; }
          .prize-box { background: white; border: 3px solid #f59e0b; padding: 30px; margin: 20px 0; border-radius: 8px; text-align: center; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉🎉🎉 VOUS AVEZ GAGNÉ ! 🎉🎉🎉</h1>
          </div>
          <div class="content">
            <p>Cher(e) <strong>${userName}</strong>,</p>
            <p>Nous avons le plaisir de vous annoncer une EXCELLENTE nouvelle !</p>
            
            <div class="prize-box">
              <h2 style="color: #f59e0b; margin: 0;">🏆 ${prize}</h2>
              <p style="font-size: 18px; margin: 20px 0;">Ticket gagnant: <strong>${ticketNumber}</strong></p>
              <p>Campagne: ${campaignTitle}</p>
            </div>

            <p><strong>Félicitations !</strong> Votre ticket a été tiré au sort et vous êtes officiellement gagnant(e) !</p>
            
            <p>📞 <strong>Prochaines étapes :</strong></p>
            <ul>
              <li>Notre équipe vous contactera sous 48h au numéro enregistré</li>
              <li>Nous vérifierons votre identité</li>
              <li>Nous organiserons la remise de votre lot</li>
            </ul>

            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile" class="button">
                Voir mes gains
              </a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Winner notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Winner notification failed:', error);
    throw error;
  }
}

/**
 * Envoie un email de vérification
 * @param {object} options - Options d'envoi
 */
async function sendVerificationEmail(options) {
  const { to, userName, verificationToken } = options;

  const transporter = createTransporter();
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;

  const mailOptions = {
    from: `"KOLO Tombola" <${process.env.EMAIL_USER || 'no-reply@kolo.cd'}>`,
    to,
    subject: '✉️ Vérifiez votre adresse email - KOLO',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✉️ Vérification Email</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${userName}</strong>,</p>
            <p>Merci de vous être inscrit sur KOLO ! Pour activer votre compte, veuillez vérifier votre adresse email.</p>
            
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">
                Vérifier mon email
              </a>
            </p>

            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
              Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur:<br>
              <a href="${verificationUrl}" style="color: #4f46e5; word-break: break-all;">${verificationUrl}</a>
            </p>

            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
              Ce lien expire dans 24 heures.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Verification email failed:', error);
    throw error;
  }
}

/**
 * Envoie un email de réinitialisation de mot de passe
 * @param {object} options - Options d'envoi
 */
async function sendPasswordResetEmail(options) {
  const { to, userName, resetToken } = options;

  const transporter = createTransporter();
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

  const mailOptions = {
    from: `"KOLO Tombola" <${process.env.EMAIL_USER || 'no-reply@kolo.cd'}>`,
    to,
    subject: '🔐 Réinitialisation de mot de passe - KOLO',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fef2f2; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #ef4444; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .warning { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Réinitialisation Mot de Passe</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${userName}</strong>,</p>
            <p>Vous avez demandé à réinitialiser votre mot de passe KOLO.</p>
            
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">
                Réinitialiser mon mot de passe
              </a>
            </p>

            <div class="warning">
              <strong>⚠️ Important:</strong> Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel reste sécurisé.
            </div>

            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
              Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur:<br>
              <a href="${resetUrl}" style="color: #ef4444; word-break: break-all;">${resetUrl}</a>
            </p>

            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
              Ce lien expire dans 1 heure.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Password reset email failed:', error);
    throw error;
  }
}

module.exports = {
  sendPurchaseConfirmation,
  sendWinnerNotification,
  sendVerificationEmail,
  sendPasswordResetEmail
};
