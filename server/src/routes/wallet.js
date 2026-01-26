const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const paydrc = require('../services/paydrc');
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

    // Get spending statistics by currency
    const spendingStatsResult = await query(
      `SELECT 
        COALESCE(currency, 'USD') as currency,
        COALESCE(SUM(total_amount), 0) as total_spent,
        COUNT(*) as purchase_count
       FROM purchases 
       WHERE user_id = $1 AND payment_status = 'completed'
       GROUP BY COALESCE(currency, 'USD')`,
      [userId]
    );

    // Parse spending stats into a map
    const spendingStats = {
      USD: { total_spent: 0, purchase_count: 0 },
      CDF: { total_spent: 0, purchase_count: 0 }
    };
    spendingStatsResult.rows.forEach(row => {
      const currency = row.currency || 'USD';
      spendingStats[currency] = {
        total_spent: parseFloat(row.total_spent) || 0,
        purchase_count: parseInt(row.purchase_count) || 0
      };
    });

    res.json({
      success: true,
      data: {
        wallet: {
          id: wallet.id,
          balance: parseFloat(wallet.balance),
          currency: wallet.currency,
          is_active: wallet.is_active
        },
        recent_transactions: transactionsResult.rows,
        spending_stats: spendingStats
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

// Get wallet transactions history (includes wallet transactions AND Mobile Money purchases)
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

    const walletId = walletResult.rows.length > 0 ? walletResult.rows[0].id : null;

    // Combined query: wallet transactions + Mobile Money purchases
    let queryStr = `
      WITH combined_transactions AS (
        -- Wallet transactions (deposits, purchases via wallet, refunds, bonuses)
        SELECT 
          wt.id,
          wt.type,
          wt.amount,
          wt.balance_before,
          wt.balance_after,
          wt.reference,
          wt.status,
          wt.description,
          wt.created_at,
          'wallet' as source,
          NULL as campaign_title,
          NULL as ticket_count
        FROM wallet_transactions wt
        WHERE wt.wallet_id = $1
        
        UNION ALL
        
        -- Mobile Money purchases (PayDRC, etc.)
        SELECT 
          p.id,
          'purchase' as type,
          p.total_amount as amount,
          NULL as balance_before,
          NULL as balance_after,
          p.transaction_id as reference,
          p.payment_status as status,
          CONCAT('Achat de ', p.ticket_count, ' ticket(s) via ', COALESCE(p.payment_provider, 'Mobile Money')) as description,
          COALESCE(p.completed_at, p.created_at) as created_at,
          'mobile_money' as source,
          c.title as campaign_title,
          p.ticket_count
        FROM purchases p
        LEFT JOIN campaigns c ON p.campaign_id = c.id
        WHERE p.user_id = $2 AND p.payment_provider != 'wallet' AND p.payment_status = 'completed'
      )
      SELECT *, COUNT(*) OVER() as total_count
      FROM combined_transactions
    `;
    
    const params = [walletId, userId];
    let paramIndex = 3;

    // Filter by type if specified
    if (type && type !== 'all') {
      queryStr += ` WHERE type = $${paramIndex}`;
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
          amount: parseFloat(t.amount) || 0,
          balance_before: t.balance_before ? parseFloat(t.balance_before) : null,
          balance_after: t.balance_after ? parseFloat(t.balance_after) : null
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

// ============================================
// Deposit via PayDRC (MOKO Afrika) Mobile Money
// ============================================
router.post('/deposit/paydrc', verifyToken, paymentLimiter, [
  body('amount').isFloat({ min: 100, max: 10000000 }).withMessage('Montant invalide (min: 100 FC)'),
  body('phone_number').notEmpty().withMessage('Numéro de téléphone requis')
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
    const { amount, phone_number } = req.body;

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
    const reference = `WDEP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create pending transaction
    await query(
      `INSERT INTO wallet_transactions 
       (wallet_id, type, amount, balance_before, balance_after, reference, status, description)
       VALUES ($1, 'deposit', $2, $3, $3, $4, 'pending', 'Rechargement PayDRC en attente')`,
      [wallet.id, amount, wallet.balance, reference]
    );

    // Normalize phone and detect provider
    const normalizedPhone = paydrc.normalizePhoneNumber(phone_number);
    const provider = paydrc.detectMobileProvider(normalizedPhone);

    // Champs statiques pour PayDRC (comme pour l'achat de tickets)
    const firstName = 'Congohigh';
    const lastName = 'Technologie';

    // Build callback URL
    const callbackUrl = `${process.env.API_URL || 'https://kolo-api.onrender.com'}/api/wallet/paydrc/callback`;

    // Initiate PayDRC transaction
    const paymentResponse = await paydrc.initiatePayIn({
      amount,
      currency: 'CDF',
      customerNumber: normalizedPhone,
      firstName,
      lastName,
      email: req.user.email,
      reference,
      method: provider,
      callbackUrl
    });

    if (paymentResponse.success) {
      // Update transaction with PayDRC ID
      await query(
        `UPDATE wallet_transactions 
         SET external_reference = $1
         WHERE reference = $2`,
        [paymentResponse.transactionId, reference]
      );

      res.json({
        success: true,
        message: 'Rechargement initié. Validez sur votre téléphone.',
        data: {
          reference,
          paydrc_transaction_id: paymentResponse.transactionId,
          amount,
          provider,
          status: 'pending'
        }
      });
    } else {
      // Mark transaction as failed
      await query(
        `UPDATE wallet_transactions 
         SET status = 'failed', description = $1
         WHERE reference = $2`,
        [paymentResponse.error || 'Échec initiation', reference]
      );

      res.status(400).json({
        success: false,
        message: 'Échec de l\'initiation du rechargement',
        error: paymentResponse.error
      });
    }

  } catch (error) {
    console.error('PayDRC deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'initiation du rechargement'
    });
  }
});

// Check PayDRC deposit status
router.get('/deposit/status/:reference', verifyToken, async (req, res) => {
  try {
    const { reference } = req.params;
    const userId = req.user.id;

    // Find transaction
    const txResult = await query(
      `SELECT wt.*, w.user_id 
       FROM wallet_transactions wt
       JOIN wallets w ON wt.wallet_id = w.id
       WHERE wt.reference = $1 AND w.user_id = $2`,
      [reference, userId]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction non trouvée'
      });
    }

    const tx = txResult.rows[0];

    // If already completed or failed, return cached status
    if (tx.status === 'completed' || tx.status === 'failed') {
      return res.json({
        success: true,
        data: {
          reference,
          status: tx.status,
          amount: parseFloat(tx.amount),
          balance_after: parseFloat(tx.balance_after)
        }
      });
    }

    // Query PayDRC for latest status
    const statusResponse = await paydrc.checkTransactionStatus(reference);

    if (statusResponse.success && statusResponse.found) {
      let newStatus = tx.status;
      if (statusResponse.transStatus === 'Successful') {
        newStatus = 'completed';
      } else if (statusResponse.transStatus === 'Failed') {
        newStatus = 'failed';
      }

      return res.json({
        success: true,
        data: {
          reference,
          status: newStatus,
          paydrc_status: statusResponse.transStatus,
          amount: parseFloat(tx.amount)
        }
      });
    }

    res.json({
      success: true,
      data: {
        reference,
        status: tx.status,
        amount: parseFloat(tx.amount)
      }
    });

  } catch (error) {
    console.error('Check deposit status error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du statut'
    });
  }
});

// ============================================
// Cancel pending deposit/transaction
// ============================================
router.post('/transactions/:reference/cancel', verifyToken, async (req, res) => {
  try {
    const { reference } = req.params;
    const userId = req.user.id;

    // Find the pending transaction
    const txResult = await query(
      `SELECT wt.*, w.id as wallet_id
       FROM wallet_transactions wt
       JOIN wallets w ON wt.wallet_id = w.id
       WHERE wt.reference = $1 AND w.user_id = $2`,
      [reference, userId]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction non trouvée'
      });
    }

    const tx = txResult.rows[0];

    // Can only cancel pending transactions
    if (tx.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Impossible d'annuler une transaction avec le statut "${tx.status}"`
      });
    }

    // Update status to cancelled
    await query(
      `UPDATE wallet_transactions 
       SET status = 'cancelled', description = 'Annulé par l\'utilisateur', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [tx.id]
    );

    res.json({
      success: true,
      message: 'Transaction annulée avec succès',
      data: {
        reference,
        status: 'cancelled'
      }
    });

  } catch (error) {
    console.error('Cancel transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation de la transaction'
    });
  }
});

// PayDRC Wallet callback
router.post('/paydrc/callback', async (req, res) => {
  try {
    console.log('📥 PayDRC Wallet callback received');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const encryptedData = req.body.data;

    // Note: Security is handled by PayDRC whitelisting our server's outbound IPs
    // No need to verify incoming callback IPs

    // Decrypt callback data
    let callbackData;
    if (encryptedData && process.env.PAYDRC_AES_KEY) {
      try {
        callbackData = paydrc.decryptCallbackData(encryptedData);
      } catch (decryptError) {
        callbackData = req.body;
      }
    } else {
      callbackData = req.body;
    }

    const reference = callbackData.Reference || callbackData.reference;
    const transStatus = callbackData.Trans_Status || callbackData.trans_status || callbackData.Status;

    if (!reference) {
      return res.status(400).json({ error: 'Missing reference' });
    }

    // Find pending transaction
    const txResult = await query(
      `SELECT wt.*, w.user_id, w.balance as wallet_balance
       FROM wallet_transactions wt
       JOIN wallets w ON wt.wallet_id = w.id
       WHERE wt.reference = $1 AND wt.status = 'pending'`,
      [reference]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = txResult.rows[0];
    const isSuccess = transStatus === 'Successful' || transStatus === 'Success';
    const isFailed = transStatus === 'Failed';

    if (isSuccess) {
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
             description = 'Rechargement PayDRC réussi'
         WHERE id = $2`,
        [newBalance, tx.id]
      );

      // Create notification
      await query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'wallet_deposit', 'Rechargement réussi !', $2, $3)`,
        [
          tx.user_id,
          `Votre portefeuille a été crédité de ${parseFloat(tx.amount).toLocaleString('fr-FR')} FC`,
          JSON.stringify({ reference, amount: tx.amount, new_balance: newBalance })
        ]
      );

      console.log(`✅ Wallet deposit completed: ${reference}, amount: ${tx.amount}`);
    } else if (isFailed) {
      await query(
        `UPDATE wallet_transactions 
         SET status = 'failed', 
             description = $1
         WHERE id = $2`,
        [callbackData.Trans_Status_Description || 'Paiement échoué', tx.id]
      );

      console.log(`❌ Wallet deposit failed: ${reference}`);
    }

    res.json({ success: true, status: 'Callback processed' });

  } catch (error) {
    console.error('PayDRC wallet callback error:', error);
    res.status(500).json({ error: 'Server error' });
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
  body('selection_mode').optional().isString(),
  body('amount').optional().isNumeric(),
  body('promo_code_id').optional(),
  body('discount_amount').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Données invalides: ' + errors.array().map(e => e.msg).join(', '),
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
    // Récupérer le taux de conversion depuis la base de données
    let exchangeRate = 2850; // Valeur par défaut
    try {
      const rateResult = await query("SELECT value FROM app_settings WHERE key = 'exchange_rate_usd_cdf'");
      if (rateResult.rows.length > 0) {
        exchangeRate = parseFloat(rateResult.rows[0].value);
      }
    } catch (rateError) {
      console.log('Using default exchange rate:', exchangeRate);
    }
    
    const ticketPriceUSD = parseFloat(campaign.ticket_price);
    const totalAmountCDF = Math.ceil(ticketPriceUSD * ticket_count * exchangeRate);

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

      // Generate tickets with sequential numbering based on campaign
      const tickets = [];
      const totalTickets = parseInt(campaign.total_tickets) || 100;
      const padLength = Math.max(2, String(totalTickets).length);
      
      // Get the highest existing ticket number for this campaign to avoid duplicates
      const maxTicketResult = await client.query(
        `SELECT MAX(CAST(REPLACE(ticket_number, 'K-', '') AS INTEGER)) as max_num 
         FROM tickets 
         WHERE campaign_id = $1 AND ticket_number LIKE 'K-%'`,
        [campaign_id]
      );
      const maxExistingNumber = parseInt(maxTicketResult.rows[0]?.max_num) || 0;
      
      // Start from the highest of: existing max ticket number or sold_tickets count
      const startingNumber = Math.max(maxExistingNumber, parseInt(campaign.sold_tickets) || 0);
      console.log(`🎫 Wallet purchase - Starting ticket generation from number ${startingNumber + 1}`);
      
      for (let i = 0; i < ticket_count; i++) {
        // Use the calculated starting number + offset for sequential numbering
        const ticketSequence = startingNumber + i + 1;
        const ticketNumber = `K-${String(ticketSequence).padStart(padLength, '0')}`;
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
