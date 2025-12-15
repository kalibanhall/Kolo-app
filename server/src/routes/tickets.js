const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { normalizePhoneNumber, detectProvider } = require('../utils/helpers');
const { simulatePayment } = require('../services/africasTalking');
const { paymentLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Get user tickets (authentication required)
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Users can only see their own tickets unless they're admin
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const result = await query(
      `SELECT t.*, c.title as campaign_title, c.main_prize,
              p.total_amount, p.payment_status, p.created_at as purchase_date
       FROM tickets t
       JOIN campaigns c ON t.campaign_id = c.id
       JOIN purchases p ON t.purchase_id = p.id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Initiate ticket purchase (creates purchase record, initiates payment)
router.post('/purchase', verifyToken, paymentLimiter, [
  body('campaign_id').isInt({ min: 1 }),
  body('ticket_count').isInt({ min: 1, max: 5 }),
  body('phone_number').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { campaign_id, ticket_count, phone_number } = req.body;
    const user_id = req.user.id;

    const normalizedPhone = normalizePhoneNumber(phone_number);
    const provider = detectProvider(normalizedPhone);

    // Check campaign exists and is open
    const campaignResult = await query(
      `SELECT id, status, total_tickets, sold_tickets, ticket_price
       FROM campaigns WHERE id = $1`,
      [campaign_id]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const campaign = campaignResult.rows[0];

    if (campaign.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Campaign is not open for purchases'
      });
    }

    // Check ticket availability
    if (campaign.sold_tickets + ticket_count > campaign.total_tickets) {
      return res.status(400).json({
        success: false,
        message: 'Not enough tickets available'
      });
    }

    const total_amount = campaign.ticket_price * ticket_count;

    // Create purchase record with pending status
    const purchaseResult = await query(
      `INSERT INTO purchases (
        user_id, campaign_id, ticket_count, total_amount, 
        phone_number, payment_provider, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [user_id, campaign_id, ticket_count, total_amount, normalizedPhone, provider, 'pending']
    );

    const purchase = purchaseResult.rows[0];

    // Initiate payment with Africa's Talking (or simulation in development)
    let paymentResponse;
    
    if (process.env.NODE_ENV === 'production') {
      // Use real Africa's Talking API
      const { initiateMobilePayment } = require('../services/africasTalking');
      paymentResponse = await initiateMobilePayment(
        normalizedPhone,
        total_amount,
        'KOLO Tombola Tickets',
        { purchase_id: purchase.id, user_id, campaign_id }
      );
    } else {
      // Use simulation for development
      paymentResponse = await simulatePayment(normalizedPhone, total_amount);
    }

    // Update purchase with transaction ID
    if (paymentResponse.transactionId) {
      await query(
        `UPDATE purchases SET transaction_id = $1 WHERE id = $2`,
        [paymentResponse.transactionId, purchase.id]
      );
    }

    res.json({
      success: true,
      message: 'Payment initiated. Please confirm on your phone.',
      data: {
        purchase_id: purchase.id,
        transaction_id: paymentResponse.transactionId,
        status: 'pending_confirmation',
        amount: total_amount,
        provider: provider,
        ticket_count: ticket_count
      }
    });

  } catch (error) {
    console.error('Purchase tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during purchase'
    });
  }
});

// Get all tickets (admin only)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT t.*, u.name as user_name, u.email as user_email,
              c.title as campaign_title,
              (SELECT COUNT(*) FROM tickets) as total_count
       FROM tickets t
       JOIN users u ON t.user_id = u.id
       JOIN campaigns c ON t.campaign_id = c.id
       ORDER BY t.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalCount
      }
    });

  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Validate ticket by number
router.get('/validate/:number', async (req, res) => {
  try {
    const ticketNumber = req.params.number;
    
    const result = await query(
      `SELECT t.*, u.name as user_name, c.title as campaign_title, 
              c.main_prize, t.is_winner, t.prize_category
       FROM tickets t
       JOIN users u ON t.user_id = u.id
       JOIN campaigns c ON t.campaign_id = c.id
       WHERE t.ticket_number = $1`,
      [ticketNumber]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      message: 'Ticket is valid',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Validate ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;