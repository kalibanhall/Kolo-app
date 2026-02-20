const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { verifyToken, verifyAdmin, requireAdminLevel } = require('../middleware/auth');
const router = express.Router();

// Validate a promo code (public - for users)
router.post('/validate', verifyToken, [
  body('code').notEmpty().trim().toUpperCase()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Code promo requis' });
    }

    const { code } = req.body;
    const userId = req.user.id;

    // Find the promo code
    const promoResult = await query(
      `SELECT * FROM promo_codes 
       WHERE UPPER(code) = $1 
       AND is_active = TRUE 
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (starts_at IS NULL OR starts_at <= NOW())`,
      [code]
    );

    if (promoResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Code promo invalide ou expiré' 
      });
    }

    const promo = promoResult.rows[0];

    // Check max uses
    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ce code promo a atteint sa limite d\'utilisation' 
      });
    }

    // Check if user already used this code
    const usageResult = await query(
      `SELECT COUNT(*) as count FROM promo_code_usage 
       WHERE promo_code_id = $1 AND user_id = $2`,
      [promo.id, userId]
    );

    if (parseInt(usageResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vous avez déjà utilisé ce code promo' 
      });
    }

    res.json({
      success: true,
      data: {
        id: promo.id,
        code: promo.code,
        description: promo.description,
        discount_type: promo.discount_type,
        discount_value: parseFloat(promo.discount_value),
        max_discount: promo.max_discount ? parseFloat(promo.max_discount) : null,
        min_purchase: parseFloat(promo.min_purchase)
      }
    });
  } catch (error) {
    console.error('Promo validation error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Calculate discount
router.post('/calculate', verifyToken, [
  body('code').notEmpty().trim().toUpperCase(),
  body('amount').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const { code, amount } = req.body;

    // Find the promo code
    const promoResult = await query(
      `SELECT * FROM promo_codes 
       WHERE UPPER(code) = $1 
       AND is_active = TRUE 
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [code]
    );

    if (promoResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Code promo invalide' });
    }

    const promo = promoResult.rows[0];

    // Check minimum purchase
    if (amount < parseFloat(promo.min_purchase)) {
      return res.status(400).json({ 
        success: false, 
        message: `Montant minimum requis: $${promo.min_purchase}` 
      });
    }

    // Calculate discount
    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = (amount * parseFloat(promo.discount_value)) / 100;
      if (promo.max_discount && discount > parseFloat(promo.max_discount)) {
        discount = parseFloat(promo.max_discount);
      }
    } else {
      discount = parseFloat(promo.discount_value);
    }

    const finalAmount = Math.max(0, amount - discount);

    res.json({
      success: true,
      data: {
        original_amount: amount,
        discount: discount,
        final_amount: finalAmount,
        promo_code_id: promo.id
      }
    });
  } catch (error) {
    console.error('Discount calculation error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============= ADMIN ROUTES =============

// List all promo codes (admin)
router.get('/admin', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT pc.id, pc.code, pc.description, pc.discount_type, pc.discount_value,
              pc.min_purchase, pc.max_discount, pc.max_uses, pc.is_active,
              pc.starts_at, pc.expires_at, pc.created_by, pc.created_at, pc.updated_at,
              pc.influencer_name,
              COALESCE(pc.current_uses, 0) as current_uses,
              u.name as created_by_name
       FROM promo_codes pc
       LEFT JOIN users u ON pc.created_by = u.id
       ORDER BY pc.created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        discount_percent: row.discount_type === 'percentage' ? parseFloat(row.discount_value) : null,
        discount_value: parseFloat(row.discount_value) || 0,
        min_purchase: parseFloat(row.min_purchase) || 0,
        max_discount: row.max_discount ? parseFloat(row.max_discount) : null,
        used_count: parseInt(row.current_uses) || 0
      }))
    });
  } catch (error) {
    console.error('List promo codes error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Create promo code (admin)
router.post('/admin', verifyToken, verifyAdmin, [
  body('code').notEmpty().trim().toUpperCase().isLength({ min: 3, max: 50 }),
  body('influencer_name').optional().trim(),
  body('description').optional().trim(),
  body('discount_type').optional().isIn(['percentage', 'fixed']),
  body('discount_value').optional().isFloat({ min: 0 }),
  body('discount_percent').optional().isInt({ min: 1, max: 100 }),
  body('min_purchase').optional().isFloat({ min: 0 }),
  body('max_discount').optional().isFloat({ min: 0 }),
  body('max_uses').optional().isInt({ min: 1 }),
  body('expires_at').optional()
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

    const { 
      code, influencer_name, description, discount_type, discount_value, 
      discount_percent, min_purchase, max_discount, max_uses, expires_at 
    } = req.body;

    // Check if code already exists
    const existing = await query('SELECT id FROM promo_codes WHERE UPPER(code) = $1', [code]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ce code promo existe déjà' 
      });
    }

    // Use discount_percent if provided, otherwise use discount_value
    const finalDiscountType = discount_percent ? 'percentage' : (discount_type || 'percentage');
    const finalDiscountValue = discount_percent || discount_value;

    if (!finalDiscountValue || finalDiscountValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La valeur de la remise est requise (discount_percent ou discount_value)'
      });
    }

    if (finalDiscountType === 'percentage' && finalDiscountValue > 100) {
      return res.status(400).json({
        success: false,
        message: 'Le pourcentage ne peut pas depasser 100%'
      });
    }

    // L1: soumission pour validation par L2
    const adminLevel = req.user.admin_level || 0;
    if (adminLevel < 2) {
      const payload = {
        code, influencer_name, description,
        discount_type: finalDiscountType,
        discount_value: finalDiscountValue,
        commission_rate: req.body.commission_rate || 5,
        min_purchase: min_purchase || 0,
        max_discount: max_discount || null,
        max_uses: max_uses || null,
        expires_at: expires_at || null
      };
      // Remove undefined values
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      await query(
        `INSERT INTO admin_validations (requested_by, action_type, entity_type, payload, status)
         VALUES ($1, 'create_promo', 'promo_code', $2, 'pending')`,
        [req.user.id, JSON.stringify(payload)]
      );
      return res.status(202).json({
        success: true,
        pending_approval: true,
        message: 'Demande de création de code promo soumise pour validation par le Superviseur (L2)'
      });
    }

    // Look up influencer user by name to set influencer_id
    let influencerId = null;
    if (influencer_name) {
      const influencerResult = await query(
        `SELECT id FROM users WHERE LOWER(name) = LOWER($1) AND is_influencer = TRUE LIMIT 1`,
        [influencer_name.trim()]
      );
      if (influencerResult.rows.length > 0) {
        influencerId = influencerResult.rows[0].id;
      }
    }

    const result = await query(
      `INSERT INTO promo_codes 
       (code, influencer_name, influencer_id, description, discount_type, discount_value, commission_rate, min_purchase, max_discount, max_uses, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        code, 
        influencer_name || null,
        influencerId,
        description || `Code promo pour ${influencer_name || 'influenceur'}`,
        finalDiscountType,
        finalDiscountValue,
        req.body.commission_rate || 5, // default 5% commission
        min_purchase || 0, 
        max_discount || null, 
        max_uses || null, 
        expires_at || null,
        req.user.id
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Code promo créé avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create promo code error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Update promo code (admin)
router.put('/admin/:id', verifyToken, verifyAdmin, [
  body('description').optional().trim(),
  body('discount_type').optional().isIn(['percentage', 'fixed']),
  body('discount_value').optional().isFloat({ min: 0 }),
  body('discount_percent').optional().isInt({ min: 1, max: 100 }),
  body('influencer_name').optional().trim(),
  body('min_purchase').optional().isFloat({ min: 0 }),
  body('max_discount').optional().isFloat({ min: 0 }),
  body('max_uses').optional().isInt({ min: 1 }),
  body('is_active').optional().isBoolean(),
  body('expires_at').optional().isISO8601()
], async (req, res) => {
  try {
    const { id } = req.params;
    const updates = [];
    const values = [];
    let paramCount = 1;

    // If discount_percent is sent, convert it to discount_value + discount_type
    if (req.body.discount_percent !== undefined) {
      req.body.discount_value = req.body.discount_percent;
      req.body.discount_type = 'percentage';
    }

    const allowedFields = [
      'description', 'discount_type', 'discount_value', 'influencer_name',
      'min_purchase', 'max_discount', 'max_uses', 'is_active', 'expires_at'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucune modification' });
    }

    values.push(id);
    const result = await query(
      `UPDATE promo_codes SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Code promo non trouvé' });
    }

    res.json({
      success: true,
      message: 'Code promo mis à jour',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update promo code error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Delete promo code (admin - L2+ only, L1 cannot delete)
router.delete('/admin/:id', verifyToken, verifyAdmin, requireAdminLevel(2), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM promo_codes WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Code promo non trouvé' });
    }

    res.json({ success: true, message: 'Code promo supprimé' });
  } catch (error) {
    console.error('Delete promo code error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Get promo code usage stats (admin)
router.get('/admin/:id/usage', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT pcu.*, u.name as user_name, u.email as user_email
       FROM promo_code_usage pcu
       JOIN users u ON pcu.user_id = u.id
       WHERE pcu.promo_code_id = $1
       ORDER BY pcu.used_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get promo usage error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
