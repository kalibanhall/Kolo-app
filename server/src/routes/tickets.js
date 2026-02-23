const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { normalizePhoneNumber, detectProvider } = require('../utils/helpers');
const { simulatePayment } = require('../services/africasTalking');
const { paymentLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Generate transaction ID: 16 characters alphanumeric (letters + numbers)
const generateTransactionId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let transactionId = '';
  for (let i = 0; i < 16; i++) {
    transactionId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return transactionId;
};

// Initiate purchase - Create order and return payment URL for aggregator redirect
router.post('/initiate-purchase', verifyToken, paymentLimiter, [
  body('campaign_id').isInt({ min: 1 }),
  body('ticket_count').isInt({ min: 1, max: 1000 }),
  body('selection_mode').optional().isIn(['manual', 'automatic']),
  body('amount').isFloat({ min: 0 })
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

    const { campaign_id, ticket_count, selection_mode, selected_numbers, amount } = req.body;
    const user_id = req.user.id;

    // Check campaign exists and is open
    const campaignResult = await query(
      `SELECT id, status, total_tickets, sold_tickets, ticket_price
       FROM campaigns WHERE id = $1`,
      [campaign_id]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campagne non trouvée'
      });
    }

    const campaign = campaignResult.rows[0];

    if (campaign.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Cette campagne n\'est plus ouverte aux achats'
      });
    }

    // Check ticket availability
    if (campaign.sold_tickets + ticket_count > campaign.total_tickets) {
      return res.status(400).json({
        success: false,
        message: 'Pas assez de tickets disponibles'
      });
    }

    // Verify amount matches
    const expected_amount = campaign.ticket_price * ticket_count;
    if (Math.abs(amount - expected_amount) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Montant invalide'
      });
    }

    // Generate unique transaction ID
    const transactionId = generateTransactionId();

    // Create pending purchase record
    const purchaseResult = await query(
      `INSERT INTO purchases (
        user_id, campaign_id, ticket_count, total_amount, 
        payment_status, transaction_id, selection_mode, selected_numbers
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        user_id, 
        campaign_id, 
        ticket_count, 
        expected_amount, 
        'pending', 
        transactionId,
        selection_mode || 'automatic',
        JSON.stringify(selected_numbers || [])
      ]
    );

    const purchase = purchaseResult.rows[0];

    // Build payment URL for aggregator (configure your aggregator here)
    // Example with common aggregators format
    const aggregatorBaseUrl = process.env.PAYMENT_AGGREGATOR_URL || 'https://pay.example.com';
    const callbackUrl = encodeURIComponent(`${process.env.API_URL || 'https://kolo-api.onrender.com'}/api/payments/callback`);
    const returnUrl = encodeURIComponent(`${process.env.FRONTEND_URL || 'https://kolo.cd'}/payment/success?transaction=${transactionId}`);
    const cancelUrl = encodeURIComponent(`${process.env.FRONTEND_URL || 'https://kolo.cd'}/payment/cancel?transaction=${transactionId}`);
    
    // Generic payment URL format - customize based on your aggregator
    const paymentUrl = `${aggregatorBaseUrl}/checkout?` +
      `merchant_id=${process.env.PAYMENT_MERCHANT_ID || 'KOLO_MERCHANT'}` +
      `&transaction_id=${transactionId}` +
      `&amount=${expected_amount}` +
      `&currency=CDF` +
      `&description=${encodeURIComponent(`KOLO Tombola - ${ticket_count} ticket(s)`)}` +
      `&callback_url=${callbackUrl}` +
      `&return_url=${returnUrl}` +
      `&cancel_url=${cancelUrl}` +
      `&customer_email=${encodeURIComponent(req.user.email)}` +
      `&customer_name=${encodeURIComponent(req.user.name)}`;

    res.json({
      success: true,
      message: 'Commande créée, redirection vers le paiement',
      data: {
        purchase_id: purchase.id,
        transaction_id: transactionId,
        amount: expected_amount,
        ticket_count: ticket_count,
        payment_url: paymentUrl
      }
    });

  } catch (error) {
    console.error('Initiate purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'initiation du paiement'
    });
  }
});

// Get user tickets (authentication required)
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit) || 100; // Default 100 tickets max
    const offset = parseInt(req.query.offset) || 0;
    
    console.log(`[DEBUG] GET /tickets/user/${userId} - req.user.id:`, req.user?.id);
    
    // Users can only see their own tickets unless they're admin
    if (req.user.id !== userId && !req.user.is_admin) {
      console.log(`[DEBUG] Access denied: user ${req.user.id} trying to access tickets of user ${userId}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get tickets with campaign and purchase info
    const result = await query(
      `SELECT t.id, t.ticket_number, t.status, t.created_at, t.is_winner, t.prize_category,
              c.id as campaign_id, c.title as campaign_title, c.main_prize, 
              c.status as campaign_status,
              COALESCE(c.ticket_price, 0) as ticket_price,
              c.image_url as campaign_image,
              COALESCE(p.total_amount, 0) as purchase_total, 
              COALESCE(p.ticket_count, 1) as ticket_count, 
              p.payment_status, p.created_at as purchase_date
       FROM tickets t
       LEFT JOIN campaigns c ON t.campaign_id = c.id
       LEFT JOIN purchases p ON t.purchase_id = p.id
       WHERE t.user_id = $1 
         AND t.ticket_number NOT LIKE 'TEMP%'
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Get aggregated stats
    const statsResult = await query(
      `SELECT 
        COUNT(t.id) as total_tickets,
        COUNT(DISTINCT t.campaign_id) as campaigns_count,
        COUNT(CASE WHEN t.status = 'active' THEN 1 END) as active_tickets,
        COUNT(CASE WHEN t.is_winner = true THEN 1 END) as winning_tickets,
        COALESCE(SUM(c.ticket_price), 0) as total_spent_usd
       FROM tickets t
       LEFT JOIN campaigns c ON t.campaign_id = c.id
       WHERE t.user_id = $1 
         AND t.ticket_number NOT LIKE 'TEMP%'`,
      [userId]
    );

    // Get actual spending from purchases (currency-aware)
    const spendingResult = await query(
      `SELECT 
        COALESCE(currency, 'USD') as currency,
        COALESCE(SUM(total_amount), 0) as total_spent,
        COUNT(*) as purchase_count
       FROM purchases 
       WHERE user_id = $1 AND payment_status = 'completed'
       GROUP BY COALESCE(currency, 'USD')`,
      [userId]
    );

    const spendingByurrency = {};
    spendingResult.rows.forEach(row => {
      spendingByurrency[row.currency] = parseFloat(row.total_spent) || 0;
    });

    const stats = statsResult.rows[0] || {};

    console.log(`[DEBUG] GET /tickets/user/${userId} - Found ${result.rows.length} tickets`);
    
    res.json({
      success: true,
      data: result.rows,
      stats: {
        total_tickets: parseInt(stats.total_tickets) || 0,
        campaigns_count: parseInt(stats.campaigns_count) || 0,
        active_tickets: parseInt(stats.active_tickets) || 0,
        winning_tickets: parseInt(stats.winning_tickets) || 0,
        total_spent_usd: spendingByurrency['USD'] || parseFloat(stats.total_spent_usd) || 0,
        total_spent_cdf: spendingByurrency['CDF'] || 0,
        spending_by_currency: spendingByurrency
      },
      pagination: {
        limit,
        offset,
        has_more: result.rows.length === limit
      }
    });

  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      details: error.message
    });
  }
});

// Initiate ticket purchase (creates purchase record, initiates payment)
router.post('/purchase', verifyToken, paymentLimiter, [
  body('campaign_id').isInt({ min: 1 }),
  body('ticket_count').isInt({ min: 1, max: 1000 }),
  body('phone_number').notEmpty().trim(),
  body('selection_mode').optional().isIn(['manual', 'automatic'])
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

    // Generate unique transaction ID
    const transactionId = generateTransactionId();

    // Create purchase record with pending status
    const purchaseResult = await query(
      `INSERT INTO purchases (
        user_id, campaign_id, ticket_count, total_amount, 
        phone_number, payment_provider, payment_status, transaction_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [user_id, campaign_id, ticket_count, total_amount, normalizedPhone, provider, 'pending', transactionId]
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

    res.json({
      success: true,
      message: 'Demande d\'achat enregistrée. Veuillez valider le paiement sur votre téléphone.',
      data: {
        purchase_id: purchase.id,
        transaction_id: transactionId,
        external_transaction_id: paymentResponse?.transactionId || null,
        status: 'pending',
        status_label: 'En attente de paiement',
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