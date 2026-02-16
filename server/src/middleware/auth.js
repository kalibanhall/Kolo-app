const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Verify JWT token
// Simple in-memory cache for verified users (TTL: 5 minutes)
const userCache = new Map();
const USER_CACHE_TTL = 5 * 60 * 1000;

const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Check user cache to avoid DB query on every request
    const cached = userCache.get(userId);
    const now = Date.now();
    let user;

    if (cached && (now - cached.timestamp) < USER_CACHE_TTL) {
      user = cached.user;
    } else {
      // Get user from database
      const result = await query(
        'SELECT id, email, name, phone, is_admin, admin_level, is_active FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      user = result.rows[0];
      userCache.set(userId, { user, timestamp: now });
    }

    if (!user.is_active) {
      userCache.delete(userId); // Remove deactivated users from cache
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
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
      const userId = decoded.userId;

      // Check user cache first
      const cached = userCache.get(userId);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < USER_CACHE_TTL) {
        req.user = cached.user;
      } else {
        const result = await query(
          'SELECT id, email, name, phone, is_admin, admin_level, is_active FROM users WHERE id = $1',
          [userId]
        );

        if (result.rows.length > 0) {
          req.user = result.rows[0];
          userCache.set(userId, { user: result.rows[0], timestamp: now });
        }
      }
    }

    next();

  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

/**
 * Middleware factory: require a minimum admin level.
 * Level 1 = Operateur (Campagnes + Promos, creation avec validation)
 * Level 2 = Superviseur (Transactions + Tirages, consultation + lancement avec validation)
 * Level 3 = Administrateur General (Full Access)
 */
const requireAdminLevel = (minLevel) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!req.user.is_admin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const userLevel = req.user.admin_level || 0;
    if (userLevel < minLevel) {
      return res.status(403).json({
        success: false,
        message: `Niveau d'acces insuffisant. Niveau ${minLevel} requis.`,
        required_level: minLevel,
        current_level: userLevel
      });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  verifyAdmin,
  optionalAuth,
  requireAdminLevel
};
