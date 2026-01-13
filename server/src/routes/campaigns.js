const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { logAdminAction } = require('../utils/logger');
const router = express.Router();

// Get all active campaigns (for slider on homepage)
router.get('/active', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, title, description, status, total_tickets, sold_tickets, 
              ticket_price, main_prize, secondary_prizes, third_prize,
              image_url, start_date, end_date, draw_date, display_order, is_featured
       FROM campaigns 
       WHERE status IN ('open', 'active')
       ORDER BY is_featured DESC, display_order ASC, created_at DESC`
    );
    
    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get active campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get current active campaign (first one for backward compatibility)
router.get('/current', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, title, description, status, total_tickets, sold_tickets, 
              ticket_price, main_prize, secondary_prizes, third_prize,
              image_url, start_date, end_date, draw_date
       FROM campaigns 
       WHERE status IN ('open', 'active')
       ORDER BY is_featured DESC, display_order ASC, created_at DESC 
       LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active campaign found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get current campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get available ticket numbers for a campaign (for manual selection)
router.get('/:id/available-numbers', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 500; // Default 500, max for performance
    
    // Get campaign info
    const campaignResult = await query(
      'SELECT id, total_tickets, sold_tickets FROM campaigns WHERE id = $1',
      [campaignId]
    );
    
    if (campaignResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    const campaign = campaignResult.rows[0];
    
    // Get already used ticket numbers for this campaign
    const usedResult = await query(
      'SELECT ticket_number FROM tickets WHERE campaign_id = $1',
      [campaignId]
    );
    
    const usedNumbers = new Set(usedResult.rows.map(r => r.ticket_number));
    
    // Generate available numbers with limit for performance
    const availableNumbers = [];
    for (let i = 1; i <= campaign.total_tickets && availableNumbers.length < limit; i++) {
      const ticketNumber = `KOLO-${String(i).padStart(2, '0')}`;
      if (!usedNumbers.has(ticketNumber)) {
        availableNumbers.push({
          number: i,
          display: ticketNumber
        });
      }
    }
    
    res.json({
      success: true,
      numbers: availableNumbers,
      total_available: campaign.total_tickets - campaign.sold_tickets,
      total_tickets: campaign.total_tickets,
      limited: availableNumbers.length >= limit
    });

  } catch (error) {
    console.error('Get available numbers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all campaigns (admin only)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT c.*, u.name as created_by_name,
              (SELECT COUNT(*) FROM campaigns) as total_count
       FROM campaigns c
       LEFT JOIN users u ON c.created_by = u.id
       ORDER BY c.created_at DESC
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
    console.error('Get campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get campaign by ID
router.get('/:id', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    
    const result = await query(
      `SELECT c.*, u.name as created_by_name
       FROM campaigns c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [campaignId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get campaign by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create new campaign (admin only)
router.post('/', verifyToken, verifyAdmin, [
  body('title').notEmpty().trim().isLength({ min: 5, max: 200 }),
  body('description').notEmpty().trim(),
  body('total_tickets').isInt({ min: 1 }),
  body('ticket_price').isFloat({ min: 0.01 }),
  body('main_prize').notEmpty().trim(),
  body('start_date').isISO8601(),
  body('end_date').optional({ nullable: true }).isISO8601(),
  body('status').optional().isIn(['draft', 'open']),
  body('draw_date').optional({ nullable: true }).isISO8601(),
  body('secondary_prizes').optional({ nullable: true }).trim(),
  body('third_prize').optional({ nullable: true }).trim(),
  body('rules').optional({ nullable: true }).trim(),
  body('display_order').optional().isInt(),
  body('is_featured').optional().isBoolean()
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
      title, description, total_tickets, ticket_price, 
      main_prize, image_url, start_date, end_date,
      status, draw_date, secondary_prizes, third_prize, rules,
      display_order, is_featured
    } = req.body;

    const result = await query(
      `INSERT INTO campaigns (
        title, description, status, total_tickets, ticket_price, 
        main_prize, image_url, start_date, end_date, draw_date,
        secondary_prizes, third_prize, rules, display_order, is_featured, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        title, description, status || 'draft', total_tickets, ticket_price,
        main_prize, image_url || null, start_date, end_date || null, draw_date || null,
        secondary_prizes || null, third_prize || null, rules || null, 
        display_order || 0, is_featured || false, req.user.id
      ]
    );

    const campaign = result.rows[0];

    // Log admin action
    await logAdminAction(
      req.user.id,
      'CREATE_CAMPAIGN',
      'campaign',
      campaign.id,
      { title, total_tickets, ticket_price },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: campaign
    });

  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update campaign status (admin only)
router.patch('/:id/status', verifyToken, verifyAdmin, [
  body('status').isIn(['draft', 'open', 'closed', 'completed'])
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

    const campaignId = parseInt(req.params.id);
    const { status } = req.body;
    
    const result = await query(
      `UPDATE campaigns 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, campaignId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const campaign = result.rows[0];

    // Log admin action
    await logAdminAction(
      req.user.id,
      'UPDATE_CAMPAIGN_STATUS',
      'campaign',
      campaignId,
      { old_status: campaign.status, new_status: status },
      req
    );
    
    res.json({
      success: true,
      message: 'Campaign status updated',
      data: campaign
    });

  } catch (error) {
    console.error('Update campaign status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update complete campaign (admin only)
router.put('/:id', verifyToken, verifyAdmin, [
  body('title').optional().trim().isLength({ min: 5, max: 200 }),
  body('description').optional().trim(),
  body('total_tickets').optional().isInt({ min: 1 }),
  body('ticket_price').optional().isFloat({ min: 0.01 }),
  body('main_prize').optional().trim(),
  body('status').optional().isIn(['draft', 'open', 'closed', 'completed'])
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

    const campaignId = parseInt(req.params.id);
    const { 
      title, description, total_tickets, ticket_price, 
      main_prize, image_url, prize_image_url, start_date, 
      end_date, draw_date, status 
    } = req.body;

    // Convert empty strings to null for timestamp fields
    const cleanStartDate = start_date === '' ? null : start_date;
    const cleanEndDate = end_date === '' ? null : end_date;
    const cleanDrawDate = draw_date === '' ? null : draw_date;

    const result = await query(
      `UPDATE campaigns 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           total_tickets = COALESCE($3, total_tickets),
           ticket_price = COALESCE($4, ticket_price),
           main_prize = COALESCE($5, main_prize),
           image_url = COALESCE($6, image_url),
           start_date = COALESCE($7, start_date),
           end_date = COALESCE($8, end_date),
           draw_date = COALESCE($9, draw_date),
           status = COALESCE($10, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        title, description, total_tickets, ticket_price, main_prize,
        image_url, cleanStartDate, cleanEndDate, cleanDrawDate, status, campaignId
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const campaign = result.rows[0];

    // Log admin action
    await logAdminAction(
      req.user.id,
      'UPDATE_CAMPAIGN',
      'campaign',
      campaignId,
      { title, status },
      req
    );
    
    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaign
    });

  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete campaign (admin only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    
    // Check if campaign exists
    const checkResult = await query(
      'SELECT id, title FROM campaigns WHERE id = $1',
      [campaignId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const campaign = checkResult.rows[0];

    // Delete campaign (CASCADE will handle related records)
    await query('DELETE FROM campaigns WHERE id = $1', [campaignId]);

    // Log admin action
    await logAdminAction(
      req.user.id,
      'DELETE_CAMPAIGN',
      'campaign',
      campaignId,
      { title: campaign.title },
      req
    );
    
    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });

  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;