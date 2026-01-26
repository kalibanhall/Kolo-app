const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { generateTicketNumber, generateInvoiceNumber } = require('../utils/helpers');
const { sendPurchaseConfirmation } = require('../services/emailService');
const { generateInvoicePDF } = require('../services/pdfGenerator');
const { sendPurchaseConfirmationSMS } = require('../services/africasTalking');
const { uploadPDF } = require('../services/cloudinaryService');
const router = express.Router();

// Helper function to generate tickets for a completed purchase
async function generateTicketsForPurchase(purchaseId) {
  console.log(`🎫 generateTicketsForPurchase called for purchase ${purchaseId}`);
  
  // First check if tickets already exist for this purchase
  const existingTickets = await query(
    'SELECT COUNT(*) as count FROM tickets WHERE purchase_id = $1',
    [purchaseId]
  );
  
  if (parseInt(existingTickets.rows[0].count) > 0) {
    console.log(`⚠️ Tickets already exist for purchase ${purchaseId}, skipping generation`);
    return { alreadyExists: true };
  }
  
  // Get purchase details
  const purchaseResult = await query(
    `SELECT p.*, c.total_tickets, c.sold_tickets 
     FROM purchases p
     JOIN campaigns c ON p.campaign_id = c.id
     WHERE p.id = $1`,
    [purchaseId]
  );
  
  if (purchaseResult.rows.length === 0) {
    throw new Error(`Purchase ${purchaseId} not found`);
  }
  
  const purchase = purchaseResult.rows[0];
  
  return await transaction(async (client) => {
    // Lock campaign row for update and get ticket_prefix
    const campaignResult = await client.query(
      'SELECT total_tickets, sold_tickets, ticket_prefix FROM campaigns WHERE id = $1 FOR UPDATE',
      [purchase.campaign_id]
    );
    const campaign = campaignResult.rows[0];
    const totalTickets = campaign?.total_tickets || 1000;
    const padLength = Math.max(2, String(totalTickets).length);
    const ticketPrefix = campaign?.ticket_prefix || 'X'; // Default to 'X' if no prefix
    
    // Get the highest existing ticket number for THIS campaign (using prefix)
    const maxTicketResult = await client.query(
      `SELECT MAX(CAST(REGEXP_REPLACE(ticket_number, '[^0-9]', '', 'g') AS INTEGER)) as max_num 
       FROM tickets 
       WHERE campaign_id = $1`,
      [purchase.campaign_id]
    );
    const maxExistingNumber = parseInt(maxTicketResult.rows[0]?.max_num) || 0;
    
    // Start from highest of: max existing or sold_tickets
    const startingNumber = Math.max(maxExistingNumber, parseInt(campaign?.sold_tickets) || 0);
    console.log(`🎫 Campaign ${purchase.campaign_id} (prefix: K${ticketPrefix}) - Starting from ${startingNumber + 1}`);
    
    // Generate unique ticket numbers using campaign prefix
    const tickets = [];
    for (let i = 0; i < purchase.ticket_count; i++) {
      const ticketSequence = startingNumber + i + 1;
      const ticketNumber = `K${ticketPrefix}-${String(ticketSequence).padStart(padLength, '0')}`;
      
      const ticketResult = await client.query(
        `INSERT INTO tickets (
          ticket_number, campaign_id, user_id, purchase_id, status
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [ticketNumber, purchase.campaign_id, purchase.user_id, purchase.id, 'active']
      );
      tickets.push(ticketResult.rows[0]);
    }
    
    // Update campaign sold_tickets count
    await client.query(
      `UPDATE campaigns 
       SET sold_tickets = sold_tickets + $1 
       WHERE id = $2`,
      [purchase.ticket_count, purchase.campaign_id]
    );
    
    // Check if campaign is now sold out
    const campaignCheck = await client.query(
      `SELECT id, sold_tickets, total_tickets, status 
       FROM campaigns WHERE id = $1`,
      [purchase.campaign_id]
    );
    
    const currentCampaign = campaignCheck.rows[0];
    if (currentCampaign && 
        currentCampaign.sold_tickets >= currentCampaign.total_tickets &&
        currentCampaign.status === 'open') {
      await client.query(
        `UPDATE campaigns 
         SET status = 'closed', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [purchase.campaign_id]
      );
      console.log(`🎯 Campaign ${purchase.campaign_id} automatically closed - sold out!`);
    }
    
    // Generate invoice
    const invoiceNumber = generateInvoiceNumber();
    await client.query(
      `INSERT INTO invoices (
        purchase_id, user_id, invoice_number, amount, sent_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [purchase.id, purchase.user_id, invoiceNumber, purchase.total_amount]
    );
    
    // Create notification for user
    await client.query(
      `INSERT INTO notifications (
        user_id, type, title, message, data
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        purchase.user_id,
        'purchase_confirmation',
        'Achat confirmé !',
        `Vos ${purchase.ticket_count} ticket(s) ont été générés avec succès.`,
        JSON.stringify({
          purchase_id: purchase.id,
          ticket_numbers: tickets.map(t => t.ticket_number),
        }),
      ]
    );
    
    console.log(`✅ Generated ${tickets.length} tickets for purchase ${purchaseId}:`, 
      tickets.map(t => t.ticket_number));
    
    return { tickets, invoiceNumber };
  });
}

