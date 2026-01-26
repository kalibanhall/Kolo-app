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
              image_url, start_date, end_date, draw_date, display_order, is_featured, ticket_prefix
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
              image_url, start_date, end_date, draw_date, ticket_prefix
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
    if (isNaN(campaignId) || campaignId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
    }
    const limit = Math.min(parseInt(req.query.limit) || 10000, 50000); // Default 10000, max 50000
    
    // Get campaign info with ticket_prefix
    const campaignResult = await query(
      'SELECT id, total_tickets, sold_tickets, ticket_prefix FROM campaigns WHERE id = $1',
      [campaignId]
    );
    
    if (campaignResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    const campaign = campaignResult.rows[0];
    const ticketPrefix = campaign.ticket_prefix || 'X'; // Default prefix if not set
    
    // Calculate padding based on total tickets (e.g., 1000 -> 4 digits, 100 -> 3 digits)
    const padLength = Math.max(2, String(campaign.total_tickets).length);
    
    // Get already used ticket numbers for this campaign
    const usedResult = await query(
      'SELECT ticket_number FROM tickets WHERE campaign_id = $1',
      [campaignId]
    );
    
    // Get reserved tickets (not expired) excluding current user's reservations
    const userId = req.user?.id;
    const reservedResult = await query(
      `SELECT ticket_number FROM ticket_reservations 
       WHERE campaign_id = $1 
         AND status = 'reserved' 
         AND expires_at > CURRENT_TIMESTAMP
         ${userId ? 'AND user_id != $2' : ''}`,
      userId ? [campaignId, userId] : [campaignId]
    );
    
    const usedNumbers = new Set([
      ...usedResult.rows.map(r => r.ticket_number),
      ...reservedResult.rows.map(r => r.ticket_number)
    ]);
    
    // Generate available numbers with limit for performance
    const availableNumbers = [];
    for (let i = 1; i <= campaign.total_tickets && availableNumbers.length < limit; i++) {
      const ticketNumber = `K${ticketPrefix}-${String(i).padStart(padLength, '0')}`;
      if (!usedNumbers.has(ticketNumber)) {
        availableNumbers.push({
          number: i,
          display: ticketNumber
        });
      }
    }
    
    // Get count of reserved tickets for "last ticket" warning
    const reservedCount = reservedResult.rows.length;
    const remainingAvailable = campaign.total_tickets - campaign.sold_tickets - reservedCount;
    
    res.json({
      success: true,
      numbers: availableNumbers,
      total_available: campaign.total_tickets - campaign.sold_tickets,
      reserved_count: reservedCount,
      actual_available: remainingAvailable,
      total_tickets: campaign.total_tickets,
      padLength: padLength,
      ticket_prefix: ticketPrefix,
      limited: availableNumbers.length >= limit,
      is_last_tickets: remainingAvailable <= 3 && remainingAvailable > 0
    });

  } catch (error) {
    console.error('Get available numbers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Reserve ticket numbers (add to cart)
router.post('/:id/reserve', verifyToken, [
  body('ticket_numbers').isArray({ min: 1, max: 10 }).withMessage('1 à 10 numéros maximum')
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
    if (isNaN(campaignId) || campaignId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
    }
    const { ticket_numbers } = req.body;
    const userId = req.user.id;
    
    // Reservation expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Clean up expired reservations first
    await query(
      `DELETE FROM ticket_reservations 
       WHERE campaign_id = $1 AND status = 'reserved' AND expires_at < CURRENT_TIMESTAMP`,
      [campaignId]
    );
    
    // Cancel existing reservations from this user for this campaign
    await query(
      `UPDATE ticket_reservations 
       SET status = 'cancelled' 
       WHERE campaign_id = $1 AND user_id = $2 AND status = 'reserved'`,
      [campaignId, userId]
    );
    
    // Check which numbers are already taken
    const existingResult = await query(
      `SELECT ticket_number FROM (
        SELECT ticket_number FROM tickets WHERE campaign_id = $1
        UNION
        SELECT ticket_number FROM ticket_reservations 
        WHERE campaign_id = $1 AND status = 'reserved' AND expires_at > CURRENT_TIMESTAMP
       ) AS taken`,
      [campaignId]
    );
    
    const takenNumbers = new Set(existingResult.rows.map(r => r.ticket_number));
    const unavailable = ticket_numbers.filter(tn => takenNumbers.has(tn));
    
    if (unavailable.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Certains numéros ne sont plus disponibles',
        unavailable: unavailable
      });
    }
    
    // Reserve the numbers
    const reservations = [];
    for (const ticketNumber of ticket_numbers) {
      const result = await query(
        `INSERT INTO ticket_reservations (campaign_id, user_id, ticket_number, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (campaign_id, ticket_number) DO UPDATE
         SET user_id = $2, expires_at = $4, status = 'reserved', reserved_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [campaignId, userId, ticketNumber, expiresAt]
      );
      reservations.push(result.rows[0]);
    }
    
    res.json({
      success: true,
      message: `${ticket_numbers.length} numéro(s) réservé(s) pour 10 minutes`,
      reservations,
      expires_at: expiresAt
    });

  } catch (error) {
    console.error('Reserve tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réservation'
    });
  }
});

// Release ticket reservations (remove from cart)
router.delete('/:id/reserve', verifyToken, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    if (isNaN(campaignId) || campaignId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
    }
    const userId = req.user.id;
    const { ticket_numbers } = req.body;
    
    if (ticket_numbers && Array.isArray(ticket_numbers)) {
      // Cancel specific reservations
      await query(
        `UPDATE ticket_reservations 
         SET status = 'cancelled' 
         WHERE campaign_id = $1 AND user_id = $2 AND status = 'reserved'
           AND ticket_number = ANY($3)`,
        [campaignId, userId, ticket_numbers]
      );
    } else {
      // Cancel all reservations for this campaign
      await query(
        `UPDATE ticket_reservations 
         SET status = 'cancelled' 
         WHERE campaign_id = $1 AND user_id = $2 AND status = 'reserved'`,
        [campaignId, userId]
      );
    }
    
    res.json({
      success: true,
      message: 'Réservations annulées'
    });

  } catch (error) {
    console.error('Release reservations error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation'
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
    
    // Validate campaign ID is a valid number
    if (isNaN(campaignId) || campaignId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }
    
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
  body('title').notEmpty().withMessage('Le titre est requis').trim().isLength({ min: 5, max: 200 }).withMessage('Le titre doit avoir entre 5 et 200 caractères'),
  body('description').notEmpty().withMessage('La description est requise').trim(),
  body('total_tickets').isInt({ min: 1 }).withMessage('Le nombre de tickets doit être au moins 1'),
  body('ticket_price').isFloat({ min: 0.01 }).withMessage('Le prix du ticket doit être au moins 0.01'),
  body('ticket_prefix').notEmpty().withMessage('Le préfixe de ticket est requis').trim().isLength({ min: 1, max: 2 }).withMessage('Le préfixe doit avoir 1 ou 2 caractères').matches(/^[A-Z]{1,2}$/).withMessage('Le préfixe doit contenir uniquement des lettres majuscules'),
  body('main_prize').notEmpty().withMessage('Le prix principal est requis').trim(),
  body('start_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('La date de début doit être au format valide'),
  body('end_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('La date de fin doit être au format valide'),
  body('status').optional().isIn(['draft', 'open']).withMessage('Le statut doit être draft ou open'),
  body('draw_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('La date de tirage doit être au format valide'),
  body('secondary_prizes').optional({ nullable: true }).trim(),
  body('third_prize').optional({ nullable: true }).trim(),
  body('rules').optional({ nullable: true }).trim(),
  body('display_order').optional().isInt().withMessage('L\'ordre d\'affichage doit être un nombre'),
  body('is_featured').optional().isBoolean().withMessage('is_featured doit être un booléen')
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
      title, description, total_tickets, ticket_price, ticket_prefix,
      main_prize, image_url, start_date, end_date,
      status, draw_date, secondary_prizes, third_prize, rules,
      display_order, is_featured
    } = req.body;

    // Vérifier que le préfixe n'est pas déjà utilisé
    const existingPrefix = await query(
      'SELECT id, title FROM campaigns WHERE ticket_prefix = $1',
      [ticket_prefix.toUpperCase()]
    );
    if (existingPrefix.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Le préfixe "${ticket_prefix}" est déjà utilisé par la campagne "${existingPrefix.rows[0].title}"`
      });
    }

    const result = await query(
      `INSERT INTO campaigns (
        title, description, status, total_tickets, ticket_price, ticket_prefix,
        main_prize, image_url, start_date, end_date, draw_date,
        secondary_prizes, third_prize, rules, display_order, is_featured, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        title, description, status || 'draft', total_tickets, ticket_price, ticket_prefix.toUpperCase(),
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
    if (isNaN(campaignId) || campaignId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
    }
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
  body('title').optional().trim().isLength({ min: 5, max: 200 }).withMessage('Le titre doit avoir entre 5 et 200 caractères'),
  body('description').optional().trim(),
  body('total_tickets').optional().isInt({ min: 1 }).withMessage('Le nombre de tickets doit être au moins 1'),
  body('ticket_price').optional().isFloat({ min: 0.01 }).withMessage('Le prix du ticket doit être au moins 0.01'),
  body('main_prize').optional().trim(),
  body('start_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('La date de début doit être au format valide'),
  body('end_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('La date de fin doit être au format valide'),
  body('draw_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('La date de tirage doit être au format valide'),
  body('status').optional().isIn(['draft', 'open', 'closed', 'completed']).withMessage('Statut invalide')
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
    if (isNaN(campaignId) || campaignId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
    }
    const { 
      title, description, total_tickets, ticket_price, ticket_prefix,
      main_prize, image_url, prize_image_url, start_date, 
      end_date, draw_date, status 
    } = req.body;

    // Vérifier que le préfixe n'est pas déjà utilisé par une autre campagne
    if (ticket_prefix) {
      const existingPrefix = await query(
        'SELECT id, title FROM campaigns WHERE ticket_prefix = $1 AND id != $2',
        [ticket_prefix.toUpperCase(), campaignId]
      );
      if (existingPrefix.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Le préfixe "${ticket_prefix}" est déjà utilisé par la campagne "${existingPrefix.rows[0].title}"`
        });
      }
    }

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
           ticket_prefix = COALESCE($11, ticket_prefix),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [
        title, description, total_tickets, ticket_price, main_prize,
        image_url, cleanStartDate, cleanEndDate, cleanDrawDate, status,
        ticket_prefix ? ticket_prefix.toUpperCase() : null, campaignId
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
    if (isNaN(campaignId) || campaignId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
    }
    
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

// Get exchange rate (public endpoint)
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
    // Return default if error
    res.json({
      success: true,
      data: {
        rate: 2850,
        currency_from: 'USD',
        currency_to: 'CDF'
      }
    });
  }
});

module.exports = router;