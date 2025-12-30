const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Generate unique wallet transaction reference
const generateWalletReference = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'WLT-';
  for (let i = 0; i < 12; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
};

// Get user wallet
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get or create wallet
    let walletResult = await query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (walletResult.rows.length === 0) {
      // Create wallet for user
      walletResult = await query(
        `INSERT INTO wallets (user_id, balance, currency) 
         VALUES ($1, 0, 'CDF') 
         RETURNING *`,
        [userId]
      );
    }

    const wallet = walletResult.rows[0];

    // Get recent transactions
    const transactionsResult = await query(
      `SELECT * FROM wallet_transactions 
       WHERE wallet_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [wallet.id]
    );

    res.json({
      success: true,
      data: {
        wallet: {
          id: wallet.id,
          balance: parseFloat(wallet.balance),
          currency: wallet.currency,
          is_active: wallet.is_active
        },
        recent_transactions: transactionsResult.rows
      }
    });

  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du portefeuille'
    });
  }
});

// Get wallet transactions history
router.get('/transactions', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const type = req.query.type; // filter by type

    // Get wallet
    const walletResult = await query(
      'SELECT id FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (walletResult.rows.length === 0) {
      return res.json({
        success: true,
        data: { transactions: [], total: 0 }
      });
    }

    const walletId = walletResult.rows[0].id;

    // Build query
    let queryStr = `
      SELECT *, COUNT(*) OVER() as total_count
      FROM wallet_transactions 
      WHERE wallet_id = $1
    `;
    const params = [walletId];
    let paramIndex = 2;

    if (type) {
      queryStr += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    queryStr += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(queryStr, params);

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      success: true,
      data: {
        transactions: result.rows.map(t => ({
          ...t,
          amount: parseFloat(t.amount),
          balance_before: parseFloat(t.balance_before),
          balance_after: parseFloat(t.balance_after)
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des transactions'
    });
  }
});

// Initiate deposit (redirect to payment aggregator)
router.post('/deposit', verifyToken, paymentLimiter, [
  body('amount').isFloat({ min: 100, max: 10000000 }).withMessage('Montant invalide (min: 100 FC)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const userId = req.user.id;
    const { amount } = req.body;

    // Get or create wallet
    let walletResult = await query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (walletResult.rows.length === 0) {
      walletResult = await query(
        `INSERT INTO wallets (user_id, balance, currency) 
         VALUES ($1, 0, 'CDF') 
         RETURNING *`,
        [userId]
      );
    }

    const wallet = walletResult.rows[0];
    const reference = generateWalletReference();

    // Create pending transaction
    await query(
      `INSERT INTO wallet_transactions 
       (wallet_id, type, amount, balance_before, balance_after, reference, status, description)
       VALUES ($1, 'deposit', $2, $3, $3, $4, 'pending', 'Rechargement en attente')`,
      [wallet.id, amount, wallet.balance, reference]
    );

    // Build payment URL for aggregator
    const aggregatorBaseUrl = process.env.PAYMENT_AGGREGATOR_URL || 'https://pay.example.com';
    const callbackUrl = encodeURIComponent(`${process.env.API_URL || 'https://kolo-api.onrender.com'}/api/wallet/callback`);
    const returnUrl = encodeURIComponent(`${process.env.FRONTEND_URL || 'https://kolo.cd'}/wallet?status=success&ref=${reference}`);
    const cancelUrl = encodeURIComponent(`${process.env.FRONTEND_URL || 'https://kolo.cd'}/wallet?status=cancelled&ref=${reference}`);

    const paymentUrl = `${aggregatorBaseUrl}/checkout?` +
      `merchant_id=${process.env.PAYMENT_MERCHANT_ID || 'KOLO_MERCHANT'}` +
      `&transaction_id=${reference}` +
      `&amount=${amount}` +
      `&currency=CDF` +
      `&description=${encodeURIComponent('Rechargement portefeuille KOLO')}` +
      `&callback_url=${callbackUrl}` +
      `&return_url=${returnUrl}` +
      `&cancel_url=${cancelUrl}` +
      `&customer_email=${encodeURIComponent(req.user.email)}` +
      `&customer_name=${encodeURIComponent(req.user.name)}`;

    res.json({
      success: true,
      message: 'Redirection vers le paiement',
      data: {
        reference,
        amount,
        payment_url: paymentUrl
      }
    });

  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'initiation du rechargement'
    });
  }
});

// Payment callback (from aggregator)
router.post('/callback', async (req, res) => {
  try {
    const { 
      transaction_id, // Our reference
      status,
      external_reference,
      amount
    } = req.body;

    console.log('Wallet callback received:', req.body);

    // Find pending transaction
    const txResult = await query(
      `SELECT wt.*, w.user_id 
       FROM wallet_transactions wt
       JOIN wallets w ON wt.wallet_id = w.id
       WHERE wt.reference = $1 AND wt.status = 'pending'`,
      [transaction_id]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const tx = txResult.rows[0];

    if (status === 'success' || status === 'completed') {
      // Credit wallet
      const walletResult = await query(
        `UPDATE wallets 
         SET balance = balance + $1, updated_at = NOW()
         WHERE id = $2
         RETURNING balance`,
        [tx.amount, tx.wallet_id]
      );

      const newBalance = walletResult.rows[0].balance;

      // Update transaction
      await query(
        `UPDATE wallet_transactions 
         SET status = 'completed', 
             balance_after = $1,
             external_reference = $2,
             description = 'Rechargement réussi'
         WHERE id = $3`,
        [newBalance, external_reference, tx.id]
      );

      res.json({ success: true, message: 'Wallet credited' });
    } else {
      // Mark as failed
      await query(
        `UPDATE wallet_transactions 
         SET status = 'failed', 
             description = 'Paiement échoué ou annulé'
         WHERE id = $1`,
        [tx.id]
      );

      res.json({ success: true, message: 'Transaction marked as failed' });
    }

  } catch (error) {
    console.error('Wallet callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Callback processing error'
    });
  }
});

// Purchase with wallet balance
router.post('/purchase', verifyToken, [
  body('campaign_id').isInt({ min: 1 }),
  body('ticket_count').isInt({ min: 1, max: 1000 }),
  body('selection_mode').optional().isIn(['manual', 'automatic'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { campaign_id, ticket_count, selection_mode, selected_numbers } = req.body;

    // Get wallet
    const walletResult = await query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (walletResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Portefeuille non trouvé'
      });
    }

    const wallet = walletResult.rows[0];

    // Get campaign
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
        message: 'Cette campagne n\'est plus ouverte'
      });
    }

    // Check availability
    if (campaign.sold_tickets + ticket_count > campaign.total_tickets) {
      return res.status(400).json({
        success: false,
        message: 'Pas assez de tickets disponibles'
      });
    }

    // Le prix du ticket est en USD, le portefeuille est en CDF
    // Taux de conversion: 1 USD = 2500 CDF
    const USD_TO_CDF_RATE = 2500;
    const ticketPriceUSD = parseFloat(campaign.ticket_price);
    const totalAmountCDF = Math.ceil(ticketPriceUSD * ticket_count * USD_TO_CDF_RATE);

    // Check wallet balance (in CDF)
    if (parseFloat(wallet.balance) < totalAmountCDF) {
      return res.status(400).json({
        success: false,
        message: 'Solde insuffisant',
        data: {
          balance: parseFloat(wallet.balance),
          required: totalAmountCDF,
          missing: totalAmountCDF - parseFloat(wallet.balance)
        }
      });
    }

    // Generate transaction reference
    const reference = generateWalletReference();
    const purchaseTransactionId = generateWalletReference().replace('WLT-', 'PUR-');

    // Execute purchase in transaction
    const client = await require('../config/database').pool.connect();
    
    try {
      await client.query('BEGIN');

      // Debit wallet (in CDF)
      const newBalance = parseFloat(wallet.balance) - totalAmountCDF;
      await client.query(
        `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
        [newBalance, wallet.id]
      );

      // Record wallet transaction (in CDF)
      await client.query(
        `INSERT INTO wallet_transactions 
         (wallet_id, type, amount, balance_before, balance_after, reference, status, description)
         VALUES ($1, 'purchase', $2, $3, $4, $5, 'completed', $6)`,
        [wallet.id, totalAmountCDF, wallet.balance, newBalance, reference, `Achat de ${ticket_count} ticket(s) - ${ticketPriceUSD * ticket_count}$`]
      );

      // Create purchase record (store USD amount for reporting)
      const purchaseResult = await client.query(
        `INSERT INTO purchases 
         (user_id, campaign_id, ticket_count, total_amount, payment_status, transaction_id, payment_provider)
         VALUES ($1, $2, $3, $4, 'completed', $5, 'wallet')
         RETURNING *`,
        [userId, campaign_id, ticket_count, ticketPriceUSD * ticket_count, purchaseTransactionId]
      );

      const purchase = purchaseResult.rows[0];

      // Generate tickets
      const tickets = [];
      for (let i = 0; i < ticket_count; i++) {
        const ticketNumber = `KOLO-${String(campaign.sold_tickets + i + 1).padStart(6, '0')}`;
        const ticketResult = await client.query(
          `INSERT INTO tickets 
           (user_id, campaign_id, purchase_id, ticket_number, status)
           VALUES ($1, $2, $3, $4, 'active')
           RETURNING *`,
          [userId, campaign_id, purchase.id, ticketNumber]
        );
        tickets.push(ticketResult.rows[0]);
      }

      // Update campaign sold count
      await client.query(
        `UPDATE campaigns SET sold_tickets = sold_tickets + $1 WHERE id = $2`,
        [ticket_count, campaign_id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Achat effectué avec succès !',
        data: {
          purchase_id: purchase.id,
          transaction_id: purchaseTransactionId,
          tickets: tickets.map(t => ({
            id: t.id,
            ticket_number: t.ticket_number
          })),
          amount_paid_cdf: totalAmountCDF,
          amount_paid_usd: ticketPriceUSD * ticket_count,
          new_balance: newBalance
        }
      });

    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Wallet purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'achat'
    });
  }
});