// Get payment status
router.get('/status/:purchaseId', verifyToken, async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.purchaseId);

    const result = await query(
      `SELECT id, payment_status, transaction_id, total_amount, 
              payment_provider, created_at, completed_at
       FROM purchases
       WHERE id = $1 AND user_id = $2`,
      [purchaseId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Get user payments history
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Users can only see their own payments unless they're admin
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const result = await query(
      `SELECT p.*, c.title as campaign_title,
              (SELECT COUNT(*) FROM tickets WHERE purchase_id = p.id) as tickets_count
       FROM purchases p
       JOIN campaigns c ON p.campaign_id = c.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// CRITICAL: Payment webhook from Africa's Talking
// This is where tickets are ACTUALLY generated after payment confirmation
router.post('/webhook', async (req, res) => {
  try {
    console.log('Payment webhook received:', JSON.stringify(req.body, null, 2));

    // Log webhook for debugging
    await query(
      `INSERT INTO payment_webhooks (provider, payload, headers, transaction_id, status, processed)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'AfricasTalking',
        JSON.stringify(req.body),
        JSON.stringify(req.headers),
        req.body.transactionId || req.body.transaction_id,
        req.body.status,
        false,
      ]
    );

    // Verify webhook authenticity (check signature if available)
    // In production, verify the webhook signature from Africa's Talking
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const signature = req.headers['x-webhook-signature'];

    // For development, we'll skip signature verification
    if (process.env.NODE_ENV === 'production' && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }
    }

    const { transactionId, status, value, phoneNumber } = req.body;
    const transaction_id = transactionId || req.body.transaction_id;
    const payment_status = status === 'Success' ? 'completed' : 'failed';

    // Find the purchase by transaction ID
    const purchaseResult = await query(
      `SELECT id, user_id, campaign_id, ticket_count, total_amount, payment_status
       FROM purchases
       WHERE transaction_id = $1`,
      [transaction_id]
    );

    if (purchaseResult.rows.length === 0) {
      console.error('Purchase not found for transaction:', transaction_id);
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    const purchase = purchaseResult.rows[0];

    // If already processed, return success
    if (purchase.payment_status === 'completed') {
      return res.json({ success: true, message: 'Already processed' });
    }

    // If payment successful, generate tickets
    if (payment_status === 'completed') {
      const ticketData = await transaction(async (client) => {
        // Get campaign info for ticket number format - lock row for update
        const campaignResult = await client.query(
          'SELECT total_tickets, sold_tickets FROM campaigns WHERE id = $1 FOR UPDATE',
          [purchase.campaign_id]
        );
        const campaign = campaignResult.rows[0];
        const totalTickets = campaign?.total_tickets || 1000;
        const currentSoldTickets = parseInt(campaign?.sold_tickets || 0);
        const padLength = Math.max(2, String(totalTickets).length);
        
        // Update purchase status
        await client.query(
          `UPDATE purchases 
           SET payment_status = $1, completed_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          ['completed', purchase.id]
        );

        // Generate unique ticket numbers using sequential campaign-based numbering
        const tickets = [];
        for (let i = 0; i < purchase.ticket_count; i++) {
          // Use campaign's sold_tickets + offset for sequential numbering
          const ticketSequence = currentSoldTickets + i + 1;
          const ticketNumber = `K-${String(ticketSequence).padStart(padLength, '0')}`;
          
          const ticketResult = await client.query(
            `INSERT INTO tickets (
              ticket_number, campaign_id, user_id, purchase_id, status
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [ticketNumber, purchase.campaign_id, purchase.user_id, purchase.id, 'active']
          );

          tickets.push(ticketResult.rows[0]);
        }

        // Update campaign sold_tickets count
        await client.query(
          `UPDATE campaigns 
           SET sold_tickets = sold_tickets + $1 
           WHERE id = $2`,
          [purchase.ticket_count, purchase.campaign_id]
        );

        // Check if campaign is now sold out and close it automatically
        const campaignCheck = await client.query(
          `SELECT id, sold_tickets, total_tickets, status 
           FROM campaigns 
           WHERE id = $1`,
          [purchase.campaign_id]
        );

        const currentCampaign = campaignCheck.rows[0];
        if (
          currentCampaign &&
          currentCampaign.sold_tickets >= currentCampaign.total_tickets &&
          currentCampaign.status === 'open'
        ) {
          await client.query(
            `UPDATE campaigns 
             SET status = 'closed', updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [purchase.campaign_id]
          );
          console.log(
            `🎯 Campaign ${purchase.campaign_id} automatically closed - all tickets sold out!`
          );
        }

        // Generate invoice
        const invoiceNumber = generateInvoiceNumber();
        await client.query(
          `INSERT INTO invoices (
            purchase_id, user_id, invoice_number, amount, sent_at
          ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
          [purchase.id, purchase.user_id, invoiceNumber, purchase.total_amount]
        );

        // Create notification for user
        await client.query(
          `INSERT INTO notifications (
            user_id, type, title, message, data
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            purchase.user_id,
            'purchase_confirmation',
            'Achat confirmé !',
            `Vos ${purchase.ticket_count} ticket(s) ont été générés avec succès.`,
            JSON.stringify({
              purchase_id: purchase.id,
              ticket_numbers: tickets.map((t) => t.ticket_number),
            }),
          ]
        );

        console.log(`✅ Successfully processed payment for purchase ${purchase.id}`);
        console.log(
          `Generated ${tickets.length} tickets:`,
          tickets.map((t) => t.ticket_number)
        );

        // Return ticket data for later use
        return {
          tickets,
          invoiceNumber,
          ticketNumbers: tickets.map((t) => t.ticket_number),
        };
      });

      // Get user and campaign info for email
      const purchaseDetailsResult = await query(
        `SELECT p.*, u.name as user_name, u.email as user_email, 
                c.title as campaign_title
         FROM purchases p
         JOIN users u ON p.user_id = u.id
         JOIN campaigns c ON p.campaign_id = c.id
         WHERE p.id = $1`,
        [purchase.id]
      );

      const purchaseDetails = purchaseDetailsResult.rows[0];

      // Generate PDF invoice
      try {
        console.log('📄 Generating invoice PDF...');
        const pdfDoc = await generateInvoicePDF(purchase.id);

        // Convert PDF to buffer for email attachment
        const pdfBuffer = await new Promise((resolve, reject) => {
          const buffers = [];
          pdfDoc.on('data', buffers.push.bind(buffers));
          pdfDoc.on('end', () => resolve(Buffer.concat(buffers)));
          pdfDoc.on('error', reject);
          pdfDoc.end();
        });

        // Upload PDF to Cloudinary
        let pdfUrl = null;
        try {
          console.log('☁️ Uploading PDF to Cloudinary...');
          const uploadResult = await uploadPDF(
            pdfBuffer,
            `invoice-${ticketData.invoiceNumber}`,
            'kolo/invoices'
          );
          pdfUrl = uploadResult.url;
          console.log('✅ PDF uploaded to Cloudinary:', pdfUrl);

          // Update invoice with PDF URL
          await query(`UPDATE invoices SET pdf_url = $1 WHERE purchase_id = $2`, [
            pdfUrl,
            purchase.id,
          ]);
        } catch (uploadError) {
          console.error('❌ Error uploading PDF to Cloudinary:', uploadError);
          // Don't fail the process if Cloudinary upload fails
        }

        // Send confirmation email with PDF
        console.log('📧 Sending purchase confirmation email...');
        await sendPurchaseConfirmation({
          to: purchaseDetails.user_email,
          userName: purchaseDetails.user_name,
          ticketCount: purchaseDetails.ticket_count,
          ticketNumbers: ticketData.ticketNumbers,
          totalAmount: purchaseDetails.total_amount,
          campaignTitle: purchaseDetails.campaign_title,
          pdfAttachment: pdfBuffer,
          invoiceNumber: ticketData.invoiceNumber,
        });

        console.log('✅ Email sent successfully');
      } catch (emailError) {
        console.error('❌ Error sending email or generating PDF:', emailError);
        // Don't fail the whole process if email fails
      }

      // Send SMS confirmation
      try {
        console.log('📱 Sending SMS confirmation...');
        await sendPurchaseConfirmationSMS(
          purchaseDetails.phone_number,
          purchaseDetails.user_name,
          purchaseDetails.ticket_count,
          ticketData.ticketNumbers
        );
        console.log('✅ SMS sent successfully');
      } catch (smsError) {
        console.error('❌ Error sending SMS:', smsError);
        // Don't fail the whole process if SMS fails
      }

      // Mark webhook as processed
      await query(
        `UPDATE payment_webhooks 
         SET processed = true, processed_at = CURRENT_TIMESTAMP 
         WHERE transaction_id = $1`,
        [transaction_id]
      );

      res.json({
        success: true,
        message: 'Payment processed and tickets generated',
      });
    } else {
      // Payment failed
      await query(
        `UPDATE purchases 
         SET payment_status = $1 
         WHERE id = $2`,
        ['failed', purchase.id]
      );

      res.json({
        success: true,
        message: 'Payment failed, purchase marked as failed',
      });
    }
  } catch (error) {
    console.error('Payment webhook error:', error);

    // Log error in webhook table
    const transaction_id = req.body.transactionId || req.body.transaction_id;
    if (transaction_id) {
      await query(
        `UPDATE payment_webhooks 
         SET error_message = $1 
         WHERE transaction_id = $2`,
        [error.message, transaction_id]
      );
    }

    res.status(500).json({
      success: false,
      message: 'Server error processing webhook',
    });
  }
});

// SIMULATION ROUTE - Simulate a successful payment (for testing)
router.post('/simulate/:purchaseId', verifyToken, async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.purchaseId);

    await transaction(async (client) => {
      // Get purchase details
      const purchaseResult = await client.query(
        `SELECT p.*, c.sold_tickets, c.total_tickets
         FROM purchases p
         JOIN campaigns c ON p.campaign_id = c.id
         WHERE p.id = $1`,
        [purchaseId]
      );

      if (purchaseResult.rows.length === 0) {
        throw new Error('Purchase not found');
      }

      const purchase = purchaseResult.rows[0];

      // Check if already completed
      if (purchase.payment_status === 'completed') {
        throw new Error('Payment already completed');
      }

      // Check ticket availability
      const availableTickets = purchase.total_tickets - purchase.sold_tickets;
      if (availableTickets < purchase.ticket_count) {
        throw new Error('Not enough tickets available');
      }

      // Update purchase to completed
      const transactionId = `SIM-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      await client.query(
        `UPDATE purchases 
         SET payment_status = 'completed',
             transaction_id = $1,
             payment_provider = 'SIMULATION',
             completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [transactionId, purchaseId]
      );

      // Generate tickets using sequential campaign-based numbering
      const tickets = [];
      const totalTickets = parseInt(purchase.total_tickets) || 100;
      const currentSoldTickets = parseInt(purchase.sold_tickets);
      const padLength = Math.max(2, String(totalTickets).length);
      
      for (let i = 0; i < purchase.ticket_count; i++) {
        // Use campaign's sold_tickets + offset for sequential numbering
        const ticketSequence = currentSoldTickets + i + 1;
        const ticketNumber = `K-${String(ticketSequence).padStart(padLength, '0')}`;
        
        const ticketResult = await client.query(
          `INSERT INTO tickets (ticket_number, campaign_id, user_id, purchase_id, status)
           VALUES ($1, $2, $3, $4, 'active')
           RETURNING *`,
          [ticketNumber, purchase.campaign_id, purchase.user_id, purchaseId]
        );

        tickets.push(ticketResult.rows[0]);
      }

      // Update campaign sold tickets
      await client.query(
        `UPDATE campaigns 
         SET sold_tickets = sold_tickets + $1
         WHERE id = $2`,
        [purchase.ticket_count, purchase.campaign_id]
      );

      // Check if campaign is now sold out and close it automatically
      const campaignCheck = await client.query(
        `SELECT id, sold_tickets, total_tickets, status 
         FROM campaigns 
         WHERE id = $1`,
        [purchase.campaign_id]
      );

      const currentCampaign = campaignCheck.rows[0];
      if (
        currentCampaign &&
        currentCampaign.sold_tickets >= currentCampaign.total_tickets &&
        currentCampaign.status === 'open'
      ) {
        await client.query(
          `UPDATE campaigns 
           SET status = 'closed', updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [purchase.campaign_id]
        );
        console.log(
          `🎯 Campaign ${purchase.campaign_id} automatically closed - all tickets sold out!`
        );
      }

      // Generate invoice
      const invoiceNumber = generateInvoiceNumber();
      await client.query(
        `INSERT INTO invoices (purchase_id, user_id, invoice_number, amount)
         VALUES ($1, $2, $3, $4)`,
        [purchaseId, purchase.user_id, invoiceNumber, purchase.total_amount]
      );

      // Create notification
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          purchase.user_id,
          'purchase_confirmation',
          '🎉 Achat confirmé !',
          `Vos ${purchase.ticket_count} ticket(s) ont été générés avec succès.`,
          JSON.stringify({
            purchase_id: purchaseId,
            ticket_count: purchase.ticket_count,
            tickets: tickets.map((t) => t.ticket_number),
          }),
        ]
      );

      // Send Firebase push notification
      try {
        const {
          notifyTicketPurchase,
          isInitialized,
        } = require('../services/firebaseNotifications');
        if (isInitialized()) {
          await notifyTicketPurchase(
            purchase.user_id,
            purchase.ticket_count,
            purchase.campaign_name || 'la tombola'
          );
        }
      } catch (firebaseError) {
        console.error('Firebase notification error:', firebaseError);
        // Don't fail the request if push notification fails
      }

      res.json({
        success: true,
        message: 'Payment simulated successfully',
        data: {
          purchase_id: purchaseId,
          transaction_id: transactionId,
          tickets: tickets.map((t) => ({
            id: t.id,
            ticket_number: t.ticket_number,
          })),
        },
      });
    });
  } catch (error) {
    console.error('Simulate payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
});

// Get user invoices
router.get('/invoices', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await query(
      `SELECT i.id, i.invoice_number, i.amount, i.pdf_url, i.sent_at, i.created_at,
              p.ticket_count, c.title as campaign_title
       FROM invoices i
       JOIN purchases p ON i.purchase_id = p.id
       JOIN campaigns c ON p.campaign_id = c.id
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) as count FROM invoices WHERE user_id = $1', [
      userId,
    ]);

    res.json({
      success: true,
      data: {
        invoices: result.rows,
        total_count: parseInt(countResult.rows[0].count),
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Get specific invoice
router.get('/invoices/:invoiceId', verifyToken, async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.invoiceId);
    const userId = req.user.id;

    const result = await query(
      `SELECT i.*, p.ticket_count, c.title as campaign_title
       FROM invoices i
       JOIN purchases p ON i.purchase_id = p.id
       JOIN campaigns c ON p.campaign_id = c.id
       WHERE i.id = $1 AND i.user_id = $2`,
      [invoiceId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============================================================================
// PayDRC (Moko Afrika) Integration Routes
// ============================================================================

const paydrc = require('../services/paydrc');

/**
 * Initiate PayDRC PayIn (C2B) - Collect payment from customer
 * POST /api/payments/paydrc/initiate
 */
router.post(
  '/paydrc/initiate',
  verifyToken,
  [
    body('campaign_id').isInt({ min: 1 }),
    body('ticket_count').isInt({ min: 1, max: 1000 }),
    body('phone_number').notEmpty().trim(),
    body('currency').optional().isIn(['USD', 'CDF']),
    body('amount').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array(),
        });
      }

      const { campaign_id, ticket_count, phone_number, currency: requestedCurrency, amount: requestedAmount } = req.body;
      const user_id = req.user.id;

      // Get user details
      const userResult = await query(
        'SELECT id, name, email, phone FROM users WHERE id = $1',
        [user_id]
      );
      const user = userResult.rows[0];

      // Check campaign exists and is open
      const campaignResult = await query(
        `SELECT id, title, status, total_tickets, sold_tickets, ticket_price
       FROM campaigns WHERE id = $1`,
        [campaign_id]
      );

      if (campaignResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Campagne non trouvée',
        });
      }

      const campaign = campaignResult.rows[0];
      
      // Use currency from frontend request, fallback to USD
      const currency = requestedCurrency || 'USD';

      if (campaign.status !== 'open') {
        return res.status(400).json({
          success: false,
          message: "Cette campagne n'est plus ouverte aux achats",
        });
      }

      // Check ticket availability
      if (campaign.sold_tickets + ticket_count > campaign.total_tickets) {
        return res.status(400).json({
          success: false,
          message: 'Pas assez de tickets disponibles',
        });
      }

      // Use amount from frontend if provided, otherwise calculate
      // Frontend sends: USD = price in $, CDF = price * 2850
      const total_amount = requestedAmount || (currency === 'CDF' 
        ? campaign.ticket_price * ticket_count * 2850 
        : campaign.ticket_price * ticket_count);

      // Normalize phone and detect provider
      const normalizedPhone = paydrc.normalizePhoneNumber(phone_number);
      const provider = paydrc.detectMobileProvider(normalizedPhone);

      // Generate unique reference for this transaction
      const reference = `KOLO-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

      // Create pending purchase record
      // Try to insert with currency first, fallback to without if column doesn't exist
      let purchaseResult;
      try {
        purchaseResult = await query(
          `INSERT INTO purchases (
          user_id, campaign_id, ticket_count, total_amount, currency,
          phone_number, payment_provider, payment_status, transaction_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
          [
            user_id,
            campaign_id,
            ticket_count,
            total_amount,
            currency,
            normalizedPhone,
            `PayDRC-${provider}`,
            'pending',
            reference,
          ]
        );
      } catch (err) {
        // Fallback: currency column might not exist yet
        if (err.message && err.message.includes('currency')) {
          console.log('Currency column not found, inserting without it');
          purchaseResult = await query(
            `INSERT INTO purchases (
            user_id, campaign_id, ticket_count, total_amount,
            phone_number, payment_provider, payment_status, transaction_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
            [
              user_id,
              campaign_id,
              ticket_count,
              total_amount,
              normalizedPhone,
              `PayDRC-${provider}`,
              'pending',
              reference,
            ]
          );
        } else {
          throw err;
        }
      }

      const purchase = purchaseResult.rows[0];

      // Build callback URL
      const callbackUrl = `${
        process.env.API_URL || 'https://kolo-api.onrender.com'
      }/api/payments/paydrc/callback`;

      // Split user name into first and last name
      // Champs statiques pour PayDRC
      const firstName = 'Congohigh';
      const lastName = 'Technologie';

      // Initiate PayDRC transaction
      const paymentResponse = await paydrc.initiatePayIn({
        amount: total_amount,
        currency,
        customerNumber: normalizedPhone,
        firstName,
        lastName,
        email: user.email,
        reference,
        method: provider,
        callbackUrl,
      });

      if (paymentResponse.success) {
        // Purchase already has the correct transaction_id (reference)
        // PayDRC's transactionId is logged but we keep our reference for tracking
        console.log(`✅ PayDRC payment initiated for purchase ${purchase.id}, PayDRC ID: ${paymentResponse.transactionId}`);

        res.json({
          success: true,
          message: 'Paiement initié. Veuillez valider sur votre téléphone.',
          data: {
            purchase_id: purchase.id,
            reference,
            paydrc_transaction_id: paymentResponse.transactionId,
            status: 'pending',
            status_label: 'En attente de validation',
            amount: total_amount,
            currency,
            provider,
            ticket_count,
          },
        });
      } else {
        // Mark purchase as failed
        await query(`UPDATE purchases SET payment_status = 'failed' WHERE id = $1`, [purchase.id]);

        res.status(400).json({
          success: false,
          message: "Échec de l'initiation du paiement",
          error: paymentResponse.error || paymentResponse.comment || 'Unknown error',
        });
      }
    } catch (error) {
      console.error('PayDRC initiate error:', error);
      res.status(500).json({
        success: false,
        message: "Erreur serveur lors de l'initiation du paiement",
      });
    }
  }
);

