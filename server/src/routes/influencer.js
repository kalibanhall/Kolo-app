const express = require('express');
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
    const revenueResult = await query(
      `SELECT COALESCE(SUM(p.total_amount), 0) as total_revenue,
              COUNT(DISTINCT p.id) as total_purchases,
              COUNT(DISTINCT p.user_id) as unique_buyers
       FROM purchases p
       WHERE p.promo_code_id = ANY($1) AND p.payment_status = 'completed'`,
      [promoIds]
    );

    // Get revenue per promo code (for individual commission calculation)
    const revenuePerCodeResult = await query(
      `SELECT p.promo_code_id,
              COALESCE(SUM(p.total_amount), 0) as revenue
       FROM purchases p
       WHERE p.promo_code_id = ANY($1) AND p.payment_status = 'completed'
       GROUP BY p.promo_code_id`,
      [promoIds]
    );

    const revenuePerCode = {};
    revenuePerCodeResult.rows.forEach(row => {
      revenuePerCode[row.promo_code_id] = parseFloat(row.revenue) || 0;
    });

    // Get exchange rate
    let exchangeRate = 2850;
    try {
      const rateResult = await query(
        `SELECT value FROM settings WHERE key = 'exchange_rate_usd_cdf' LIMIT 1`
      );
      if (rateResult.rows.length > 0) {
        exchangeRate = parseFloat(rateResult.rows[0].value) || 2850;
      }
    } catch (e) {
      // Fallback to default
    }

    const revenue = revenueResult.rows[0];

    // Get recent uses (last 20)
    const recentResult = await query(
      `SELECT pcu.*, pc.code, pc.commission_rate,
              u.name as user_name, u.email as user_email,
              p.total_amount as purchase_amount
       FROM promo_code_usage pcu
       JOIN promo_codes pc ON pcu.promo_code_id = pc.id
       JOIN users u ON pcu.user_id = u.id
       LEFT JOIN purchases p ON pcu.purchase_id = p.id
       WHERE pcu.promo_code_id = ANY($1)
       ORDER BY pcu.used_at DESC
       LIMIT 20`,
      [promoIds]
    );

    // Get monthly stats (last 6 months)
    const monthlyResult = await query(
      `SELECT 
        TO_CHAR(pcu.used_at, 'YYYY-MM') as month,
        COUNT(*) as uses,
        COUNT(DISTINCT pcu.user_id) as unique_users,
        SUM(pcu.discount_applied) as discount_total,
        COALESCE(SUM(p.total_amount), 0) as revenue,
        COALESCE(SUM(p.total_amount * pc.commission_rate / 100), 0) as commission
       FROM promo_code_usage pcu
       LEFT JOIN purchases p ON pcu.purchase_id = p.id AND p.payment_status = 'completed'
       JOIN promo_codes pc ON pcu.promo_code_id = pc.id
       WHERE pcu.promo_code_id = ANY($1)
         AND pcu.used_at >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(pcu.used_at, 'YYYY-MM')
       ORDER BY month DESC`,
      [promoIds]
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

    // Calculate actual commission from revenue
    const totalRevenueGenerated = parseFloat(revenue.total_revenue) || 0;
    // Recalculate commission: avg commission rate * total revenue
    const avgCommission = promoCodes.reduce((sum, pc) => sum + (parseFloat(pc.commission_rate) || 0), 0) / (promoCodes.length || 1);
    totalCommissionEarned = totalRevenueGenerated * (avgCommission / 100);

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
        recent_uses: recentResult.rows.map(r => ({
          id: r.id,
          code: r.code,
          user_name: r.user_name,
          user_email: r.user_email,
          discount_applied: parseFloat(r.discount_applied),
          amount: r.purchase_amount ? parseFloat(r.purchase_amount) : null,
          purchase_amount: r.purchase_amount ? parseFloat(r.purchase_amount) : null,
          commission_earned: r.purchase_amount && r.commission_rate
            ? parseFloat(r.purchase_amount) * (parseFloat(r.commission_rate) / 100)
            : 0,
          used_at: r.used_at
        })),
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

module.exports = router;