// Admin: Credit user wallet (bonus, refund, etc.)
router.post('/admin/credit', verifyToken, verifyAdmin, [
  body('user_id').isInt({ min: 1 }),
  body('amount').isFloat({ min: 1 }),
  body('type').isIn(['bonus', 'refund']),
  body('description').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { user_id, amount, type, description } = req.body;

    // Get wallet
    let walletResult = await query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [user_id]
    );

    if (walletResult.rows.length === 0) {
      walletResult = await query(
        `INSERT INTO wallets (user_id, balance, currency) 
         VALUES ($1, 0, 'CDF') 
         RETURNING *`,
        [user_id]
      );
    }

    const wallet = walletResult.rows[0];
    const newBalance = parseFloat(wallet.balance) + amount;
    const reference = generateWalletReference();

    // Credit wallet
    await query(
      `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
      [newBalance, wallet.id]
    );

    // Record transaction
    await query(
      `INSERT INTO wallet_transactions 
       (wallet_id, type, amount, balance_before, balance_after, reference, status, description)
       VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7)`,
      [wallet.id, type, amount, wallet.balance, newBalance, reference, description || `${type} par admin`]
    );

    res.json({
      success: true,
      message: 'Portefeuille crédité',
      data: {
        user_id,
        amount_credited: amount,
        new_balance: newBalance
      }
    });

  } catch (error) {
    console.error('Admin credit error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du crédit'
    });
  }
});

// Simulate deposit completion (for development/testing)
router.post('/simulate-deposit', verifyToken, [
  body('reference').notEmpty()
], async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Non disponible en production'
    });
  }

  try {
    const { reference } = req.body;

    // Find pending transaction
    const txResult = await query(
      `SELECT wt.*, w.balance as current_balance
       FROM wallet_transactions wt
       JOIN wallets w ON wt.wallet_id = w.id
       WHERE wt.reference = $1 AND wt.status = 'pending'`,
      [reference]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction non trouvée ou déjà traitée'
      });
    }

    const tx = txResult.rows[0];
    const newBalance = parseFloat(tx.current_balance) + parseFloat(tx.amount);

    // Credit wallet
    await query(
      `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
      [newBalance, tx.wallet_id]
    );

    // Update transaction
    await query(
      `UPDATE wallet_transactions 
       SET status = 'completed', 
           balance_after = $1,
           description = 'Rechargement simulé (dev)'
       WHERE id = $2`,
      [newBalance, tx.id]
    );

    res.json({
      success: true,
      message: 'Dépôt simulé avec succès',
      data: {
        amount: parseFloat(tx.amount),
        new_balance: newBalance
      }
    });

  } catch (error) {
    console.error('Simulate deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la simulation'
    });
  }
});

module.exports = router;