/**
 * Check PayDRC transaction status
 * GET /api/payments/paydrc/status/:reference
 */
router.get('/paydrc/status/:reference', verifyToken, async (req, res) => {
  try {
    const { reference } = req.params;
    console.log('🔍 Status check for reference:', reference, 'user:', req.user.id);

    // Check our database first - search by transaction_id OR by LIKE match (in case reference was modified)
    const purchaseResult = await query(
      `SELECT p.*, c.title as campaign_title
       FROM purchases p
       JOIN campaigns c ON p.campaign_id = c.id
       WHERE (p.transaction_id = $1 OR p.transaction_id LIKE $3) AND p.user_id = $2`,
      [reference, req.user.id, `%${reference}%`]
    );
    
    console.log('📊 DB query returned', purchaseResult.rows.length, 'rows');

    if (purchaseResult.rows.length === 0) {
      console.log('❌ Transaction not found in DB for reference:', reference);
      return res.status(404).json({
        success: false,
        message: 'Transaction non trouvée',
      });
    }

    const purchase = purchaseResult.rows[0];
    console.log('✅ Found purchase:', purchase.id, 'status:', purchase.payment_status);

    // If already completed or failed, return cached status
    if (purchase.payment_status === 'completed' || purchase.payment_status === 'failed') {
      return res.json({
        success: true,
        data: {
          reference,
          status: purchase.payment_status,
          amount: purchase.total_amount,
          ticket_count: purchase.ticket_count,
          campaign_title: purchase.campaign_title,
        },
      });
    }

    // Query PayDRC for latest status
    console.log('🔍 Checking PayDRC status for reference:', reference);
    const statusResponse = await paydrc.checkTransactionStatus(reference);
    console.log('📥 PayDRC status response:', JSON.stringify(statusResponse, null, 2));

    if (statusResponse.success && statusResponse.found) {
      // Use normalized status for cleaner handling
      let newStatus = purchase.payment_status;
      const normalizedStatus = statusResponse.normalizedStatus || 'pending';
      
      console.log('📊 PayDRC Trans_Status:', statusResponse.transStatus, '-> Normalized:', normalizedStatus);
      
      if (normalizedStatus === 'completed') {
        newStatus = 'completed';
      } else if (normalizedStatus === 'failed') {
        newStatus = 'failed';
      }
      // 'submitted' means waiting for user validation - keep as pending but inform frontend

      // Update our database if status changed
      if (newStatus !== purchase.payment_status) {
        console.log('📝 Updating purchase status from', purchase.payment_status, 'to', newStatus);
        // Ensure purchase.id is an integer to avoid type mismatch
        const purchaseId = parseInt(purchase.id, 10);
        await query(
          `UPDATE purchases SET payment_status = $1::text, completed_at = CASE WHEN $1::text = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE id = $2::integer`,
          [newStatus, purchaseId]
        );

        // If completed, trigger ticket generation
        if (newStatus === 'completed') {
          console.log(`🎫 Purchase ${purchase.id} marked completed via status check - generating tickets...`);
          try {
            const result = await generateTicketsForPurchase(purchaseId);
            if (result.alreadyExists) {
              console.log(`ℹ️ Tickets already existed for purchase ${purchaseId}`);
            } else {
              console.log(`✅ Tickets generated successfully for purchase ${purchaseId}`);
            }
          } catch (ticketError) {
            console.error(`❌ Error generating tickets for purchase ${purchaseId}:`, ticketError);
            // Don't fail the request, just log the error
          }
        }
      }

      // Return detailed status to frontend
      return res.json({
        success: true,
        data: {
          reference,
          status: newStatus,
          paydrc_status: statusResponse.transStatus,
          paydrc_normalized: normalizedStatus,
          paydrc_description: statusResponse.transStatusDescription,
          // Add helpful message for user
          user_message: normalizedStatus === 'submitted' 
            ? 'En attente de validation sur votre téléphone. Veuillez entrer votre code PIN M-Pesa.'
            : normalizedStatus === 'pending'
            ? 'Transaction en cours de traitement...'
            : null,
          amount: purchase.total_amount,
          ticket_count: purchase.ticket_count,
          campaign_title: purchase.campaign_title,
          financial_institution: statusResponse.financialInstitutionId,
        },
      });
    }
    
    // PayDRC didn't find the transaction or returned an error
    console.log('⚠️ PayDRC did not return valid status, returning DB status:', purchase.payment_status);
    console.log('PayDRC response details:', statusResponse.error || 'No error, but found=false');

    // Return current status from database
    res.json({
      success: true,
      data: {
        reference,
        status: purchase.payment_status,
        amount: purchase.total_amount,
        ticket_count: purchase.ticket_count,
        campaign_title: purchase.campaign_title,
      },
    });
  } catch (error) {
    console.error('❌ PayDRC status check error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du statut: ' + error.message,
    });
  }
});

