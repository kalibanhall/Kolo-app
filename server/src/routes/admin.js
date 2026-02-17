const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { verifyToken, verifyAdmin, requireAdminLevel } = require('../middleware/auth');
const { logAdminAction } = require('../utils/logger');
const { selectRandomWinners } = require('../utils/helpers');
const { sendWinnerNotificationSMS } = require('../services/africasTalking');
const { sendWinnerNotification } = require('../services/emailService');
const { drawLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// All admin routes require authentication and admin role
router.use(verifyToken, verifyAdmin);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Get exchange rate for normalization (with fallback if table doesn't exist)
    let exchangeRate = 2850;
    try {
      const rateResult = await query("SELECT value FROM app_settings WHERE key = 'exchange_rate_usd_cdf'");
      if (rateResult.rows.length > 0) {
        exchangeRate = parseFloat(rateResult.rows[0].value);
      }
    } catch (e) {
      console.log('app_settings table not found, using default exchange rate');
    }

    // Default stats in case of errors
    let stats = {
      active_campaigns: 0,
      total_users: 0,
      participants_count: 0,
      total_tickets_sold: 0,
      pending_payments: 0,
      completed_payments: 0,
      total_revenue: 0,
      total_winners: 0
    };

    try {
      // Revenue calculation: convert CDF to USD for accurate total
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM campaigns WHERE status IN ('open', 'active')) as active_campaigns,
          (SELECT COUNT(*) FROM users WHERE is_active = true AND is_admin = false) as total_users,
          (SELECT COUNT(DISTINCT user_id) FROM tickets WHERE status = 'active') as participants_count,
          (SELECT COUNT(*) FROM tickets WHERE status IN ('active', 'winner')) as total_tickets_sold,
          (SELECT COUNT(*) FROM purchases WHERE payment_status = 'pending') as pending_payments,
          (SELECT COUNT(*) FROM purchases WHERE payment_status = 'completed') as completed_payments,
          (SELECT COALESCE(SUM(
            CASE 
              WHEN currency = 'CDF' THEN total_amount / ${exchangeRate}
              ELSE total_amount
            END
          ), 0) FROM purchases WHERE payment_status = 'completed') as total_revenue,
          (SELECT COUNT(*) FROM tickets WHERE is_winner = true OR status = 'winner') as total_winners
      `;

      const result = await query(statsQuery);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        stats = {
          active_campaigns: parseInt(row.active_campaigns) || 0,
          total_users: parseInt(row.total_users) || 0,
          participants_count: parseInt(row.participants_count) || 0,
          total_tickets_sold: parseInt(row.total_tickets_sold) || 0,
          pending_payments: parseInt(row.pending_payments) || 0,
          completed_payments: parseInt(row.completed_payments) || 0,
          total_revenue: parseFloat(row.total_revenue) || 0,
          total_winners: parseInt(row.total_winners) || 0
        };
      }
    } catch (statsError) {
      console.error('Stats query error:', statsError.message);
    }

    // Get current/active campaign stats  
    let campaign = null;
    try {
      const campaignResult = await query(
        `SELECT c.id, c.title, c.total_tickets, c.sold_tickets, c.ticket_price, c.status, c.draw_date,
                c.main_prize,
                (SELECT COUNT(*) FROM tickets t WHERE t.campaign_id = c.id AND t.status = 'active') as actual_sold,
                (SELECT COALESCE(SUM(
                  CASE 
                    WHEN p.currency = 'CDF' THEN p.total_amount / ${exchangeRate}
                    ELSE p.total_amount
                  END
                ), 0) FROM purchases p WHERE p.campaign_id = c.id AND p.payment_status = 'completed') as campaign_revenue
         FROM campaigns c
         WHERE c.status IN ('open', 'active')
         ORDER BY c.created_at DESC
         LIMIT 1`,
        []
      );

      if (campaignResult.rows.length > 0) {
        campaign = campaignResult.rows[0];
        
        // Sync sold_tickets if different from actual count
        if (parseInt(campaign.actual_sold) !== parseInt(campaign.sold_tickets)) {
          await query(
            'UPDATE campaigns SET sold_tickets = $1 WHERE id = $2',
            [campaign.actual_sold, campaign.id]
          );
          campaign.sold_tickets = parseInt(campaign.actual_sold);
        }
      }
    } catch (campaignError) {
      console.error('Campaign query error:', campaignError.message);
    }

    res.json({
      success: true,
      data: {
        ...stats,
        // Utiliser les recettes de la campagne active si disponible, sinon le total global
        total_revenue: campaign ? parseFloat(campaign.campaign_revenue) || 0 : stats.total_revenue,
        exchange_rate: exchangeRate,
        campaign: campaign ? {
          ...campaign,
          sold_tickets: parseInt(campaign.sold_tickets) || 0,
          total_tickets: parseInt(campaign.total_tickets) || 0,
          revenue: parseFloat(campaign.campaign_revenue) || 0
        } : null
      }
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Get analytics data for charts (REAL DATA)
router.get('/analytics', async (req, res) => {
  try {
    // Get exchange rate for normalization
    let exchangeRate = 2850;
    try {
      const rateResult = await query("SELECT value FROM app_settings WHERE key = 'exchange_rate_usd_cdf'");
      if (rateResult.rows.length > 0) {
        exchangeRate = parseFloat(rateResult.rows[0].value);
      }
    } catch (e) {
      console.log('app_settings table not found, using default exchange rate');
    }

    // 1. Revenue by month (last 6 months) - normalized to USD
    const revenueResult = await query(`
      SELECT 
        TO_CHAR(created_at, 'Mon') as month,
        COALESCE(SUM(
          CASE 
            WHEN currency = 'CDF' THEN total_amount / ${exchangeRate}
            ELSE total_amount
          END
        ), 0)::numeric as revenue
      FROM purchases 
      WHERE payment_status = 'completed'
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);

    // 2. Participants by campaign
    const participantsResult = await query(`
      SELECT 
        c.title as campaign,
        COUNT(DISTINCT t.user_id) as participants
      FROM campaigns c
      LEFT JOIN tickets t ON c.id = t.campaign_id
      GROUP BY c.id, c.title
      ORDER BY participants DESC
      LIMIT 5
    `);

    // 3. Campaign status distribution
    const campaignStatusResult = await query(`
      SELECT 
        CASE 
          WHEN status = 'open' THEN 'Ouvertes'
          WHEN status = 'closed' THEN 'Fermées'
          WHEN status = 'completed' THEN 'Terminées'
          ELSE 'Brouillons'
        END as name,
        COUNT(*) as value
      FROM campaigns
      GROUP BY status
    `);

    // 4. Sales trend (last 7 days) - normalized to USD
    const salesTrendResult = await query(`
      SELECT 
        TO_CHAR(p.created_at, 'DD/MM') as date,
        COUNT(DISTINCT t.id) as tickets,
        COALESCE(SUM(
          CASE 
            WHEN p.currency = 'CDF' THEN p.total_amount / ${exchangeRate}
            ELSE p.total_amount
          END
        ), 0)::numeric as revenue
      FROM purchases p
      LEFT JOIN tickets t ON p.id = t.purchase_id
      WHERE p.payment_status = 'completed'
        AND p.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(p.created_at, 'DD/MM'), DATE(p.created_at)
      ORDER BY DATE(p.created_at)
    `);

    // 5. Top campaigns by revenue - normalized to USD
    const topCampaignsResult = await query(`
      SELECT 
        c.title as name,
        COALESCE(SUM(
          CASE 
            WHEN p.currency = 'CDF' THEN p.total_amount / ${exchangeRate}
            ELSE p.total_amount
          END
        ), 0)::numeric as revenue
      FROM campaigns c
      LEFT JOIN purchases p ON c.id = p.campaign_id AND p.payment_status = 'completed'
      GROUP BY c.id, c.title
      ORDER BY revenue DESC
      LIMIT 5
    `);

    // 6. Payment methods distribution
    const paymentMethodsResult = await query(`
      SELECT 
        COALESCE(payment_provider, payment_method, 'Non spécifié') as name,
        COUNT(*) as value
      FROM purchases
      WHERE payment_status = 'completed'
      GROUP BY COALESCE(payment_provider, payment_method, 'Non spécifié')
      ORDER BY value DESC
    `);

    res.json({
      success: true,
      data: {
        revenue: revenueResult.rows.map(r => ({ month: r.month, revenue: parseFloat(r.revenue) })),
        participants: participantsResult.rows.map(r => ({ campaign: r.campaign, participants: parseInt(r.participants) })),
        campaignStatus: campaignStatusResult.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
        salesTrend: salesTrendResult.rows.map(r => ({ date: r.date, tickets: parseInt(r.tickets), revenue: parseFloat(r.revenue) })),
        topCampaigns: topCampaignsResult.rows.map(r => ({ name: r.name, revenue: parseFloat(r.revenue) })),
        paymentMethods: paymentMethodsResult.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
        exchange_rate: exchangeRate
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get participants list with detailed stats
router.get('/participants', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'tickets';
    const sortOrder = req.query.sortOrder || 'desc';

    // Get exchange rate for normalization (with fallback)
    let exchangeRate = 2850;
    try {
      const rateResult = await query("SELECT value FROM app_settings WHERE key = 'exchange_rate_usd_cdf'");
      if (rateResult.rows.length > 0) {
        exchangeRate = parseFloat(rateResult.rows[0].value);
      }
    } catch (e) {
      console.log('app_settings table not found, using default exchange rate');
    }

    // Check if currency column exists in purchases table
    let hasCurrencyColumn = false;
    try {
      await query("SELECT currency FROM purchases LIMIT 1");
      hasCurrencyColumn = true;
    } catch (e) {
      console.log('Currency column not found in purchases');
    }

    // Build query based on available columns
    // Normalize amounts to USD for consistent display
    const amountSelect = hasCurrencyColumn 
      ? `COALESCE(SUM(
          CASE 
            WHEN p.currency = 'CDF' THEN p.total_amount / ${exchangeRate}
            ELSE p.total_amount 
          END
        ), 0) as total_spent_usd`
      : `COALESCE(SUM(p.total_amount), 0) as total_spent_usd`;

    const result = await query(
      `SELECT 
        u.id as user_id, u.name, u.email, u.phone, u.created_at as join_date, u.is_active,
        COUNT(DISTINCT t.id) as ticket_count,
        COUNT(DISTINCT p.id) as purchases,
        ${amountSelect},
        MAX(p.created_at) as last_purchase,
        (SELECT COUNT(*) FROM users WHERE is_admin = false) as total_count,
        (SELECT json_agg(json_build_object('campaign_id', sub.campaign_id, 'campaign_title', sub.title, 'tickets', sub.cnt))
         FROM (
           SELECT t2.campaign_id, c2.title, COUNT(*) as cnt
           FROM tickets t2
           JOIN campaigns c2 ON t2.campaign_id = c2.id
           WHERE t2.user_id = u.id
           GROUP BY t2.campaign_id, c2.title
         ) sub
        ) as campaigns_participation
       FROM users u
       LEFT JOIN purchases p ON u.id = p.user_id AND p.payment_status = 'completed'
       LEFT JOIN tickets t ON u.id = t.user_id
       WHERE u.is_admin = false
       GROUP BY u.id, u.name, u.email, u.phone, u.created_at, u.is_active
       ORDER BY ${sortBy === 'tickets' ? 'ticket_count' : sortBy === 'amount' ? 'total_spent_usd' : sortBy} ${sortOrder.toUpperCase()}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;

    res.json({
      success: true,
      data: {
        participants: result.rows.map(p => ({
          user_id: p.user_id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          ticket_count: parseInt(p.ticket_count),
          purchases: parseInt(p.purchases),
          total_spent: parseFloat(p.total_spent_usd), // Now in USD
          currency: 'USD', // Normalized to USD
          join_date: p.join_date,
          last_purchase: p.last_purchase,
          is_active: p.is_active !== false && parseInt(p.ticket_count) > 0,
          campaigns_participation: p.campaigns_participation || []
        })),
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
          total: parseInt(totalCount)
        },
        exchange_rate: exchangeRate
      }
    });

  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get tickets for a specific campaign (for manual draw selection)
// Returns SOLD tickets only (only existing tickets can be drawn)
router.get('/campaigns/:campaignId/tickets', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // Get campaign info
    const campaignResult = await query(
      'SELECT id, total_tickets FROM campaigns WHERE id = $1',
      [campaignId]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Count total sold tickets
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM tickets t
       WHERE t.campaign_id = $1 AND t.status = 'active'`,
      [campaignId]
    );
    const totalSold = parseInt(countResult.rows[0].total);

    // Get sold tickets with optional search
    let query_str = `
      SELECT t.id, t.ticket_number, t.created_at, t.status,
             u.id as user_id, u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      WHERE t.campaign_id = $1 AND t.status = 'active'
    `;
    const params = [campaignId];

    if (search) {
      query_str += ` AND (t.ticket_number ILIKE $2 OR u.name ILIKE $2)`;
      params.push(`%${search}%`);
    }

    query_str += ` ORDER BY t.ticket_number ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const ticketsResult = await query(query_str, params);

    res.json({
      success: true,
      tickets: ticketsResult.rows.map(t => ({
        id: t.id,
        ticket_number: t.ticket_number,
        user_name: t.user_name,
        user_email: t.user_email,
        user_phone: t.user_phone,
        status: t.status,
        is_sold: true
      })),
      total: totalSold,
      total_available: 0, // No unsold tickets shown for draw
      total_sold: totalSold,
      page,
      limit,
      has_more: offset + limit < totalSold
    });

  } catch (error) {
    console.error('Get campaign tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Perform lottery draw (rate limited to 1 per hour) - L2+
router.post('/draw', requireAdminLevel(2), drawLimiter, [
  body('campaign_id').isInt({ min: 1 }),
  body('bonus_winners_count').optional().isInt({ min: 0, max: 10 }),
  body('draw_method').optional().isIn(['automatic', 'manual']),
  body('manual_ticket_number').optional().trim()
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

    const { 
      campaign_id, 
      bonus_winners_count = 0,
      draw_method = 'automatic',
      manual_ticket_number 
    } = req.body;

    // Validate manual draw requirements
    if (draw_method === 'manual' && !manual_ticket_number) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro de ticket est requis pour un tirage manuel'
      });
    }

    const winnerData = await transaction(async (client) => {
      // Check campaign exists and hasn't been drawn yet
      const campaignResult = await client.query(
        'SELECT * FROM campaigns WHERE id = $1',
        [campaign_id]
      );

      if (campaignResult.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      const campaign = campaignResult.rows[0];

      if (campaign.status === 'completed') {
        throw new Error('Draw already completed for this campaign');
      }

      // Get all tickets for this campaign
      const ticketsResult = await client.query(
        'SELECT * FROM tickets WHERE campaign_id = $1 AND status = $2',
        [campaign_id, 'active']
      );

      if (ticketsResult.rows.length === 0) {
        throw new Error('No tickets available for draw');
      }

      const allTickets = ticketsResult.rows;
      let mainWinner;

      // Determine main winner based on draw method
      if (draw_method === 'manual') {
        // Manual selection - find ticket by number
        mainWinner = allTickets.find(t => t.ticket_number === manual_ticket_number);
        
        if (!mainWinner) {
          throw new Error(`Le ticket ${manual_ticket_number} n'existe pas ou n'est pas valide pour cette campagne`);
        }
      } else {
        // Automatic random selection - exclude bonus tickets
        [mainWinner] = selectRandomWinners(allTickets, 1, null, true);
        
        if (!mainWinner) {
          throw new Error('Aucun ticket éligible trouvé pour le tirage');
        }
      }

      // Update main winner ticket
      await client.query(
        `UPDATE tickets 
         SET is_winner = true, prize_category = 'main', status = 'winner'
         WHERE id = $1`,
        [mainWinner.id]
      );

      // Create draw result
      const drawResult = await client.query(
        `INSERT INTO draw_results (campaign_id, main_winner_ticket_id, draw_date, draw_method, verified_by)
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
         RETURNING *`,
        [
          campaign_id, 
          mainWinner.id, 
          draw_method === 'manual' ? 'manual_selection' : 'random_selection', 
          req.user.id
        ]
      );

      const draw = drawResult.rows[0];

      // Select bonus winners if requested (always automatic, exclude main winner's user)
      // IMPORTANT: Le gagnant bonus ne doit JAMAIS être le même utilisateur que le gagnant principal
      // IMPORTANT: Max 10 bonus winners, and max 1 bonus ticket per unique user
      if (bonus_winners_count > 0) {
        const effectiveBonusCount = Math.min(bonus_winners_count, 10); // Hard cap at 10
        
        // Exclude BOTH the main winner ticket AND all tickets from the same user
        const remainingTickets = allTickets.filter(t => 
          t.id !== mainWinner.id && t.user_id !== mainWinner.user_id
        );
        
        // selectRandomWinners already ensures unique users (1 bonus per user)
        const bonusWinners = selectRandomWinners(remainingTickets, effectiveBonusCount, mainWinner.user_id, true);

        // Verify no bonus winner is the main winner's user (extra safety check)
        const validBonusWinners = bonusWinners.filter(ticket => ticket.user_id !== mainWinner.user_id);
        
        if (validBonusWinners.length < bonusWinners.length) {
          console.warn('⚠️ Some bonus tickets were filtered out because they belonged to main winner user');
        }

        for (const ticket of validBonusWinners) {
          // Update ticket
          await client.query(
            `UPDATE tickets 
             SET is_winner = true, prize_category = 'bonus', status = 'winner'
             WHERE id = $1`,
            [ticket.id]
          );

          // Insert bonus winner
          await client.query(
            `INSERT INTO bonus_winners (draw_result_id, ticket_id, prize_description, prize_value)
             VALUES ($1, $2, $3, $4)`,
            [draw.id, ticket.id, 'Bon d\'achat', 100]
          );
        }
        
        // Update actual bonus winners count in draw result if some were filtered
        if (validBonusWinners.length > 0) {
          // Create notifications for bonus winners
          for (const ticket of validBonusWinners) {
            await client.query(
              `INSERT INTO notifications (user_id, type, title, message, data)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                ticket.user_id,
                'bonus_winner',
                '🎁 FÉLICITATIONS ! Vous avez gagné un prix bonus !',
                `Vous avez gagné un prix bonus de la tombola ! Ticket: ${ticket.ticket_number}`,
                JSON.stringify({ draw_id: draw.id, prize: 'Prix Bonus' })
              ]
            );
          }
        }
      }

      // Mark all non-winning tickets as 'lost'
      await client.query(
        `UPDATE tickets 
         SET status = 'lost'
         WHERE campaign_id = $1 
           AND is_winner = false 
           AND status = 'active'`,
        [campaign_id]
      );
      
      console.log(`✅ All non-winning tickets marked as 'lost' for campaign ${campaign_id}`);

      // Update campaign status
      await client.query(
        `UPDATE campaigns 
         SET status = 'completed', draw_date = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [campaign_id]
      );

      // Create notifications for winners
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          mainWinner.user_id,
          'winner',
          '🎉 FÉLICITATIONS ! Vous avez gagné !',
          `Vous êtes le grand gagnant de la tombola ! Ticket: ${mainWinner.ticket_number}`,
          JSON.stringify({ draw_id: draw.id, prize: campaign.main_prize })
        ]
      );

      // Send Firebase push notifications and create DB notifications for ALL participants
      try {
        const { 
          notifyWinner, 
          notifyDrawCompleted, 
          createParticipantNotifications,
          isInitialized 
        } = require('../services/firebaseNotifications');
        
        // Create database notifications for ALL campaign participants
        const campaignName = campaign.name || campaign.title;
        await createParticipantNotifications(
          campaign_id,
          'draw_completed',
          '🎲 Tirage effectué !',
          `Le tirage de la tombola "${campaignName}" a été effectué. Consultez les résultats pour savoir si vous avez gagné !`,
          { 
            draw_id: draw.id, 
            main_prize: campaign.main_prize,
            total_winners: 1 + bonus_winners_count
          }
        );
        
        if (isInitialized()) {
          // Notify the main winner via push
          await notifyWinner(
            mainWinner.user_id,
            campaignName,
            campaign.main_prize
          );

          // Notify all campaign participants about the draw via push
          await notifyDrawCompleted(
            campaign_id,
            campaignName,
            campaign.main_prize
          );
        }
      } catch (firebaseError) {
        console.error('Firebase notification error:', firebaseError);
        // Don't fail the draw if push notifications fail
      }

      // Log admin action
      await client.query(
        `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'PERFORM_DRAW',
          'campaign',
          campaign_id,
          JSON.stringify({ 
            draw_method,
            main_winner: mainWinner.ticket_number, 
            bonus_winners: bonus_winners_count 
          })
        ]
      );

      // Return winner data for notifications
      return { mainWinner, bonusWinners: bonus_winners_count };
    });

    // Send notifications to winners (email + SMS)
    try {
      // Check if winnerData is valid
      if (!winnerData || !winnerData.mainWinner || !winnerData.mainWinner.id) {
        console.log('⚠️ Winner data not available for notifications');
      } else {
        // Get winner details with phone and email
        const winnerDetailsResult = await query(
          `SELECT t.ticket_number, u.name, u.email, u.phone, c.title as campaign_title, c.main_prize
           FROM tickets t
           JOIN users u ON t.user_id = u.id
           JOIN campaigns c ON t.campaign_id = c.id
           WHERE t.id = $1`,
          [winnerData.mainWinner.id]
        );

        const winnerDetails = winnerDetailsResult.rows[0];

        if (winnerDetails) {
          // Send email to main winner
          console.log('📧 Sending winner notification email...');
          await sendWinnerNotification({
            to: winnerDetails.email,
            userName: winnerDetails.name,
            prize: winnerDetails.main_prize,
            ticketNumber: winnerDetails.ticket_number,
            campaignTitle: winnerDetails.campaign_title
          });
          console.log('✅ Winner email sent');

          // Send SMS to main winner
          console.log('📱 Sending winner notification SMS...');
          await sendWinnerNotificationSMS(
            winnerDetails.phone,
            winnerDetails.name,
            winnerDetails.main_prize,
            winnerDetails.ticket_number
          );
          console.log('✅ Winner SMS sent');
        }
      }
    } catch (notificationError) {
      console.error('❌ Error sending winner notifications:', notificationError);
      // Don't fail the draw if notifications fail
    }

    res.json({
      success: true,
      message: 'Draw completed successfully'
    });

  } catch (error) {
    console.error('Perform draw error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during draw'
    });
  }
});

