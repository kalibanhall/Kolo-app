const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const router = express.Router();

router.get('/profile/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const result = await query(
      'SELECT id, email, name, phone, is_admin, email_verified, address_line1, address_line2, city, province, postal_code, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/profile/:userId', [
  body('name').optional().notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('phone').optional().notEmpty().trim(),
  body('photo_url').optional().isURL().withMessage('URL de photo invalide'),
  body('address_line1').optional().trim().isLength({ max: 200 }),
  body('address_line2').optional().trim().isLength({ max: 200 }),
  body('city').optional().trim().isLength({ max: 100 }),
  body('province').optional().trim().isLength({ max: 100 }),
  body('postal_code').optional().trim().isLength({ max: 20 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }
    const userId = parseInt(req.params.userId);
    const { name, phone, photo_url, address_line1, address_line2, city, province, postal_code } = req.body;
    const updates = [];
    const values = [];
    let paramCount = 1;
    if (name !== undefined) { updates.push('name = $' + (paramCount++) + ''); values.push(name); }
    if (phone !== undefined) { updates.push('phone = $' + (paramCount++) + ''); values.push(phone); }
    if (photo_url !== undefined) { updates.push('photo_url = $' + (paramCount++) + ''); values.push(photo_url || null); }
    if (address_line1 !== undefined) { updates.push('address_line1 = $' + (paramCount++) + ''); values.push(address_line1 || null); }
    if (address_line2 !== undefined) { updates.push('address_line2 = $' + (paramCount++) + ''); values.push(address_line2 || null); }
    if (city !== undefined) { updates.push('city = $' + (paramCount++) + ''); values.push(city || null); }
    if (province !== undefined) { updates.push('province = $' + (paramCount++) + ''); values.push(province || null); }
    if (postal_code !== undefined) { updates.push('postal_code = $' + (paramCount++) + ''); values.push(postal_code || null); }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);
    const updateQuery = 'UPDATE users SET ' + updates.join(', ') + ' WHERE id = $' + paramCount + ' RETURNING id, email, name, phone, photo_url, is_admin, email_verified, address_line1, address_line2, city, province, postal_code, created_at, updated_at';
    const result = await query(updateQuery, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'Profile updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Save FCM token for push notifications
router.post('/fcm-token', [
  body('fcm_token').notEmpty().isString().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid FCM token', 
        errors: errors.array() 
      });
    }

    const { fcm_token } = req.body;
    
    // Get user ID from token (requires auth middleware)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      const userId = decoded.id;

      // Update user's FCM token
      await query(
        'UPDATE users SET fcm_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [fcm_token, userId]
      );

      console.log(`✅ FCM token saved for user ${userId}`);
      res.json({ 
        success: true, 
        message: 'FCM token saved successfully' 
      });
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
  } catch (error) {
    console.error('Save FCM token error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Remove FCM token (on logout or token invalidation)
router.delete('/fcm-token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      const userId = decoded.id;

      // Remove user's FCM token
      await query(
        'UPDATE users SET fcm_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );

      console.log(`✅ FCM token removed for user ${userId}`);
      res.json({ 
        success: true, 
        message: 'FCM token removed successfully' 
      });
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
  } catch (error) {
    console.error('Remove FCM token error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
