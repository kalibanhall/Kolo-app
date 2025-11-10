const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { logAdminAction } = require('../utils/logger');
const { selectRandomWinners } = require('../utils/helpers');
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
        u.id, u.name, u.email, u.phone, u.created_at as join_date,
        COUNT(DISTINCT t.id) as tickets,
        COUNT(DISTINCT p.id) as purchases,
        COALESCE(SUM(p.total_amount), 0) as total_spent,
        MAX(p.created_at) as last_purchase,
        (SELECT COUNT(*) FROM users) as total_count
       FROM users u
       LEFT JOIN purchases p ON u.id = p.user_id AND p.payment_status = 'completed'
       LEFT JOIN tickets t ON u.id = t.user_id
       WHERE u.is_admin = false
       GROUP BY u.id, u.name, u.email, u.phone, u.created_at
       ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;

    res.json({
      success: true,
      data: {
        participants: result.rows.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          tickets: parseInt(p.tickets),
          purchases: parseInt(p.purchases),
          total_spent: parseFloat(p.total_spent),
          join_date: p.join_date,
          last_purchase: p.last_purchase
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

// Perform lottery draw
router.post('/draw', [
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
    });

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

module.exports = router;