// Note: See full /logs route with filters below (around line 715)

// Get draw results
router.get('/draws', async (req, res) => {
  try {
    // First check if second_prize and third_prize columns exist
    const columnCheck = await query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'campaigns' AND column_name IN ('second_prize', 'third_prize')
    `);
    const hasSecondPrize = columnCheck.rows.some(r => r.column_name === 'second_prize');
    const hasThirdPrize = columnCheck.rows.some(r => r.column_name === 'third_prize');

    // Build dynamic query based on available columns
    const prizeColumns = [];
    if (hasSecondPrize) prizeColumns.push('c.second_prize');
    if (hasThirdPrize) prizeColumns.push('c.third_prize');
    const extraColumns = prizeColumns.length > 0 ? ', ' + prizeColumns.join(', ') : '';

    // Get main draw results
    const drawsResult = await query(
      `SELECT 
        dr.*,
        c.title as campaign_title,
        c.main_prize${extraColumns},
        c.image_url as campaign_image,
        t.ticket_number as winning_ticket,
        u.name as winner_name,
        u.email as winner_email,
        u.phone as winner_phone,
        (SELECT COUNT(*) FROM bonus_winners WHERE draw_result_id = dr.id) as bonus_winners_count
       FROM draw_results dr
       JOIN campaigns c ON dr.campaign_id = c.id
       JOIN tickets t ON dr.main_winner_ticket_id = t.id
       JOIN users u ON t.user_id = u.id
       ORDER BY dr.draw_date DESC`
    );

    // Get bonus winners for each draw
    const draws = [];
    for (const draw of drawsResult.rows) {
      // Fetch bonus winners for this draw (with backward compatibility)
      let bonusWinnersResult;
      try {
        bonusWinnersResult = await query(
          `SELECT 
            bw.id,
            bw.ticket_id,
            bw.draw_result_id,
            t.ticket_number,
            u.name as user_name,
            u.email as user_email,
            u.phone as user_phone
           FROM bonus_winners bw
           JOIN tickets t ON bw.ticket_id = t.id
           JOIN users u ON t.user_id = u.id
           WHERE bw.draw_result_id = $1
           ORDER BY bw.id`,
          [draw.id]
        );
      } catch (err) {
        console.error('Error fetching bonus winners:', err);
        bonusWinnersResult = { rows: [] };
      }

      draws.push({
        ...draw,
        bonus_winners: bonusWinnersResult.rows.map((bw, index) => ({
          id: bw.id,
          position: index + 2, // Position 2, 3, 4... (1 is main winner)
          prize: null,
          ticket_number: bw.ticket_number,
          user_name: bw.user_name,
          user_email: bw.user_email,
          user_phone: bw.user_phone
        }))
      });
    }

    res.json({
      success: true,
      data: draws
    });

  } catch (error) {
    console.error('Get draws error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Export data (CSV/PDF simulation) - L2+
router.post('/export', requireAdminLevel(2), (req, res) => {
  try {
    const { type, format } = req.body;
    
    // Simulate export generation
    const exportId = `EXP-${Date.now()}`;
    
    // In a real application, this would generate actual files
    setTimeout(() => {
      res.json({
        success: true,
        message: `${type} export generated successfully`,
        data: {
          export_id: exportId,
          format,
          download_url: `/api/admin/download/${exportId}`,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });
    }, 1000);

  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get suspicious accounts - L3 only
router.get('/suspicious-accounts', requireAdminLevel(3), (req, res) => {
  try {
    const suspiciousAccounts = [
      {
        id: 'SA001',
        username: '@UserBot1',
        reason: '50 tickets purchased in 10 minutes',
        risk_level: 'high',
        tickets_count: 50,
        purchase_duration: '10 minutes',
        ip_addresses: ['192.168.1.100'],
        flagged_at: new Date()
      },
      {
        id: 'SA002',
        username: '@FakeAccount',
        reason: 'Multiple IP addresses detected',
        risk_level: 'medium',
        tickets_count: 25,
        purchase_duration: '2 hours',
        ip_addresses: ['10.0.0.1', '172.16.0.1', '203.0.113.1'],
        flagged_at: new Date()
      }
    ];
    
    res.json({
      success: true,
      data: suspiciousAccounts
    });

  } catch (error) {
    console.error('Get suspicious accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get admin logs with pagination and filters - L3 only
router.get('/logs', requireAdminLevel(3), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      entity_type,
      admin_id,
      date_start,
      date_end,
    } = req.query;

    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (action) {
      conditions.push(`al.action = $${paramIndex++}`);
      params.push(action);
    }
    if (entity_type) {
      conditions.push(`al.entity_type = $${paramIndex++}`);
      params.push(entity_type);
    }
    if (admin_id) {
      conditions.push(`al.admin_id = $${paramIndex++}`);
      params.push(admin_id);
    }
    if (date_start) {
      conditions.push(`al.created_at >= $${paramIndex++}`);
      params.push(date_start);
    }
    if (date_end) {
      conditions.push(`al.created_at <= $${paramIndex++}`);
      params.push(date_end);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM admin_logs al
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get logs with admin user info
    const logsQuery = `
      SELECT 
        al.id,
        al.admin_id,
        u.name as admin_name,
        u.email as admin_email,
        al.action,
        al.entity_type,
        al.entity_id,
        al.details,
        al.ip_address,
        al.user_agent,
        al.created_at
      FROM admin_logs al
      LEFT JOIN users u ON al.admin_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    params.push(limit, offset);

    const logsResult = await query(logsQuery, params);

    res.json({
      success: true,
      data: {
        logs: logsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get admin logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Get admin log statistics - L3 only
router.get('/logs/stats', requireAdminLevel(3), async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_logs,
        COUNT(DISTINCT admin_id) as unique_admins,
        COUNT(DISTINCT DATE(created_at)) as active_days,
        (
          SELECT action 
          FROM admin_logs 
          GROUP BY action 
          ORDER BY COUNT(*) DESC 
          LIMIT 1
        ) as most_common_action,
        (
          SELECT COUNT(*) 
          FROM admin_logs 
          WHERE created_at >= NOW() - INTERVAL '24 hours'
        ) as logs_last_24h,
        (
          SELECT COUNT(*) 
          FROM admin_logs 
          WHERE created_at >= NOW() - INTERVAL '7 days'
        ) as logs_last_7d
    `;

    const result = await query(statsQuery);
    const stats = result.rows[0];

    // Get action breakdown
    const actionsQuery = `
      SELECT action, COUNT(*) as count
      FROM admin_logs
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `;
    const actionsResult = await query(actionsQuery);

    // Get recent active admins
    const adminsQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(al.id) as action_count,
        MAX(al.created_at) as last_action
      FROM admin_logs al
      JOIN users u ON al.admin_id = u.id
      WHERE al.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY u.id, u.name, u.email
      ORDER BY action_count DESC
      LIMIT 10
    `;
    const adminsResult = await query(adminsQuery);

    res.json({
      success: true,
      data: {
        stats,
        action_breakdown: actionsResult.rows,
        active_admins: adminsResult.rows,
      },
    });
  } catch (error) {
    console.error('Get admin logs stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ============================================
// PRIZE DELIVERY MANAGEMENT ROUTES
// ============================================

// Get all winners with delivery tracking
router.get('/winners', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      delivery_status, 
      campaign_id,
      search 
    } = req.query;

    const offset = (page - 1) * limit;
    // Check for both is_winner = true AND status = 'winner' for compatibility
    let whereConditions = ['(t.is_winner = true OR t.status = $1)'];
    const queryParams = ['winner'];
    let paramCount = 1;

    if (delivery_status) {
      paramCount++;
      whereConditions.push(`t.delivery_status = $${paramCount}`);
      queryParams.push(delivery_status);
    }

    if (campaign_id) {
      paramCount++;
      whereConditions.push(`t.campaign_id = $${paramCount}`);
      queryParams.push(campaign_id);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(u.name ILIKE $${paramCount} OR u.phone ILIKE $${paramCount} OR t.ticket_number ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      JOIN campaigns c ON t.campaign_id = c.id
      ${whereClause}
    `;
    console.log('Winners count query:', countQuery, queryParams);
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    console.log('Total winners found:', total);

    // Get winners with pagination
    const winnersQuery = `
      SELECT 
        t.id,
        t.ticket_number,
        t.prize_category,
        t.delivery_status,
        t.delivery_date,
        t.delivery_address,
        t.delivery_notes,
        t.tracking_number,
        t.delivery_updated_at,
        t.created_at as win_date,
        u.id as user_id,
        u.name,
        u.name as full_name,
        u.email,
        u.phone,
        u.address_line1 as address,
        u.city,
        u.province,
        c.id as campaign_id,
        c.title as campaign_title,
        c.main_prize,
        c.secondary_prizes as bonus_prizes
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      JOIN campaigns c ON t.campaign_id = c.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(limit, offset);
    const winnersResult = await query(winnersQuery, queryParams);

    res.json({
      success: true,
      data: winnersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get winners error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get winner delivery statistics
router.get('/winners/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_winners,
        COUNT(CASE WHEN delivery_status = 'pending' OR delivery_status IS NULL THEN 1 END) as pending,
        COUNT(CASE WHEN delivery_status = 'contacted' THEN 1 END) as contacted,
        COUNT(CASE WHEN delivery_status = 'shipped' THEN 1 END) as shipped,
        COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN delivery_status = 'claimed' THEN 1 END) as claimed,
        COUNT(CASE WHEN prize_category = 'main' THEN 1 END) as main_prizes,
        COUNT(CASE WHEN prize_category = 'bonus' THEN 1 END) as bonus_prizes
      FROM tickets
      WHERE is_winner = true OR status = 'winner'
    `;

    const result = await query(statsQuery);
    const stats = result.rows[0];
    console.log('Winner stats:', stats);

    // Get recent deliveries
    const recentQuery = `
      SELECT 
        t.id,
        t.ticket_number,
        t.delivery_status,
        t.delivery_updated_at,
        u.name,
        c.title as campaign_title
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      JOIN campaigns c ON t.campaign_id = c.id
      WHERE (t.is_winner = true OR t.status = 'winner') AND t.delivery_updated_at IS NOT NULL
      ORDER BY t.delivery_updated_at DESC
      LIMIT 5
    `;
    const recentResult = await query(recentQuery);

    res.json({
      success: true,
      data: {
        stats,
        recent_updates: recentResult.rows
      }
    });
  } catch (error) {
    console.error('Get winner stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update winner delivery status - L3 only
router.patch('/winners/:ticketId/delivery', requireAdminLevel(3), [
  body('delivery_status')
    .isIn(['pending', 'contacted', 'shipped', 'delivered', 'claimed'])
    .withMessage('Invalid delivery status'),
  body('delivery_address').optional().trim(),
  body('delivery_notes').optional().trim(),
  body('tracking_number').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { ticketId } = req.params;
    const { 
      delivery_status, 
      delivery_address, 
      delivery_notes, 
      tracking_number 
    } = req.body;

    // Check if ticket exists and is a winner
    const checkQuery = `
      SELECT t.*, u.name, u.email, u.phone, c.title as campaign_title
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      JOIN campaigns c ON t.campaign_id = c.id
      WHERE t.id = $1 AND t.is_winner = true
    `;
    const checkResult = await query(checkQuery, [ticketId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Winner ticket not found'
      });
    }

    const ticket = checkResult.rows[0];

    // Build update query dynamically
    const updates = ['delivery_status = $1', 'delivery_updated_at = NOW()'];
    const params = [delivery_status];
    let paramCount = 1;

    if (delivery_address !== undefined) {
      paramCount++;
      updates.push(`delivery_address = $${paramCount}`);
      params.push(delivery_address);
    }

    if (delivery_notes !== undefined) {
      paramCount++;
      updates.push(`delivery_notes = $${paramCount}`);
      params.push(delivery_notes);
    }

    if (tracking_number !== undefined) {
      paramCount++;
      updates.push(`tracking_number = $${paramCount}`);
      params.push(tracking_number);
    }

    // Set delivery_date when status changes to 'delivered'
    if (delivery_status === 'delivered') {
      updates.push('delivery_date = NOW()');
    }

    paramCount++;
    params.push(ticketId);

    const updateQuery = `
      UPDATE tickets
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, params);
    const updatedTicket = result.rows[0];

    // Send notification based on status
    try {
      if (delivery_status === 'shipped' && tracking_number) {
        await sendWinnerNotification({
          to: ticket.email,
          name: ticket.name,
          campaignTitle: ticket.campaign_title,
          ticketNumber: ticket.ticket_number,
          message: `Votre prix a été expédié ! Numéro de suivi : ${tracking_number}`
        });
      } else if (delivery_status === 'delivered') {
        await sendWinnerNotification({
          to: ticket.email,
          name: ticket.name,
          campaignTitle: ticket.campaign_title,
          ticketNumber: ticket.ticket_number,
          message: 'Votre prix a été livré ! Merci de confirmer la réception.'
        });
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
      // Continue even if notification fails
    }

    // Log admin action
    await logAdminAction(
      req.user.id,
      'update_delivery',
      'ticket',
      ticketId,
      {
        old_status: ticket.delivery_status,
        new_status: delivery_status,
        tracking_number,
        notes: delivery_notes
      },
      req
    );

    res.json({
      success: true,
      message: 'Delivery status updated successfully',
      data: updatedTicket
    });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Bulk update delivery status - L3 only
router.post('/winners/bulk-update', requireAdminLevel(3), [
  body('ticket_ids').isArray().withMessage('ticket_ids must be an array'),
  body('delivery_status')
    .isIn(['pending', 'contacted', 'shipped', 'delivered', 'claimed'])
    .withMessage('Invalid delivery status'),
  body('delivery_notes').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { ticket_ids, delivery_status, delivery_notes } = req.body;

    if (ticket_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No tickets selected'
      });
    }

    const updates = ['delivery_status = $1', 'delivery_updated_at = NOW()'];
    const params = [delivery_status];

    if (delivery_notes) {
      updates.push('delivery_notes = $2');
      params.push(delivery_notes);
    }

    if (delivery_status === 'delivered') {
      updates.push('delivery_date = NOW()');
    }

    const placeholders = ticket_ids.map((_, i) => 
      `$${params.length + i + 1}`
    ).join(',');
    params.push(...ticket_ids);

    const updateQuery = `
      UPDATE tickets
      SET ${updates.join(', ')}
      WHERE id IN (${placeholders}) AND is_winner = true
      RETURNING id, ticket_number
    `;

    const result = await query(updateQuery, params);

    // Log admin action
    await logAdminAction(
      req.user.id,
      'bulk_update_delivery',
      'tickets',
      null,
      {
        count: result.rows.length,
        ticket_ids,
        new_status: delivery_status,
        notes: delivery_notes
      },
      req
    );

    res.json({
      success: true,
      message: `Updated ${result.rows.length} tickets successfully`,
      data: {
        updated_count: result.rows.length,
        tickets: result.rows
      }
    });
  } catch (error) {
    console.error('Bulk update delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all transactions with details - L2+
router.get('/transactions', requireAdminLevel(2), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status; // 'completed', 'pending', 'failed', 'cancelled'

    // Get exchange rate for display (with fallback)
    let exchangeRate = 2850;
    try {
      const rateResult = await query("SELECT value FROM app_settings WHERE key = 'exchange_rate_usd_cdf'");
      if (rateResult.rows.length > 0) {
        exchangeRate = parseFloat(rateResult.rows[0].value);
      }
    } catch (e) {
      console.log('app_settings table not found, using default exchange rate');
    }

    // Get total count first
    let totalCount = 0;
    try {
      const countQuery = status 
        ? "SELECT COUNT(*) FROM purchases WHERE payment_status = $1"
        : "SELECT COUNT(*) FROM purchases";
      const countResult = await query(countQuery, status ? [status] : []);
      totalCount = parseInt(countResult.rows[0].count) || 0;
    } catch (e) {
      console.error('Count query error:', e);
    }

    // Build the main query - simpler approach
    let mainQuery;
    let params;
    
    if (status) {
      mainQuery = `
        SELECT 
          p.id as transaction_id,
          p.transaction_id as external_transaction_id,
          p.user_id,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          p.phone_number as payment_phone,
          p.campaign_id,
          c.title as campaign_title,
          p.total_amount,
          COALESCE(p.currency, 'USD') as currency,
          p.ticket_count,
          p.payment_method,
          p.payment_provider,
          p.payment_status,
          p.created_at,
          p.updated_at
        FROM purchases p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN campaigns c ON p.campaign_id = c.id
        WHERE p.payment_status = $1
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      params = [status, limit, offset];
    } else {
      mainQuery = `
        SELECT 
          p.id as transaction_id,
          p.transaction_id as external_transaction_id,
          p.user_id,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          p.phone_number as payment_phone,
          p.campaign_id,
          c.title as campaign_title,
          p.total_amount,
          COALESCE(p.currency, 'USD') as currency,
          p.ticket_count,
          p.payment_method,
          p.payment_provider,
          p.payment_status,
          p.created_at,
          p.updated_at
        FROM purchases p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN campaigns c ON p.campaign_id = c.id
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      params = [limit, offset];
    }

    console.log('Executing transactions query with params:', params);
    const result = await query(mainQuery, params);
    console.log('Query returned', result.rows.length, 'transactions');

    // Get tickets for each transaction
    const transactionsWithTickets = await Promise.all(
      result.rows.map(async (t) => {
        let tickets = [];
        try {
          const ticketsResult = await query(
            "SELECT id, ticket_number, status FROM tickets WHERE purchase_id = $1",
            [t.transaction_id]
          );
          tickets = ticketsResult.rows;
        } catch (e) {
          console.log('Error fetching tickets for purchase', t.transaction_id);
        }
        
        const currency = t.currency || 'USD';
        const amount = parseFloat(t.total_amount) || 0;
        const amountUsd = currency === 'CDF' ? amount / exchangeRate : amount;
        
        return {
          ...t,
          total_amount: amount,
          amount_usd: amountUsd,
          currency: currency,
          tickets: tickets
        };
      })
    );

    res.json({
      success: true,
      data: {
        transactions: transactionsWithTickets,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
          total: totalCount
        },
        exchange_rate: exchangeRate
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Sync transaction with PayDRC - check real status from payment gateway - L3 only
router.post('/transactions/:id/sync', requireAdminLevel(3), async (req, res) => {
  try {
    const { id } = req.params;

    // Get purchase info first
    const purchaseResult = await query(
      'SELECT * FROM purchases WHERE id = $1',
      [id]
    );

    if (purchaseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const purchase = purchaseResult.rows[0];

    // Check if we have a PayDRC transaction ID
    if (!purchase.transaction_id) {
      return res.status(400).json({
        success: false,
        message: 'No PayDRC transaction ID found for this purchase'
      });
    }

    // Import PayDRC service
    const { checkTransactionStatus } = require('../services/paydrc');
    
    // Check status with PayDRC
    const paydrcStatus = await checkTransactionStatus(purchase.transaction_id);
    
    console.log('PayDRC sync result for transaction', id, ':', paydrcStatus);

    if (!paydrcStatus.success && !paydrcStatus.found) {
      return res.json({
        success: true,
        synced: false,
        message: 'Could not verify transaction with PayDRC',
        paydrc_response: paydrcStatus
      });
    }

    // Map PayDRC status to our status
    let newStatus = purchase.payment_status;
    if (paydrcStatus.transStatus) {
      const statusMap = {
        'P': 'pending',    // Pending
        'S': 'completed',  // Success
        'F': 'failed',     // Failed
        'C': 'failed',     // Cancelled
        'R': 'failed',     // Rejected
      };
      newStatus = statusMap[paydrcStatus.transStatus] || purchase.payment_status;
    }

    // Update if status changed
    if (newStatus !== purchase.payment_status) {
      await query(
        `UPDATE purchases 
         SET payment_status = $1, 
             updated_at = NOW(),
             payment_reference = COALESCE(payment_reference, $2)
         WHERE id = $3`,
        [newStatus, paydrcStatus.transactionId, id]
      );

      // Log the action
      await query(
        `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'SYNC_TRANSACTION',
          'purchase',
          id,
          JSON.stringify({ 
            old_status: purchase.payment_status, 
            new_status: newStatus,
            paydrc_status: paydrcStatus.transStatus,
            paydrc_transaction_id: paydrcStatus.transactionId
          })
        ]
      );
    }

    res.json({
      success: true,
      synced: true,
      transaction: {
        id: purchase.id,
        old_status: purchase.payment_status,
        new_status: newStatus,
        status_changed: newStatus !== purchase.payment_status
      },
      paydrc_response: {
        status: paydrcStatus.transStatus,
        description: paydrcStatus.transStatusDescription,
        transaction_id: paydrcStatus.transactionId,
        amount: paydrcStatus.amount,
        currency: paydrcStatus.currency,
        method: paydrcStatus.method,
        updated_at: paydrcStatus.updatedAt
      }
    });

  } catch (error) {
    console.error('Sync transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Bulk sync all pending transactions with PayDRC - L3 only
router.post('/transactions/sync-all', requireAdminLevel(3), async (req, res) => {
  try {
    // Get all pending transactions with PayDRC transaction IDs
    const pendingResult = await query(
      `SELECT id, transaction_id, payment_status 
       FROM purchases 
       WHERE payment_status = 'pending' 
         AND transaction_id IS NOT NULL
       LIMIT 50`
    );

    if (pendingResult.rows.length === 0) {
      return res.json({
        success: true,
        message: 'No pending transactions to sync',
        synced: 0
      });
    }

    const { checkTransactionStatus } = require('../services/paydrc');
    const results = {
      total: pendingResult.rows.length,
      synced: 0,
      updated: 0,
      errors: 0,
      details: []
    };

    for (const purchase of pendingResult.rows) {
      try {
        const paydrcStatus = await checkTransactionStatus(purchase.transaction_id);
        
        let detail = {
          id: purchase.id,
          transaction_id: purchase.transaction_id,
          synced: false,
          status_changed: false
        };

        if (paydrcStatus.success || paydrcStatus.found) {
          results.synced++;
          detail.synced = true;
          detail.paydrc_status = paydrcStatus.transStatus;

          // Map status
          const statusMap = {
            'P': 'pending',
            'S': 'completed',
            'F': 'failed',
            'C': 'failed',
            'R': 'failed',
          };
          const newStatus = statusMap[paydrcStatus.transStatus] || purchase.payment_status;

          if (newStatus !== purchase.payment_status) {
            await query(
              'UPDATE purchases SET payment_status = $1, updated_at = NOW() WHERE id = $2',
              [newStatus, purchase.id]
            );
            results.updated++;
            detail.status_changed = true;
            detail.old_status = purchase.payment_status;
            detail.new_status = newStatus;
          }
        }

        results.details.push(detail);

        // Small delay to avoid overwhelming PayDRC API
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        results.errors++;
        results.details.push({
          id: purchase.id,
          error: err.message
        });
      }
    }

    // Log bulk sync action
    await query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.id,
        'BULK_SYNC_TRANSACTIONS',
        'purchase',
        null,
        JSON.stringify(results)
      ]
    );

    res.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Bulk sync transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Update transaction status - L3 only
router.patch('/transactions/:id', requireAdminLevel(3), [
  body('status').isIn(['completed', 'pending', 'failed', 'cancelled'])
], async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Get purchase info first
    const purchaseResult = await query(
      'SELECT * FROM purchases WHERE id = $1',
      [id]
    );

    if (purchaseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const purchase = purchaseResult.rows[0];
    const wasCompleted = purchase.payment_status === 'completed';
    const isNowCompleted = status === 'completed';

    // Use transaction for ticket creation
    await transaction(async (client) => {
      // Update purchase status
      await client.query(
        `UPDATE purchases 
         SET payment_status = $1, updated_at = NOW(), completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END
         WHERE id = $2`,
        [status, id]
      );

      // If status changed TO completed - create tickets
      if (!wasCompleted && isNowCompleted) {
        // Generate unique ticket numbers
        for (let i = 0; i < purchase.ticket_count; i++) {
          let ticketNumber;
          let isUnique = false;
          
          while (!isUnique) {
            ticketNumber = 'TK-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
            const checkResult = await client.query(
              'SELECT id FROM tickets WHERE ticket_number = $1',
              [ticketNumber]
            );
            isUnique = checkResult.rows.length === 0;
          }

          // Insert ticket
          await client.query(
            `INSERT INTO tickets (ticket_number, campaign_id, user_id, purchase_id, status)
             VALUES ($1, $2, $3, $4, 'active')`,
            [ticketNumber, purchase.campaign_id, purchase.user_id, purchase.id]
          );
        }

        // Update campaign sold_tickets
        await client.query(
          `UPDATE campaigns SET sold_tickets = sold_tickets + $1 WHERE id = $2`,
          [purchase.ticket_count, purchase.campaign_id]
        );
      }

      // If status changed FROM completed to something else - remove tickets
      if (wasCompleted && !isNowCompleted) {
        // Delete tickets
        await client.query(
          'DELETE FROM tickets WHERE purchase_id = $1',
          [id]
        );

        // Decrease campaign sold_tickets
        await client.query(
          `UPDATE campaigns SET sold_tickets = GREATEST(0, sold_tickets - $1) WHERE id = $2`,
          [purchase.ticket_count, purchase.campaign_id]
        );
      }

      // Log admin action
      await client.query(
        `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'UPDATE_TRANSACTION',
          'purchase',
          id,
          JSON.stringify({ 
            old_status: purchase.payment_status, 
            new_status: status,
            tickets_created: !wasCompleted && isNowCompleted ? purchase.ticket_count : 0 
          })
        ]
      );
    });

    res.json({
      success: true,
      message: 'Transaction updated successfully'
    });

  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ============ APP SETTINGS MANAGEMENT ============

// Get all settings - L3 only
router.get('/settings', requireAdminLevel(3), async (req, res) => {
  try {
    let result;
    try {
      result = await query(`
        SELECT key, value, description, updated_at
        FROM app_settings
        ORDER BY key
      `);
    } catch (tableError) {
      // Table doesn't exist, return defaults
      console.log('app_settings table not found, returning defaults');
      return res.json({
        success: true,
        data: {
          exchange_rate_usd_cdf: {
            value: '2850',
            description: 'Taux de conversion USD vers CDF',
            updated_at: null
          },
          default_currency: {
            value: 'USD',
            description: 'Devise par défaut',
            updated_at: null
          }
        }
      });
    }

    // Convert to object for easier frontend use
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = {
        value: row.value,
        description: row.description,
        updated_at: row.updated_at
      };
    });

    // Ensure defaults if not present
    if (!settings.exchange_rate_usd_cdf) {
      settings.exchange_rate_usd_cdf = { value: '2850', description: 'Taux de conversion USD vers CDF', updated_at: null };
    }
    if (!settings.default_currency) {
      settings.default_currency = { value: 'USD', description: 'Devise par défaut', updated_at: null };
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paramètres'
    });
  }
});

// Get specific setting - L3 only
router.get('/settings/:key', requireAdminLevel(3), async (req, res) => {
  try {
    const { key } = req.params;
    
    const result = await query(
      'SELECT key, value, description, updated_at FROM app_settings WHERE key = $1',
      [key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Paramètre non trouvé'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Update setting - L3 only
router.put('/settings/:key', requireAdminLevel(3), [
  body('value').notEmpty().withMessage('La valeur est requise')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { key } = req.params;
    const { value } = req.body;

    // Validate exchange rate if applicable
    if (key === 'exchange_rate_usd_cdf') {
      const rate = parseFloat(value);
      if (isNaN(rate) || rate <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Le taux de conversion doit être un nombre positif'
        });
      }
    }

    const result = await query(`
      UPDATE app_settings 
      SET value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE key = $3
      RETURNING *
    `, [value, req.user.id, key]);

    if (result.rows.length === 0) {
      // If setting doesn't exist, create it
      const insertResult = await query(`
        INSERT INTO app_settings (key, value, updated_by)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [key, value, req.user.id]);

      // Log admin action
      await logAdminAction(
        req.user.id,
        'CREATE_SETTING',
        'setting',
        key,
        { value },
        req
      );

      return res.json({
        success: true,
        message: 'Paramètre créé avec succès',
        data: insertResult.rows[0]
      });
    }

    // Log admin action
    await logAdminAction(
      req.user.id,
      'UPDATE_SETTING',
      'setting',
      key,
      { new_value: value },
      req
    );

    res.json({
      success: true,
      message: 'Paramètre mis à jour avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du paramètre'
    });
  }
});

// Get exchange rate specifically (public-ish endpoint, but still admin protected for now)
router.get('/exchange-rate', async (req, res) => {
  try {
    const result = await query(
      "SELECT value FROM app_settings WHERE key = 'exchange_rate_usd_cdf'"
    );

    const rate = result.rows.length > 0 ? parseFloat(result.rows[0].value) : 2850;

    res.json({
      success: true,
      data: {
        rate,
        currency_from: 'USD',
        currency_to: 'CDF'
      }
    });
  } catch (error) {
    console.error('Get exchange rate error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Debug route: Get all payment webhooks (for debugging) - L3 only
router.get('/debug/webhooks', requireAdminLevel(3), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await query(
      `SELECT * FROM payment_webhooks 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      data: {
        count: result.rows.length,
        webhooks: result.rows
      }
    });
  } catch (error) {
    console.error('Get webhooks error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// Debug route: Get raw purchases data - L3 only
router.get('/debug/purchases', requireAdminLevel(3), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await query(
      `SELECT 
        p.*,
        u.name as user_name,
        u.email as user_email,
        c.title as campaign_title,
        (SELECT COUNT(*) FROM tickets t WHERE t.purchase_id = p.id) as ticket_count_actual,
        (SELECT array_agg(t.ticket_number) FROM tickets t WHERE t.purchase_id = p.id) as ticket_numbers
       FROM purchases p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN campaigns c ON p.campaign_id = c.id
       ORDER BY p.created_at DESC 
       LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      data: {
        count: result.rows.length,
        purchases: result.rows
      }
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// Debug route: Get raw tickets data - L3 only
router.get('/debug/tickets', requireAdminLevel(3), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await query(
      `SELECT 
        t.*,
        u.name as user_name,
        c.title as campaign_title,
        p.payment_status,
        p.total_amount
       FROM tickets t
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN campaigns c ON t.campaign_id = c.id
       LEFT JOIN purchases p ON t.purchase_id = p.id
       ORDER BY t.created_at DESC 
       LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      data: {
        count: result.rows.length,
        tickets: result.rows
      }
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// Fix missing tickets for completed purchases (admin only) - L3 only
router.post('/fix-missing-tickets', requireAdminLevel(3), async (req, res) => {
  try {
    console.log('🔧 Admin requested fix-missing-tickets');
    
    // Find completed purchases without tickets
    const missingTickets = await query(`
      SELECT 
        p.id as purchase_id,
        p.user_id,
        p.campaign_id,
        p.ticket_count,
        p.total_amount,
        u.email,
        c.title as campaign_title,
        c.total_tickets,
        c.sold_tickets
      FROM purchases p
      LEFT JOIN tickets t ON t.purchase_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN campaigns c ON p.campaign_id = c.id
      WHERE p.payment_status = 'completed'
      GROUP BY p.id, u.email, c.title, c.total_tickets, c.sold_tickets
      HAVING COUNT(t.id) = 0
    `);
    
    if (missingTickets.rows.length === 0) {
      return res.json({
        success: true,
        message: 'Aucun achat sans tickets trouvé',
        fixed: 0
      });
    }
    
    console.log(`📋 Found ${missingTickets.rows.length} purchases without tickets`);
    
    const results = [];
    
    for (const purchase of missingTickets.rows) {
      try {
        await transaction(async (client) => {
          // Lock campaign row
          const campaignResult = await client.query(
            'SELECT total_tickets, sold_tickets FROM campaigns WHERE id = $1 FOR UPDATE',
            [purchase.campaign_id]
          );
          const campaign = campaignResult.rows[0];
          const currentSoldTickets = parseInt(campaign?.sold_tickets || 0);
          const padLength = Math.max(2, String(campaign.total_tickets).length);
          
          // Generate tickets
          const tickets = [];
          for (let i = 0; i < purchase.ticket_count; i++) {
            const ticketSequence = currentSoldTickets + i + 1;
            const ticketNumber = `K-${String(ticketSequence).padStart(padLength, '0')}`;
            
            const ticketResult = await client.query(
              `INSERT INTO tickets (ticket_number, campaign_id, user_id, purchase_id, status, created_at)
               VALUES ($1, $2, $3, $4, 'active', NOW())
               RETURNING *`,
              [ticketNumber, purchase.campaign_id, purchase.user_id, purchase.purchase_id]
            );
            tickets.push(ticketResult.rows[0]);
          }
          
          // Update campaign sold_tickets
          await client.query(
            'UPDATE campaigns SET sold_tickets = sold_tickets + $1 WHERE id = $2',
            [purchase.ticket_count, purchase.campaign_id]
          );
          
          // Create notification
          await client.query(
            `INSERT INTO notifications (user_id, type, title, message, data, created_at)
             VALUES ($1, 'purchase_confirmation', 'Tickets générés !', $2, $3, NOW())`,
            [
              purchase.user_id,
              `Vos ${purchase.ticket_count} ticket(s) pour "${purchase.campaign_title}" ont été générés.`,
              JSON.stringify({ purchase_id: purchase.purchase_id, ticket_numbers: tickets.map(t => t.ticket_number) })
            ]
          );
          
          results.push({
            purchase_id: purchase.purchase_id,
            user_email: purchase.email,
            campaign: purchase.campaign_title,
            tickets_created: tickets.length,
            ticket_numbers: tickets.map(t => t.ticket_number)
          });
          
          console.log(`✅ Fixed purchase ${purchase.purchase_id}: created ${tickets.length} tickets`);
        });
      } catch (purchaseError) {
        console.error(`❌ Error fixing purchase ${purchase.purchase_id}:`, purchaseError);
        results.push({
          purchase_id: purchase.purchase_id,
          error: purchaseError.message
        });
      }
    }
    
    // Log admin action
    await logAdminAction(
      req.user.id,
      'FIX_MISSING_TICKETS',
      'purchase',
      null,
      { message: `Fixed ${results.filter(r => !r.error).length} purchases with missing tickets`, results },
      req
    );
    
    res.json({
      success: true,
      message: `Corrigé ${results.filter(r => !r.error).length} achat(s) sans tickets`,
      fixed: results.filter(r => !r.error).length,
      errors: results.filter(r => r.error).length,
      details: results
    });
    
  } catch (error) {
    console.error('Fix missing tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// ============ ADMIN VALIDATION REQUESTS ============

// Submit a validation request (L1 creates campaign/promo, L2 launches draw)
router.post('/validations', [
  body('action_type').isIn(['create_campaign', 'create_promo', 'launch_draw']),
  body('entity_type').isIn(['campaign', 'promo', 'draw']),
  body('entity_id').optional().isInt(),
  body('payload').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { action_type, entity_type, entity_id, payload } = req.body;

    const result = await query(
      `INSERT INTO admin_validations (requested_by, action_type, entity_type, entity_id, payload)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, action_type, entity_type, entity_id || null, JSON.stringify(payload)]
    );

    await logAdminAction(
      req.user.id,
      'VALIDATION_REQUEST',
      entity_type,
      entity_id || result.rows[0].id,
      { action_type, status: 'pending' },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Demande de validation soumise',
      validation: result.rows[0]
    });
  } catch (error) {
    console.error('Validation request error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Get all validation requests - L2+ can see, all admins can see their own
router.get('/validations', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const userLevel = req.user.admin_level || 0;

    let whereClause = '';
    const params = [];

    // L1/L2 see only their own requests, L3 sees all
    if (userLevel < 3) {
      params.push(req.user.id);
      whereClause = `WHERE v.requested_by = $${params.length}`;
    }

    if (status) {
      params.push(status);
      whereClause += whereClause ? ` AND v.status = $${params.length}` : `WHERE v.status = $${params.length}`;
    }

    const result = await query(
      `SELECT v.*, 
              u1.name as requested_by_name,
              u2.name as validated_by_name
       FROM admin_validations v
       LEFT JOIN users u1 ON v.requested_by = u1.id
       LEFT JOIN users u2 ON v.validated_by = u2.id
       ${whereClause}
       ORDER BY v.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM admin_validations v ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        validations: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    });
  } catch (error) {
    console.error('Get validations error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Approve or reject a validation request - L3 only (or L2 for L1 requests)
router.patch('/validations/:id', requireAdminLevel(2), [
  body('status').isIn(['approved', 'rejected']),
  body('rejection_reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    const userLevel = req.user.admin_level || 0;

    // Get the validation request
    const validationResult2 = await query(
      'SELECT * FROM admin_validations WHERE id = $1',
      [id]
    );

    if (validationResult2.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Demande non trouvee' });
    }

    const validation = validationResult2.rows[0];

    if (validation.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cette demande a deja ete traitee' });
    }

    // Cannot approve own request
    if (validation.requested_by === req.user.id) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez pas valider votre propre demande' });
    }

    // L2 can only approve L1 requests (campaigns/promos), L3 can approve all
    if (userLevel === 2 && validation.action_type === 'launch_draw') {
      return res.status(403).json({ 
        success: false, 
        message: 'Seul un administrateur Niveau 3 peut valider les tirages' 
      });
    }

    const result = await query(
      `UPDATE admin_validations 
       SET status = $1, validated_by = $2, rejection_reason = $3, validated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, req.user.id, rejection_reason || null, id]
    );

    await logAdminAction(
      req.user.id,
      status === 'approved' ? 'VALIDATION_APPROVED' : 'VALIDATION_REJECTED',
      validation.entity_type,
      validation.entity_id || validation.id,
      { action_type: validation.action_type, rejection_reason },
      req
    );

    res.json({
      success: true,
      message: status === 'approved' ? 'Demande approuvee' : 'Demande rejetee',
      validation: result.rows[0]
    });
  } catch (error) {
    console.error('Validate request error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Get pending validations count (for badge in sidebar)
router.get('/validations/pending-count', async (req, res) => {
  try {
    const userLevel = req.user.admin_level || 0;

    let result;
    if (userLevel >= 3) {
      result = await query("SELECT COUNT(*) FROM admin_validations WHERE status = 'pending'");
    } else if (userLevel === 2) {
      // L2 sees pending campaigns/promos from L1
      result = await query(
        "SELECT COUNT(*) FROM admin_validations WHERE status = 'pending' AND action_type IN ('create_campaign', 'create_promo')"
      );
    } else {
      result = { rows: [{ count: 0 }] };
    }

    res.json({ success: true, count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Pending count error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================
// ADMIN MANAGEMENT (L3 only) - Gestion des administrateurs
// ============================================================

// List all admins (L3 only)
router.get('/admins', requireAdminLevel(3), async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, phone, admin_level, is_admin, is_active, created_at,
              (SELECT COUNT(*) FROM admin_validations WHERE requested_by = users.id) as validations_submitted,
              (SELECT COUNT(*) FROM admin_validations WHERE validated_by = users.id) as validations_processed
       FROM users
       WHERE is_admin = true
       ORDER BY admin_level DESC, name ASC`
    );

    res.json({
      success: true,
      admins: result.rows.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        admin_level: a.admin_level || 3,
        is_active: a.is_active,
        created_at: a.created_at,
        validations_submitted: parseInt(a.validations_submitted),
        validations_processed: parseInt(a.validations_processed)
      }))
    });
  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Promote a user to admin with a specific level (L3 only)
router.post('/admins/promote', requireAdminLevel(3), [
  body('user_id').isInt({ min: 1 }).withMessage('ID utilisateur requis'),
  body('admin_level').isInt({ min: 1, max: 3 }).withMessage('Niveau admin doit être 1, 2 ou 3')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { user_id, admin_level } = req.body;

    // Cannot modify self
    if (user_id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas modifier votre propre niveau' });
    }

    // Check user exists
    const userResult = await query('SELECT id, name, email, is_admin, admin_level FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    const targetUser = userResult.rows[0];

    // Update user to admin with specified level
    await query(
      'UPDATE users SET is_admin = true, admin_level = $1 WHERE id = $2',
      [admin_level, user_id]
    );

    const levelLabels = { 1: 'Opérateur (L1)', 2: 'Superviseur (L2)', 3: 'Administrateur (L3)' };

    await logAdminAction(
      req.user.id,
      targetUser.is_admin ? 'ADMIN_LEVEL_CHANGED' : 'ADMIN_PROMOTED',
      'user',
      user_id,
      {
        target_name: targetUser.name,
        target_email: targetUser.email,
        previous_level: targetUser.admin_level,
        new_level: admin_level,
        label: levelLabels[admin_level]
      },
      req
    );

    res.json({
      success: true,
      message: targetUser.is_admin
        ? `Niveau de ${targetUser.name} changé en ${levelLabels[admin_level]}`
        : `${targetUser.name} promu en tant que ${levelLabels[admin_level]}`,
      admin: {
        id: user_id,
        name: targetUser.name,
        email: targetUser.email,
        admin_level
      }
    });
  } catch (error) {
    console.error('Promote admin error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Remove admin privileges (L3 only)
router.post('/admins/demote', requireAdminLevel(3), [
  body('user_id').isInt({ min: 1 }).withMessage('ID utilisateur requis')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { user_id } = req.body;

    // Cannot demote self
    if (user_id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas vous retirer vos propres droits admin' });
    }

    const userResult = await query('SELECT id, name, email, admin_level FROM users WHERE id = $1 AND is_admin = true', [user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Administrateur non trouvé' });
    }

    const targetUser = userResult.rows[0];

    await query('UPDATE users SET is_admin = false, admin_level = NULL WHERE id = $1', [user_id]);

    await logAdminAction(
      req.user.id,
      'ADMIN_DEMOTED',
      'user',
      user_id,
      { target_name: targetUser.name, target_email: targetUser.email, previous_level: targetUser.admin_level },
      req
    );

    res.json({
      success: true,
      message: `Droits admin retirés pour ${targetUser.name}`
    });
  } catch (error) {
    console.error('Demote admin error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Search users for promotion (L3 only) - search by email or name
router.get('/admins/search-users', requireAdminLevel(3), async (req, res) => {
  try {
    const search = req.query.q || '';
    if (search.length < 2) {
      return res.json({ success: true, users: [] });
    }

    const result = await query(
      `SELECT id, name, email, phone, is_admin, admin_level
       FROM users
       WHERE (LOWER(name) LIKE $1 OR LOWER(email) LIKE $1)
       ORDER BY name ASC
       LIMIT 20`,
      [`%${search.toLowerCase()}%`]
    );

    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;