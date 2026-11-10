const { pool } = require('../config/database');

/**
 * Log administrative or sensitive action into audit_logs table
 * @param {Object} params
 * @param {number|null} [params.userId=null]
 * @param {string} params.action - e.g. 'EMPLOYEE_CREATE', 'UPDATE_SETTING'
 * @param {string} params.entityType - e.g. 'users', 'system_settings'
 * @param {number|null} [params.entityId=null]
 * @param {Object|null} [params.oldValues=null]
 * @param {Object|null} [params.newValues=null]
 * @param {import('express').Request} [params.req=null] - for ip and user-agent extraction
 */
async function recordAuditLog({
  userId = null,
  action,
  entityType,
  entityId = null,
  oldValues = null,
  newValues = null,
  req = null
}) {
  try {
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      if (typeof ipAddress === 'string' && ipAddress.includes(',')) {
        ipAddress = ipAddress.split(',')[0].trim();
      }
      userAgent = (req.headers['user-agent'] || '').substring(0, 255);
      if (!userId && req.user) {
        userId = req.user.id;
      }
    }

    const query = `
      INSERT INTO audit_logs 
        (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const oldJson = oldValues ? JSON.stringify(oldValues) : null;
    const newJson = newValues ? JSON.stringify(newValues) : null;

    await pool.query(query, [
      userId,
      action,
      entityType,
      entityId,
      oldJson,
      newJson,
      ipAddress,
      userAgent
    ]);
  } catch (error) {
    // Non-blocking: log error to console so primary action doesn't fail
    console.error('Audit Log Error:', error.message);
  }
}

module.exports = {
  recordAuditLog
};

