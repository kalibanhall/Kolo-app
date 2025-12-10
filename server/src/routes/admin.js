const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
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
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM campaigns WHERE status IN ('open', 'active')) as active_campaigns,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
        (SELECT COUNT(DISTINCT user_id) FROM tickets) as participants,
        (SELECT COUNT(*) FROM tickets) as total_tickets_sold,
        (SELECT COUNT(*) FROM purchases WHERE payment_status = 'pending') as pending_payments,
        (SELECT COUNT(*) FROM purchases WHERE payment_status = 'completed') as completed_payments,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchases WHERE payment_status = 'completed') as total_revenue,
        (SELECT COUNT(*) FROM tickets WHERE is_winner = true) as total_winners
    `;

    const result = await query(statsQuery);
    const stats = result.rows[0];

    // Get current campaign stats
    const campaignResult = await query(
      `SELECT id, title, total_tickets, sold_tickets, ticket_price, status, draw_date
       FROM campaigns
       WHERE status IN ('open', 'active')
       ORDER BY created_at DESC
       LIMIT 1`
    );

    const campaign = campaignResult.rows[0] || null;

    res.json({
      success: true,
      data: {
        ...stats,
        current_campaign: campaign,
        revenue: parseFloat(stats.total_revenue)
      }
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
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

    const result = await query(
      `SELECT 
        u.id as user_id, u.name, u.email, u.phone, u.created_at as join_date, u.is_active,
        COUNT(DISTINCT t.id) as ticket_count,
        COUNT(DISTINCT p.id) as purchases,
        COALESCE(SUM(p.total_amount), 0) as total_spent,
        MAX(p.created_at) as last_purchase,
        (SELECT COUNT(*) FROM users WHERE is_admin = false) as total_count
       FROM users u
       LEFT JOIN purchases p ON u.id = p.user_id AND p.payment_status = 'completed'
       LEFT JOIN tickets t ON u.id = t.user_id
       WHERE u.is_admin = false
       GROUP BY u.id, u.name, u.email, u.phone, u.created_at, u.is_active
       ORDER BY ${sortBy === 'tickets' ? 'ticket_count' : sortBy === 'amount' ? 'total_spent' : sortBy} ${sortOrder.toUpperCase()}
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
          total_spent: parseFloat(p.total_spent),
          join_date: p.join_date,
          last_purchase: p.last_purchase,
          is_active: p.is_active !== false && parseInt(p.ticket_count) > 0
        })),
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
          total: parseInt(totalCount)
        }
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
router.get('/campaigns/:campaignId/tickets', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const result = await query(
      `SELECT t.id, t.ticket_number, t.created_at, t.status,
              u.id as user_id, u.name as user_name, u.email as user_email, u.phone as user_phone
       FROM tickets t
       JOIN users u ON t.user_id = u.id
       WHERE t.campaign_id = $1 AND t.status = 'active'
       ORDER BY t.ticket_number ASC`,
      [campaignId]
    );

    res.json({
      success: true,
      tickets: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get campaign tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Perform lottery draw (rate limited to 1 per hour)
router.post('/draw', drawLimiter, [
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

    await transaction(async (client) => {
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
        // Automatic random selection
        [mainWinner] = selectRandomWinners(allTickets, 1);
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

      // Select bonus winners if requested (always automatic)
      if (bonus_winners_count > 0) {
        const remainingTickets = allTickets.filter(t => t.id !== mainWinner.id);
        const bonusWinners = selectRandomWinners(remainingTickets, bonus_winners_count);

        for (const ticket of bonusWinners) {
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
      }

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

      // Send Firebase push notifications
      try {
        const { notifyWinner, notifyLotteryDrawn, isInitialized } = require('../services/firebaseNotifications');
        
        if (isInitialized()) {
          // Notify the main winner
          await notifyWinner(
            mainWinner.user_id,
            campaign.name,
            campaign.main_prize
          );

          // Notify all campaign participants about the draw
          const totalWinners = 1 + bonus_winners_count;
          await notifyLotteryDrawn(
            campaign_id,
            campaign.name,
            totalWinners
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

// Get security/audit logs
router.get('/logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT l.*, u.name as admin_name, u.email as admin_email,
              (SELECT COUNT(*) FROM admin_logs) as total_count
       FROM admin_logs l
       JOIN users u ON l.admin_id = u.id
       ORDER BY l.created_at DESC
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
    console.error('Get admin logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get draw results
router.get('/draws', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        dr.*,
        c.title as campaign_title,
        c.main_prize,
        t.ticket_number as winning_ticket,
        u.name as winner_name,
        u.email as winner_email,
        (SELECT COUNT(*) FROM bonus_winners WHERE draw_result_id = dr.id) as bonus_winners_count
       FROM draw_results dr
       JOIN campaigns c ON dr.campaign_id = c.id
       JOIN tickets t ON dr.main_winner_ticket_id = t.id
       JOIN users u ON t.user_id = u.id
       ORDER BY dr.draw_date DESC`
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get draws error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Export data (CSV/PDF simulation)
router.post('/export', (req, res) => {
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

// Get suspicious accounts
router.get('/suspicious-accounts', (req, res) => {
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

// Get admin logs with pagination and filters
router.get('/logs', async (req, res) => {
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

// Get admin log statistics
router.get('/logs/stats', async (req, res) => {
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
    let whereConditions = ['t.is_winner = true'];
    const queryParams = [];
    let paramCount = 0;

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
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

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
        COUNT(CASE WHEN delivery_status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN delivery_status = 'contacted' THEN 1 END) as contacted,
        COUNT(CASE WHEN delivery_status = 'shipped' THEN 1 END) as shipped,
        COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN delivery_status = 'claimed' THEN 1 END) as claimed,
        COUNT(CASE WHEN prize_category = 'main' THEN 1 END) as main_prizes,
        COUNT(CASE WHEN prize_category = 'bonus' THEN 1 END) as bonus_prizes
      FROM tickets
      WHERE is_winner = true
    `;

    const result = await query(statsQuery);
    const stats = result.rows[0];

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
      WHERE t.is_winner = true AND t.delivery_updated_at IS NOT NULL
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

// Update winner delivery status
router.patch('/winners/:ticketId/delivery', [
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
      req.ip,
      req.get('user-agent')
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

// Bulk update delivery status
router.post('/winners/bulk-update', [
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
      req.ip,
      req.get('user-agent')
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

module.exports = router;