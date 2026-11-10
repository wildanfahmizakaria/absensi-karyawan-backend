const { pool } = require('../config/database');
const { successResponse } = require('../utils/response');

/**
 * GET /api/v1/admin/audit-logs
 * Superadmin Audit Log Viewer
 */
async function getAuditLogs(req, res, next) {
  try {
    const { page = 1, limit = 20, action, entity_type } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (action) {
      conditions.push('a.action = ?');
      params.push(action);
    }

    if (entity_type) {
      conditions.push('a.entity_type = ?');
      params.push(entity_type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM audit_logs a ${whereClause}`,
      params
    );
    const totalRecords = countRows[0].total;

    const query = `
      SELECT 
        a.id, a.user_id, a.action, a.entity_type, a.entity_id, 
        a.old_values, a.new_values, a.ip_address, a.user_agent, a.created_at,
        u.employee_code, u.full_name, u.email, u.role
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(query, [...params, limitNum, offset]);

    return successResponse(res, rows, {
      page: pageNum,
      limit: limitNum,
      total: totalRecords,
      total_pages: Math.ceil(totalRecords / limitNum)
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAuditLogs
};

