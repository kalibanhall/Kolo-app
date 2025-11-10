const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    console.log('🔐 verifyToken - authHeader:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔐 verifyToken - token extracted:', token ? 'Yes' : 'No');

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 verifyToken - decoded userId:', decoded.userId);

    // Get user from database
    const result = await query(
      'SELECT id, email, name, phone, is_admin, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    console.log('🔐 verifyToken - DB query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];
    console.log('🔐 verifyToken - user:', user.email, 'is_admin:', user.is_admin);

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Attach user to request
    req.user = user;
    console.log('🔐 verifyToken - SUCCESS, user attached');
    next();

  } catch (error) {
    console.error('❌ verifyToken ERROR:', error.message, error.name);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Verify admin role
const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!req.user.is_admin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();

  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const result = await query(
        'SELECT id, email, name, phone, is_admin, is_active FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    }

    next();

  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

module.exports = {
  verifyToken,
  verifyAdmin,
  optionalAuth
};
