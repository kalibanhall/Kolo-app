const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { generateTicketNumber, generateInvoiceNumber } = require('../utils/helpers');
const { sendPurchaseConfirmation } = require('../services/emailService');
const { generateInvoicePDF } = require('../services/pdfGenerator');
const { sendPurchaseConfirmationSMS } = require('../services/africasTalking');
const router = express.Router();

// Get payment status by purchase ID
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
        message: 'Purchase not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
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
        message: 'Access denied'
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
      data: result.rows
    });

  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
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
        false
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
        // Update purchase status
        await client.query(
          `UPDATE purchases 
           SET payment_status = $1, completed_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          ['completed', purchase.id]
        );

        // Generate unique ticket numbers
        const tickets = [];
        for (let i = 0; i < purchase.ticket_count; i++) {
          let ticketNumber;
          let isUnique = false;
          
          // Ensure ticket number is unique
          while (!isUnique) {
            ticketNumber = generateTicketNumber();
            const checkResult = await client.query(
              'SELECT id FROM tickets WHERE ticket_number = $1',
              [ticketNumber]
            );
            isUnique = checkResult.rows.length === 0;
          }

          // Insert ticket
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
            JSON.stringify({ purchase_id: purchase.id, ticket_numbers: tickets.map(t => t.ticket_number) })
          ]
        );

        console.log(`✅ Successfully processed payment for purchase ${purchase.id}`);
        console.log(`Generated ${tickets.length} tickets:`, tickets.map(t => t.ticket_number));

        // Return ticket data for later use
        return { 
          tickets, 
          invoiceNumber,
          ticketNumbers: tickets.map(t => t.ticket_number) 
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
          invoiceNumber: ticketData.invoiceNumber
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
        message: 'Payment processed and tickets generated'
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
        message: 'Payment failed, purchase marked as failed'
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
      message: 'Server error processing webhook'
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

      // Generate tickets
      const tickets = [];
      for (let i = 0; i < purchase.ticket_count; i++) {
        const ticketNumber = await generateTicketNumber();
        
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
            tickets: tickets.map(t => t.ticket_number)
          })
        ]
      );

      res.json({
        success: true,
        message: 'Payment simulated successfully',
        data: {
          purchase_id: purchaseId,
          transaction_id: transactionId,
          tickets: tickets.map(t => ({
            id: t.id,
            ticket_number: t.ticket_number
          }))
        }
      });
    });

  } catch (error) {
    console.error('Simulate payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

module.exports = router;