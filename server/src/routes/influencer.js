const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Middleware: verify user is influencer
const verifyInfluencer = (req, res, next) => {
  if (!req.user || !req.user.is_influencer) {
    return res.status(403).json({ success: false, message: 'Accès réservé aux influenceurs' });
  }
  next();
};

// Get influencer dashboard stats
router.get('/dashboard', verifyToken, verifyInfluencer, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all promo codes for this influencer
    const promosResult = await query(
      `SELECT pc.id, pc.code, pc.discount_type, pc.discount_value, pc.commission_rate,
              pc.is_active, pc.current_uses, pc.max_uses, pc.created_at, pc.expires_at,
              COALESCE(pc.current_uses, 0) as total_uses
       FROM promo_codes pc
       WHERE pc.influencer_id = $1
       ORDER BY pc.created_at DESC`,
      [userId]
    );

    const promoCodes = promosResult.rows;
    const promoIds = promoCodes.map(p => p.id);

    // Get exchange rate (must be before revenue queries)
    let exchangeRate = 2850;
    try {
      const rateResult = await query(
        `SELECT value FROM app_settings WHERE key = 'exchange_rate_usd_cdf' LIMIT 1`
      );
      if (rateResult.rows.length > 0) {
        exchangeRate = parseFloat(rateResult.rows[0].value) || 2850;
      }
    } catch (e) {
      // Fallback to default
    }

    // If no promo codes, return empty dashboard
    if (promoIds.length === 0) {
      return res.json({
        success: true,
        data: {
          summary: {
            total_codes: 0,
            total_uses: 0,
            unique_users: 0,
            total_users: 0,
            total_discount_given: 0,
            total_commission: 0,
            total_commission_earned: 0,
            total_revenue_generated: 0
          },
          exchange_rate: 2850,
          promo_stats: [],
          promo_codes: [],
          recent_uses: [],
          monthly_stats: []
        }
      });
    }

    // Get usage stats per code
    const usageStatsResult = await query(
      `SELECT pcu.promo_code_id,
              COUNT(DISTINCT pcu.user_id) as unique_users,
              COUNT(*) as total_uses,
              SUM(pcu.discount_applied) as total_discount,
              MIN(pcu.used_at) as first_use,
              MAX(pcu.used_at) as last_use
       FROM promo_code_usage pcu
       WHERE pcu.promo_code_id = ANY($1)
       GROUP BY pcu.promo_code_id`,
      [promoIds]
    );

    const usageMap = {};
    usageStatsResult.rows.forEach(row => {
      usageMap[row.promo_code_id] = row;
    });

    // Get total revenue generated (purchases where promo was used)
    // Convert CDF amounts to USD using exchange rate
    const revenueResult = await query(
      `SELECT COALESCE(SUM(
              CASE WHEN UPPER(p.currency) = 'CDF' THEN p.total_amount / $2
                   ELSE p.total_amount END
            ), 0) as total_revenue,
              COUNT(DISTINCT p.id) as total_purchases,
              COUNT(DISTINCT p.user_id) as unique_buyers
       FROM purchases p
       WHERE p.promo_code_id = ANY($1) AND p.payment_status = 'completed'`,
      [promoIds, exchangeRate]
    );

    // Get revenue per promo code (for individual commission calculation)
    const revenuePerCodeResult = await query(
      `SELECT p.promo_code_id,
              COALESCE(SUM(
                CASE WHEN UPPER(p.currency) = 'CDF' THEN p.total_amount / $2
                     ELSE p.total_amount END
              ), 0) as revenue
       FROM purchases p
       WHERE p.promo_code_id = ANY($1) AND p.payment_status = 'completed'
       GROUP BY p.promo_code_id`,
      [promoIds, exchangeRate]
    );

    const revenuePerCode = {};
    revenuePerCodeResult.rows.forEach(row => {
      revenuePerCode[row.promo_code_id] = parseFloat(row.revenue) || 0;
    });

    const revenue = revenueResult.rows[0];

    // Get recent uses (last 20)
    const recentResult = await query(
      `SELECT pcu.*, pc.code, pc.commission_rate,
              u.name as user_name, u.email as user_email,
              p.total_amount as purchase_amount,
              p.currency as purchase_currency,
              CASE WHEN UPPER(p.currency) = 'CDF' THEN p.total_amount / $2
                   ELSE p.total_amount END as purchase_amount_usd
       FROM promo_code_usage pcu
       JOIN promo_codes pc ON pcu.promo_code_id = pc.id
       JOIN users u ON pcu.user_id = u.id
       LEFT JOIN purchases p ON pcu.purchase_id = p.id
       WHERE pcu.promo_code_id = ANY($1)
       ORDER BY pcu.used_at DESC
       LIMIT 20`,
      [promoIds, exchangeRate]
    );

    // Get monthly stats (last 6 months)
    const monthlyResult = await query(
      `SELECT 
        TO_CHAR(pcu.used_at, 'YYYY-MM') as month,
        COUNT(*) as uses,
        COUNT(DISTINCT pcu.user_id) as unique_users,
        SUM(pcu.discount_applied) as discount_total,
        COALESCE(SUM(
          CASE WHEN UPPER(p.currency) = 'CDF' THEN p.total_amount / $2
               ELSE p.total_amount END
        ), 0) as revenue,
        COALESCE(SUM(
          CASE WHEN UPPER(p.currency) = 'CDF' THEN p.total_amount / $2
               ELSE p.total_amount END
          * pc.commission_rate / 100
        ), 0) as commission
       FROM promo_code_usage pcu
       LEFT JOIN purchases p ON pcu.purchase_id = p.id AND p.payment_status = 'completed'
       JOIN promo_codes pc ON pcu.promo_code_id = pc.id
       WHERE pcu.promo_code_id = ANY($1)
         AND pcu.used_at >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(pcu.used_at, 'YYYY-MM')
       ORDER BY month DESC`,
      [promoIds, exchangeRate]
    );

    // Calculate totals
    let totalUses = 0;
    let totalUsers = 0;
    let totalDiscountGiven = 0;
    let totalCommissionEarned = 0;

    promoCodes.forEach(pc => {
      const stats = usageMap[pc.id];
      if (stats) {
        totalUses += parseInt(stats.total_uses) || 0;
        totalUsers += parseInt(stats.unique_users) || 0;
        totalDiscountGiven += parseFloat(stats.total_discount) || 0;
        // Commission = % of revenue generated through this code
        const commRate = parseFloat(pc.commission_rate) || 0;
        if (commRate > 0) {
          // Commission based on discount applied (simple model)
          totalCommissionEarned += (parseFloat(stats.total_discount) || 0) * (commRate / 100);
        }
      }
    });

    // Calculate actual commission from revenue - PER promo code with its own rate
    const totalRevenueGenerated = parseFloat(revenue.total_revenue) || 0;
    // Commission = sum of (revenue per code × that code's commission_rate)
    totalCommissionEarned = promoCodes.reduce((sum, pc) => {
      const pcRevenue = revenuePerCode[pc.id] || 0;
      const commRate = parseFloat(pc.commission_rate) || 0;
      return sum + (pcRevenue * commRate / 100);
    }, 0);

    res.json({
      success: true,
      data: {
        summary: {
          total_codes: promoCodes.length,
          total_uses: totalUses,
          unique_users: parseInt(revenue.unique_buyers) || 0,
          total_users: parseInt(revenue.unique_buyers) || 0,
          total_discount_given: totalDiscountGiven,
          total_commission: totalCommissionEarned,
          total_commission_earned: totalCommissionEarned,
          total_revenue_generated: totalRevenueGenerated,
          total_purchases: parseInt(revenue.total_purchases) || 0
        },
        exchange_rate: exchangeRate,
        promo_stats: promoCodes.map(pc => {
          const pcRevenue = revenuePerCode[pc.id] || 0;
          const commissionEarned = pcRevenue * (parseFloat(pc.commission_rate) || 0) / 100;
          return {
            code_id: pc.id,
            code: pc.code,
            discount_type: pc.discount_type,
            discount_value: parseFloat(pc.discount_value),
            commission_rate: parseFloat(pc.commission_rate) || 0,
            is_active: pc.is_active,
            total_uses: usageMap[pc.id] ? parseInt(usageMap[pc.id].total_uses) : parseInt(pc.current_uses) || 0,
            max_uses: pc.max_uses,
            unique_users: usageMap[pc.id] ? parseInt(usageMap[pc.id].unique_users) : 0,
            commission_earned: commissionEarned,
            revenue: pcRevenue,
            created_at: pc.created_at,
            expires_at: pc.expires_at,
            usage_by_month: {}
          };
        }),
        promo_codes: promoCodes.map(pc => ({
          id: pc.id,
          code: pc.code,
          discount_type: pc.discount_type,
          discount_value: parseFloat(pc.discount_value),
          commission_rate: parseFloat(pc.commission_rate) || 0,
          is_active: pc.is_active,
          current_uses: parseInt(pc.current_uses) || 0,
          max_uses: pc.max_uses,
          created_at: pc.created_at,
          expires_at: pc.expires_at,
          stats: usageMap[pc.id] ? {
            unique_users: parseInt(usageMap[pc.id].unique_users),
            total_uses: parseInt(usageMap[pc.id].total_uses),
            total_discount: parseFloat(usageMap[pc.id].total_discount),
            first_use: usageMap[pc.id].first_use,
            last_use: usageMap[pc.id].last_use
          } : null
        })),
        recent_uses: recentResult.rows.map(r => {
          const amountUsd = r.purchase_amount_usd ? parseFloat(r.purchase_amount_usd) : null;
          return {
            id: r.id,
            code: r.code,
            user_name: r.user_name,
            user_email: r.user_email,
            discount_applied: parseFloat(r.discount_applied),
            amount: amountUsd,
            purchase_amount: amountUsd,
            currency: r.purchase_currency || 'USD',
            commission_earned: amountUsd && r.commission_rate
              ? amountUsd * (parseFloat(r.commission_rate) / 100)
              : 0,
            used_at: r.used_at
          };
        }),
        monthly_stats: monthlyResult.rows.map(m => ({
          month: m.month,
          uses: parseInt(m.uses),
          unique_users: parseInt(m.unique_users),
          discount_total: parseFloat(m.discount_total),
          revenue: parseFloat(m.revenue),
          commission: parseFloat(m.commission) || 0
        }))
      }
    });
  } catch (error) {
    console.error('Influencer dashboard error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================
// GET USERS WHO USED MY PROMO CODES (influencer-facing)
// ============================================================
router.get('/my-users', verifyToken, verifyInfluencer, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT DISTINCT u.id, u.name, u.email, u.phone, u.created_at as user_since,
              pc.code as promo_code_used,
              pcu.used_at,
              pcu.discount_applied,
              p.total_amount as purchase_amount,
              p.currency as purchase_currency
       FROM promo_code_usage pcu
       JOIN promo_codes pc ON pcu.promo_code_id = pc.id
       JOIN users u ON pcu.user_id = u.id
       LEFT JOIN purchases p ON pcu.purchase_id = p.id
       WHERE pc.influencer_id = $1
       ORDER BY pcu.used_at DESC`,
      [userId]
    );

    // Aggregate unique users with their usage count
    const usersMap = {};
    result.rows.forEach(row => {
      if (!usersMap[row.id]) {
        usersMap[row.id] = {
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          user_since: row.user_since,
          total_uses: 0,
          total_discount: 0,
          total_purchases: 0,
          codes_used: [],
          last_use: null
        };
      }
      usersMap[row.id].total_uses += 1;
      usersMap[row.id].total_discount += parseFloat(row.discount_applied) || 0;
      usersMap[row.id].total_purchases += parseFloat(row.purchase_amount) || 0;
      if (!usersMap[row.id].codes_used.includes(row.promo_code_used)) {
        usersMap[row.id].codes_used.push(row.promo_code_used);
      }
      if (!usersMap[row.id].last_use || new Date(row.used_at) > new Date(usersMap[row.id].last_use)) {
        usersMap[row.id].last_use = row.used_at;
      }
    });

    const users = Object.values(usersMap).sort((a, b) => new Date(b.last_use) - new Date(a.last_use));

    res.json({
      success: true,
      total_unique_users: users.length,
      users
    });
  } catch (error) {
    console.error('Get influencer users error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================
// CHANGE PASSWORD (first login or voluntary)
// ============================================================
router.post('/change-password', verifyToken, verifyInfluencer, [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    // Get current password hash
    const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    const isValid = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect' });
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(new_password, salt);

    await query(
      'UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newHash, userId]
    );

    res.json({ success: true, message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================
// GET INFLUENCER PROFILE (includes influencer_uid, must_change_password)
// ============================================================
router.get('/profile', verifyToken, verifyInfluencer, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, phone, influencer_uid, must_change_password, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Get exchange rate for CDF->USD conversion
    let exchangeRate = 2850;
    try {
      const rateResult = await query(
        `SELECT value FROM app_settings WHERE key = 'exchange_rate_usd_cdf' LIMIT 1`
      );
      if (rateResult.rows.length > 0) {
        exchangeRate = parseFloat(rateResult.rows[0].value) || 2850;
      }
    } catch (e) { /* fallback */ }

    // Get commission balance (total earned minus total paid out)
    // Convert CDF amounts to USD before calculating commission
    const commissionResult = await query(
      `SELECT 
         COALESCE(SUM(
           CASE WHEN UPPER(p.currency) = 'CDF' THEN p.total_amount / $2
                ELSE p.total_amount END
           * pc.commission_rate / 100
         ), 0) as total_earned
       FROM purchases p
       JOIN promo_codes pc ON p.promo_code_id = pc.id
       WHERE pc.influencer_id = $1 AND p.payment_status = 'completed'`,
      [req.user.id, exchangeRate]
    );

    const paidOutResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid
       FROM influencer_payouts
       WHERE influencer_id = $1 AND status IN ('approved', 'paid') AND currency = 'USD'`,
      [req.user.id]
    );

    const totalEarned = parseFloat(commissionResult.rows[0].total_earned) || 0;
    const totalPaid = parseFloat(paidOutResult.rows[0].total_paid) || 0;
    const balance = totalEarned - totalPaid;

    res.json({
      success: true,
      profile: {
        ...result.rows[0],
        commission_balance: balance,
        total_earned: totalEarned,
        total_paid_out: totalPaid
      }
    });
  } catch (error) {
    console.error('Influencer profile error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================
// REQUEST PAYOUT
// ============================================================
router.post('/payout-request', verifyToken, verifyInfluencer, [
  body('influencer_uid').notEmpty().trim(),
  body('phone_number').notEmpty().trim(),
  body('percentage').isInt().isIn([25, 50, 75, 100]),
  body('currency').optional().isIn(['USD', 'CDF']).default('USD')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { influencer_uid, phone_number, percentage, currency } = req.body;
    const userId = req.user.id;

    // Verify influencer_uid matches the logged-in user
    const userResult = await query(
      'SELECT influencer_uid FROM users WHERE id = $1 AND is_influencer = TRUE',
      [userId]
    );
    if (userResult.rows.length === 0 || userResult.rows[0].influencer_uid !== influencer_uid) {
      return res.status(400).json({ success: false, message: 'ID Influenceur invalide' });
    }

    // Check if today is the 5th of the month
    const today = new Date();
    if (today.getDate() !== 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Les demandes de versement ne sont autorisées que le 5 de chaque mois' 
      });
    }

    // Check for existing pending payout this month
    const existingPayout = await query(
      `SELECT id FROM influencer_payouts 
       WHERE influencer_id = $1 AND status = 'pending'
         AND EXTRACT(MONTH FROM requested_at) = EXTRACT(MONTH FROM CURRENT_TIMESTAMP)
         AND EXTRACT(YEAR FROM requested_at) = EXTRACT(YEAR FROM CURRENT_TIMESTAMP)`,
      [userId]
    );
    if (existingPayout.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vous avez déjà une demande de versement en attente ce mois-ci' 
      });
    }

    // Get exchange rate for CDF->USD conversion
    let payoutExchangeRate = 2850;
    try {
      const rateRes = await query(
        "SELECT value FROM app_settings WHERE key = 'exchange_rate_usd_cdf' LIMIT 1"
      );
      if (rateRes.rows.length > 0) {
        payoutExchangeRate = parseFloat(rateRes.rows[0].value) || 2850;
      }
    } catch (e) { /* fallback */ }

    // Calculate available balance (convert CDF to USD)
    const commResult = await query(
      `SELECT COALESCE(SUM(
         CASE WHEN UPPER(p.currency) = 'CDF' THEN p.total_amount / $2
              ELSE p.total_amount END
         * pc.commission_rate / 100
       ), 0) as total_earned
       FROM purchases p
       JOIN promo_codes pc ON p.promo_code_id = pc.id
       WHERE pc.influencer_id = $1 AND p.payment_status = 'completed'`,
      [userId, payoutExchangeRate]
    );

    const paidResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid
       FROM influencer_payouts
       WHERE influencer_id = $1 AND status IN ('approved', 'paid') AND currency = 'USD'`,
      [userId]
    );

    const totalEarned = parseFloat(commResult.rows[0].total_earned) || 0;
    const totalPaid = parseFloat(paidResult.rows[0].total_paid) || 0;
    const balance = totalEarned - totalPaid;

    if (balance <= 0) {
      return res.status(400).json({ success: false, message: 'Solde insuffisant pour effectuer un versement' });
    }

    // Calculate amount based on percentage
    let amount = balance * (percentage / 100);
    amount = Math.round(amount * 100) / 100; // Round to 2 decimals

    // If currency is CDF, get exchange rate and convert
    let finalAmount = amount;
    let finalCurrency = currency || 'USD';
    if (finalCurrency === 'CDF') {
      let exchangeRate = 2850;
      try {
        const rateResult = await query(
          "SELECT value FROM app_settings WHERE key = 'exchange_rate_usd_cdf' LIMIT 1"
        );
        if (rateResult.rows.length > 0) {
          exchangeRate = parseFloat(rateResult.rows[0].value) || 2850;
        }
      } catch (e) { /* fallback */ }
      finalAmount = Math.round(amount * exchangeRate);
    }

    // Create payout request
    const payoutResult = await query(
      `INSERT INTO influencer_payouts (influencer_id, influencer_uid, amount, currency, percentage_requested, phone_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, influencer_uid, finalAmount, finalCurrency, percentage, phone_number]
    );

    res.json({
      success: true,
      message: 'Demande de versement soumise avec succès',
      payout: payoutResult.rows[0]
    });
  } catch (error) {
    console.error('Payout request error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================
// GET PAYOUT HISTORY
// ============================================================
router.get('/payouts', verifyToken, verifyInfluencer, async (req, res) => {
  try {
    const result = await query(
      `SELECT ip.*, u.name as validated_by_name
       FROM influencer_payouts ip
       LEFT JOIN users u ON ip.validated_by = u.id
       WHERE ip.influencer_id = $1
       ORDER BY ip.requested_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, payouts: result.rows });
  } catch (error) {
    console.error('Payout history error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