/**
 * PayDRC Callback Handler - Receives encrypted transaction updates
 * POST /api/payments/paydrc/callback
 */
router.post('/paydrc/callback', async (req, res) => {
  try {
    console.log('📥 PayDRC callback received');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const encryptedData = req.body.data;
    const signature = req.headers['x-signature'];

    // Log callback for debugging
    await query(
      `INSERT INTO payment_webhooks (provider, payload, headers, status, processed)
       VALUES ($1, $2, $3, $4, $5)`,
      ['PayDRC', JSON.stringify(req.body), JSON.stringify(req.headers), 'received', false]
    );

    // Note: Security is handled by PayDRC whitelisting our server's outbound IPs
    // No need to verify incoming callback IPs

    // Decrypt callback data
    let callbackData;
    if (encryptedData && process.env.PAYDRC_AES_KEY) {
      try {
        callbackData = paydrc.decryptCallbackData(encryptedData);
        console.log('🔓 Decrypted callback data:', callbackData);
      } catch (decryptError) {
        console.error('❌ Decryption error:', decryptError);
        // Try to use plain body if decryption fails
        callbackData = req.body;
      }
    } else {
      // Use plain body if no encryption
      callbackData = req.body;
    }

    // Extract transaction details
    const reference = callbackData.Reference || callbackData.reference;
    const transStatus =
      callbackData.Trans_Status || callbackData.trans_status || callbackData.Status;
    const transactionId = callbackData.Transaction_id || callbackData.transaction_id;

    if (!reference) {
      console.error('❌ No reference in callback');
      return res.status(400).json({ error: 'Missing reference' });
    }

    // Find the purchase
    let purchaseResult = await query(
      `SELECT id, user_id, campaign_id, ticket_count, total_amount, payment_status
       FROM purchases
       WHERE transaction_id = $1 OR transaction_id LIKE $2`,
      [reference, `%${reference}%`]
    );

    if (purchaseResult.rows.length === 0) {
      console.error('❌ Purchase not found for reference:', reference);
      // Try finding by PayDRC transaction ID
      purchaseResult = await query(
        `SELECT id, user_id, campaign_id, ticket_count, total_amount, payment_status
         FROM purchases
         WHERE transaction_id = $1`,
        [transactionId]
      );

      if (purchaseResult.rows.length === 0) {
        return res.status(404).json({ error: 'Purchase not found' });
      }
    }

    const purchase = purchaseResult.rows[0];

    // Skip if already processed
    if (purchase.payment_status === 'completed') {
      console.log('⏭️ Already processed, skipping');
      return res.json({ status: 'Already processed' });
    }

    // Determine payment status
    const isSuccess = transStatus === 'Successful' || transStatus === 'Success';
    const isFailed = transStatus === 'Failed';

    // Extract currency and amount from callback
    const callbackCurrency = callbackData.Currency || 'USD';
    const callbackAmount = callbackData.Amount;

    if (isSuccess) {
      // Process successful payment - generate tickets
      await transaction(async (client) => {
        // Update purchase status AND currency from callback
        await client.query(
          `UPDATE purchases 
           SET payment_status = 'completed', 
               completed_at = CURRENT_TIMESTAMP,
               currency = $2,
               total_amount = CASE WHEN $3::numeric > 0 THEN $3::numeric ELSE total_amount END
           WHERE id = $1`,
          [purchase.id, callbackCurrency, callbackAmount || purchase.total_amount]
        );

        // Get campaign info for proper number formatting - lock for update
        const campaignInfo = await client.query(
          'SELECT total_tickets, sold_tickets FROM campaigns WHERE id = $1 FOR UPDATE',
          [purchase.campaign_id]
        );
        const campaign = campaignInfo.rows[0];
        const totalTickets = campaign?.total_tickets || 1000;
        const currentSoldTickets = parseInt(campaign?.sold_tickets || 0);
        const padLength = Math.max(2, String(totalTickets).length);

        // Generate unique ticket numbers using sequential campaign-based numbering
        const tickets = [];
        for (let i = 0; i < purchase.ticket_count; i++) {
          // Use campaign's sold_tickets + offset for sequential numbering
          const ticketSequence = currentSoldTickets + i + 1;
          const ticketNumber = `K-${String(ticketSequence).padStart(padLength, '0')}`;
          
          const ticketResult = await client.query(
            `INSERT INTO tickets (
              ticket_number, campaign_id, user_id, purchase_id, status
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [ticketNumber, purchase.campaign_id, purchase.user_id, purchase.id, 'active']
          );

          tickets.push(ticketResult.rows[0]);
          console.log(`✅ Created ticket ${ticketNumber} for user ${purchase.user_id}`);
        }

        // Update campaign sold_tickets count
        await client.query(
          `UPDATE campaigns 
           SET sold_tickets = sold_tickets + $1 
           WHERE id = $2`,
          [purchase.ticket_count, purchase.campaign_id]
        );

        // Check if campaign is sold out
        const campaignCheck = await client.query(
          `SELECT id, sold_tickets, total_tickets, status 
           FROM campaigns WHERE id = $1`,
          [purchase.campaign_id]
        );

        const currentCampaign = campaignCheck.rows[0];
        if (
          currentCampaign &&
          currentCampaign.sold_tickets >= currentCampaign.total_tickets &&
          currentCampaign.status === 'open'
        ) {
          await client.query(
            `UPDATE campaigns 
             SET status = 'closed', updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [purchase.campaign_id]
          );
          console.log(`🎯 Campaign ${purchase.campaign_id} auto-closed - sold out!`);
        }

        // Generate invoice
        const invoiceNumber = generateInvoiceNumber();
        await client.query(
          `INSERT INTO invoices (
            purchase_id, user_id, invoice_number, amount, sent_at
          ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
          [purchase.id, purchase.user_id, invoiceNumber, purchase.total_amount]
        );

        // Create notification
        await client.query(
          `INSERT INTO notifications (
            user_id, type, title, message, data
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            purchase.user_id,
            'purchase_confirmation',
            'Achat confirmé !',
            `Vos ${purchase.ticket_count} ticket(s) ont été générés avec succès.`,
            JSON.stringify({
              purchase_id: purchase.id,
              ticket_numbers: tickets.map((t) => t.ticket_number),
            }),
          ]
        );

        console.log(`✅ PayDRC callback processed: ${tickets.length} tickets generated`);
      });

      // Send confirmation email/SMS (non-blocking)
      try {
        const purchaseDetails = await query(
          `SELECT p.*, u.name as user_name, u.email as user_email, u.phone_number,
                  c.title as campaign_title
           FROM purchases p
           JOIN users u ON p.user_id = u.id
           JOIN campaigns c ON p.campaign_id = c.id
           WHERE p.id = $1`,
          [purchase.id]
        );

        if (purchaseDetails.rows.length > 0) {
          const details = purchaseDetails.rows[0];

          // Get ticket numbers
          const ticketsResult = await query(
            'SELECT ticket_number FROM tickets WHERE purchase_id = $1',
            [purchase.id]
          );
          const ticketNumbers = ticketsResult.rows.map((t) => t.ticket_number);

          // Send email
          sendPurchaseConfirmation({
            to: details.user_email,
            userName: details.user_name,
            ticketCount: details.ticket_count,
            ticketNumbers,
            totalAmount: details.total_amount,
            campaignTitle: details.campaign_title,
          }).catch((err) => console.error('Email error:', err));

          // Send SMS
          sendPurchaseConfirmationSMS(
            details.phone_number,
            details.user_name,
            details.ticket_count,
            ticketNumbers
          ).catch((err) => console.error('SMS error:', err));
        }
      } catch (notifyError) {
        console.error('Notification error:', notifyError);
      }
    } else if (isFailed) {
      // Mark as failed
      await query(`UPDATE purchases SET payment_status = 'failed' WHERE id = $1`, [purchase.id]);

      // Notify user of failure
      await query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          purchase.user_id,
          'payment_failed',
          'Paiement échoué',
          "Votre paiement n'a pas abouti. Veuillez réessayer.",
          JSON.stringify({
            purchase_id: purchase.id,
            reason: callbackData.Trans_Status_Description,
          }),
        ]
      );

      console.log(`❌ Payment failed for purchase ${purchase.id}`);
    }

    // Mark webhook as processed
    await query(
      `UPDATE payment_webhooks 
       SET processed = true, processed_at = CURRENT_TIMESTAMP, status = $1
       WHERE payload::text LIKE $2`,
      [isSuccess ? 'success' : 'failed', `%${reference}%`]
    );

    res.json({ status: 'Callback processed', success: true });
  } catch (error) {
    console.error('❌ PayDRC callback error:', error);
    res.status(500).json({ error: 'Server error processing callback' });
  }
});

module.exports = router;
