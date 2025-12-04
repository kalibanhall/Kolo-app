const express = require('express');
const { body, validationResult } = require('express-validator');
const sgMail = require('@sendgrid/mail');
const { contactLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'support@kolo.cd';
const FROM_NAME = process.env.FROM_NAME || 'KOLO Tombola';
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'support@kolo.cd';

// POST /api/contact - Send contact form message
router.post(
  '/',
  contactLimiter,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Le nom est requis')
      .isLength({ min: 2, max: 100 })
      .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('L\'email est requis')
      .isEmail()
      .withMessage('Email invalide')
      .normalizeEmail(),
    body('phone')
      .optional()
      .trim()
      .matches(/^(\+243|0)?[0-9]{9}$/)
      .withMessage('Numéro de téléphone invalide'),
    body('subject')
      .trim()
      .notEmpty()
      .withMessage('Le sujet est requis')
      .isLength({ min: 5, max: 200 })
      .withMessage('Le sujet doit contenir entre 5 et 200 caractères'),
    body('message')
      .trim()
      .notEmpty()
      .withMessage('Le message est requis')
      .isLength({ min: 20, max: 2000 })
      .withMessage('Le message doit contenir entre 20 et 2000 caractères'),
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array(),
        });
      }

      const { name, email, phone, subject, message } = req.body;

      // Create email for admin
      const adminMsg = {
        to: CONTACT_EMAIL,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        replyTo: email,
        subject: `[KOLO Contact] ${subject}`,
        text: `
Nouveau message de contact KOLO

De: ${name}
Email: ${email}
Téléphone: ${phone || 'Non fourni'}

Sujet: ${subject}

Message:
${message}

---
Envoyé depuis le formulaire de contact KOLO
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: white;
      font-size: 28px;
      font-weight: bold;
    }
    .content {
      padding: 30px;
    }
    .badge {
      display: inline-block;
      background: #F3F4F6;
      color: #6B7280;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 10px;
    }
    .field {
      margin-bottom: 20px;
    }
    .field-label {
      font-weight: 600;
      color: #6B7280;
      font-size: 14px;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .field-value {
      color: #111827;
      font-size: 16px;
      padding: 10px;
      background: #F9FAFB;
      border-radius: 6px;
      border-left: 3px solid #8B5CF6;
    }
    .message-box {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .footer {
      background: #F3F4F6;
      padding: 20px;
      text-align: center;
      font-size: 13px;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📬 Nouveau message de contact</h1>
    </div>
    <div class="content">
      <div class="badge">KOLO Tombola - Formulaire de Contact</div>
      
      <div class="field">
        <div class="field-label">Nom</div>
        <div class="field-value">${name}</div>
      </div>

      <div class="field">
        <div class="field-label">Email</div>
        <div class="field-value"><a href="mailto:${email}" style="color: #8B5CF6; text-decoration: none;">${email}</a></div>
      </div>

      ${
        phone
          ? `
      <div class="field">
        <div class="field-label">Téléphone</div>
        <div class="field-value">${phone}</div>
      </div>
      `
          : ''
      }

      <div class="field">
        <div class="field-label">Sujet</div>
        <div class="field-value">${subject}</div>
      </div>

      <div class="field">
        <div class="field-label">Message</div>
        <div class="message-box">${message}</div>
      </div>
    </div>
    <div class="footer">
      Ce message a été envoyé depuis le formulaire de contact KOLO.<br>
      Pour répondre, cliquez sur "Répondre" ou envoyez un email à <a href="mailto:${email}" style="color: #8B5CF6;">${email}</a>
    </div>
  </div>
</body>
</html>
        `,
      };

      // Create confirmation email for user
      const userMsg = {
        to: email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        subject: 'Confirmation de réception de votre message - KOLO',
        text: `
Bonjour ${name},

Nous avons bien reçu votre message concernant "${subject}".

Notre équipe le traitera dans les plus brefs délais et vous répondra par email à l'adresse ${email}.

Message reçu:
${message}

Merci de votre intérêt pour KOLO Tombola !

---
L'équipe KOLO
support@kolo.cd
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
      padding: 40px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 10px 0;
      color: white;
      font-size: 32px;
      font-weight: bold;
    }
    .header p {
      margin: 0;
      color: rgba(255, 255, 255, 0.9);
      font-size: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .content p {
      margin: 0 0 15px 0;
      color: #374151;
      font-size: 16px;
    }
    .highlight-box {
      background: #F3F4F6;
      border-left: 4px solid #8B5CF6;
      padding: 20px;
      margin: 20px 0;
      border-radius: 6px;
    }
    .highlight-box strong {
      color: #8B5CF6;
    }
    .footer {
      background: #F9FAFB;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #E5E7EB;
    }
    .footer p {
      margin: 5px 0;
      color: #6B7280;
      font-size: 14px;
    }
    .footer a {
      color: #8B5CF6;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Message reçu !</h1>
      <p>Merci de nous avoir contactés</p>
    </div>
    <div class="content">
      <p>Bonjour <strong>${name}</strong>,</p>
      
      <p>Nous avons bien reçu votre message et vous en remercions. Notre équipe le traitera dans les plus brefs délais.</p>
      
      <div class="highlight-box">
        <strong>Sujet :</strong> ${subject}<br>
        <strong>Email de contact :</strong> ${email}
      </div>
      
      <p>Vous recevrez une réponse par email dès que possible. En attendant, n'hésitez pas à explorer nos campagnes de tombola en cours !</p>
      
      <p style="margin-top: 30px;">À très bientôt,<br><strong>L'équipe KOLO</strong></p>
    </div>
    <div class="footer">
      <p><strong>KOLO Tombola</strong></p>
      <p>Email: <a href="mailto:support@kolo.cd">support@kolo.cd</a></p>
      <p>Répondez simplement à cet email si vous avez des questions supplémentaires.</p>
    </div>
  </div>
</body>
</html>
        `,
      };

      // Send both emails
      await Promise.all([sgMail.send(adminMsg), sgMail.send(userMsg)]);

      console.log(`✅ Contact form submitted by ${name} (${email})`);

      res.status(200).json({
        success: true,
        message: 'Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.',
      });
    } catch (error) {
      console.error('❌ Error sending contact form:', error);

      // Handle SendGrid specific errors
      if (error.response) {
        console.error('SendGrid error:', error.response.body);
      }

      res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors de l\'envoi de votre message. Veuillez réessayer.',
      });
    }
  }
);

module.exports = router;
