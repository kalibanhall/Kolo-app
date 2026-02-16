const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { validatePhoneNumber, normalizePhoneNumber } = require('../utils/helpers');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const { authLimiter, registrationLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Register new user
router.post('/register', registrationLimiter, [
  body('name').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('phone').notEmpty().trim(),
  body('city').optional().trim().isLength({ max: 100 }),
  body('date_of_birth').notEmpty().isISO8601().withMessage('Date de naissance invalide')
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

    const { name, email, password, phone, city, date_of_birth } = req.body;

    // Verify user is at least 18 years old
    const birthDate = new Date(date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 18) {
      return res.status(400).json({
        success: false,
        message: 'Vous devez avoir au moins 18 ans pour participer à la tombola'
      });
    }

    // Validate phone number
    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    const normalizedPhone = normalizePhoneNumber(phone);

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [email, normalizedPhone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new user
    const result = await query(
      `INSERT INTO users (name, email, password_hash, phone, city, date_of_birth, is_admin, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, email, phone, city, date_of_birth, is_admin, is_active, created_at`,
      [name, email, passwordHash, normalizedPhone, city || null, date_of_birth, false, true, false]
    );

    const user = result.rows[0];

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, verificationToken, expiresAt]
    );

    // Send verification email
    try {
      await sendVerificationEmail({
        to: user.email,
        userName: user.name,
        verificationToken
      });
      console.log('✅ Verification email sent to', user.email);
    } catch (emailError) {
      console.error('❌ Error sending verification email:', emailError);
      // Don't fail registration if email fails
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        is_admin: user.is_admin 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        is_admin: user.is_admin
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Login
router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().trim()
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

    const { email, password } = req.body;
    
    // Find user
    const result = await query(
      'SELECT id, email, name, phone, password_hash, is_admin, admin_level, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        is_admin: user.is_admin 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        is_admin: user.is_admin,
        admin_level: user.admin_level
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Verify token (check if user is authenticated)
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const result = await query(
      'SELECT id, email, name, phone, photo_url, is_admin, admin_level, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        photo_url: user.photo_url,
        is_admin: user.is_admin,
        admin_level: user.admin_level
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Verify email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find token
    const tokenResult = await query(
      `SELECT * FROM email_verification_tokens 
       WHERE token = $1 AND used = false AND expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    const verificationToken = tokenResult.rows[0];

    // Mark email as verified
    await query(
      'UPDATE users SET email_verified = true WHERE id = $1',
      [verificationToken.user_id]
    );

    // Mark token as used
    await query(
      'UPDATE email_verification_tokens SET used = true WHERE id = $1',
      [verificationToken.id]
    );

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Resend verification email
router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email'
      });
    }

    const { email } = req.body;

    // Find user
    const userResult = await query(
      'SELECT id, name, email, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Invalidate old tokens
    await query(
      'UPDATE email_verification_tokens SET used = true WHERE user_id = $1',
      [user.id]
    );

    // Store new token
    await query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, verificationToken, expiresAt]
    );

    // Send verification email
    await sendVerificationEmail({
      to: user.email,
      userName: user.name,
      verificationToken
    });

    res.json({
      success: true,
      message: 'Verification email sent'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Forgot password - Send reset email
router.post('/forgot-password', passwordResetLimiter, [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email'
      });
    }

    const { email } = req.body;

    // Find user
    const userResult = await query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email]
    );

    // Always return success even if user doesn't exist (security)
    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If an account exists, a password reset email has been sent'
      });
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate old tokens
    await query(
      'UPDATE password_reset_tokens SET used = true WHERE user_id = $1',
      [user.id]
    );

    // Store reset token
    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, resetToken, expiresAt]
    );

    // Send reset email
    await sendPasswordResetEmail({
      to: user.email,
      userName: user.name,
      resetToken
    });

    res.json({
      success: true,
      message: 'If an account exists, a password reset email has been sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Reset password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 })
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

    const { token, password } = req.body;

    // Find token
    const tokenResult = await query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = $1 AND used = false AND expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const resetToken = tokenResult.rows[0];

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, resetToken.user_id]
    );

    // Mark token as used
    await query(
      'UPDATE password_reset_tokens SET used = true WHERE id = $1',
      [resetToken.id]
    );

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Google Sign-In / Sign-Up
router.post('/google', async (req, res) => {
  try {
    const { email, name, googleId, photoURL } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        message: 'Email and Google ID are required'
      });
    }

    // Check if user already exists with this email
    let user = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (user.rows.length > 0) {
      // User exists - update google_id if not set
      if (!user.rows[0].google_id) {
        await query(
          'UPDATE users SET google_id = $1, photo_url = $2 WHERE email = $3',
          [googleId, photoURL, email]
        );
      }
      user = user.rows[0];
    } else {
      // Create new user with Google account (phone is optional for Google users)
      const result = await query(
        `INSERT INTO users (name, email, phone, google_id, photo_url, is_admin, is_active, email_verified, created_at)
         VALUES ($1, $2, '', $3, $4, false, true, true, CURRENT_TIMESTAMP)
         RETURNING *`,
        [name, email, googleId, photoURL]
      );
      user = result.rows[0];
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        isAdmin: user.is_admin 
      },
      process.env.JWT_SECRET || 'kolo-secret-key-2024',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        is_admin: user.is_admin,
        admin_level: user.admin_level,
        photo_url: user.photo_url
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during Google authentication'
    });
  }
});

module.exports = router;