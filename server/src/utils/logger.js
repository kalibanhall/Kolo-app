const { query } = require('../config/database');

// Console logger functions
const info = (message, ...args) => {
  console.log('ℹ️', message, ...args);
};

const warn = (message, ...args) => {
  console.warn('⚠️', message, ...args);
};

const error = (message, ...args) => {
  console.error('❌', message, ...args);
};

// Log admin action
const logAdminAction = async (adminId, action, entityType, entityId, details, req) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    await query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [adminId, action, entityType, entityId, JSON.stringify(details), ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw error - logging failure shouldn't break the operation
  }
};

module.exports = { 
  logAdminAction,
  info,
  warn,
  error
};
