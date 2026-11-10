const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { ERROR_CODES, ROLES } = require('../config/constants');
const { successResponse, errorResponse } = require('../utils/response');
const { recordAuditLog } = require('../utils/audit');

/**
 * GET /api/v1/admin/employees
 * List all employees with filtering & pagination
 */
async function getEmployees(req, res, next) {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role = '',
      is_active
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (search.trim()) {
      conditions.push('(employee_code LIKE ? OR full_name LIKE ? OR email LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }

    if (is_active !== undefined && is_active !== '') {
      conditions.push('is_active = ?');
      params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const totalRecords = countRows[0].total;

    // Fetch data (excluding password_hash)
    const [rows] = await pool.query(
      `SELECT id, employee_code, full_name, email, role, is_active, created_at, updated_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

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

/**
 * POST /api/v1/admin/employees
 * Create new employee
 */
async function createEmployee(req, res, next) {
  try {
    const {
      employee_code,
      full_name,
      email,
      password,
      role = ROLES.EMPLOYEE
    } = req.body || {};

    if (!employee_code || !full_name || !email || !password) {
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'Kode karyawan, nama lengkap, email, dan password wajib diisi.',
        400
      );
    }

    // Role check: Only Superadmin can create another Superadmin
    if (role === ROLES.SUPERADMIN && req.user.role !== ROLES.SUPERADMIN) {
      return errorResponse(
        res,
        ERROR_CODES.FORBIDDEN,
        'Hanya Superadmin yang dapat membuat pengguna berkedudukan Superadmin.',
        403
      );
    }

    // Check duplicate employee_code or email
    const [existing] = await pool.query(
      'SELECT id, employee_code, email FROM users WHERE employee_code = ? OR email = ? LIMIT 1',
      [employee_code.trim(), email.trim().toLowerCase()]
    );

    if (existing.length > 0) {
      const match = existing[0];
      const field = match.email === email.trim().toLowerCase() ? 'Email' : 'Kode karyawan';
      return errorResponse(
        res,
        ERROR_CODES.DUPLICATE_ENTRY,
        `${field} sudah terdaftar dalam sistem. Gunakan nilai lain.`,
        409
      );
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const insertQuery = `
      INSERT INTO users (employee_code, full_name, email, password_hash, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
    `;

    const [result] = await pool.query(insertQuery, [
      employee_code.trim(),
      full_name.trim(),
      email.trim().toLowerCase(),
      passwordHash,
      role
    ]);

    const newUserId = result.insertId;

    // Fetch created user
    const [createdUserRows] = await pool.query(
      'SELECT id, employee_code, full_name, email, role, is_active, created_at FROM users WHERE id = ?',
      [newUserId]
    );

    // Audit log
    await recordAuditLog({
      userId: req.user.id,
      action: 'EMPLOYEE_CREATE',
      entityType: 'users',
      entityId: newUserId,
      newValues: createdUserRows[0],
      req
    });

    return successResponse(
      res,
      {
        message: 'Karyawan baru berhasil ditambahkan.',
        employee: createdUserRows[0]
      },
      {},
      201
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/employees/:id
 * Get single employee detail
 */
async function getEmployeeById(req, res, next) {
  try {
    const employeeId = req.params.id;

    const [rows] = await pool.query(
      'SELECT id, employee_code, full_name, email, role, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [employeeId]
    );

    if (rows.length === 0) {
      return errorResponse(res, ERROR_CODES.NOT_FOUND, 'Karyawan tidak ditemukan.', 404);
    }

    return successResponse(res, { employee: rows[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/admin/employees/:id
 * Update employee details
 */
async function updateEmployee(req, res, next) {
  try {
    const employeeId = req.params.id;
    const { full_name, email, role, is_active, password } = req.body || {};

    const [existing] = await pool.query(
      'SELECT id, employee_code, full_name, email, role, is_active FROM users WHERE id = ? LIMIT 1',
      [employeeId]
    );

    if (existing.length === 0) {
      return errorResponse(res, ERROR_CODES.NOT_FOUND, 'Karyawan tidak ditemukan.', 404);
    }

    const currentData = existing[0];

    // Role safety: Only superadmin can change role to/from SUPERADMIN
    if (
      (role === ROLES.SUPERADMIN || currentData.role === ROLES.SUPERADMIN) &&
      req.user.role !== ROLES.SUPERADMIN
    ) {
      return errorResponse(
        res,
        ERROR_CODES.FORBIDDEN,
        'Hanya Superadmin yang berwenang mengubah data akun Superadmin.',
        403
      );
    }

    // Check duplicate email if changed
    if (email && email.trim().toLowerCase() !== currentData.email) {
      const [emailCheck] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1',
        [email.trim().toLowerCase(), employeeId]
      );
      if (emailCheck.length > 0) {
        return errorResponse(
          res,
          ERROR_CODES.DUPLICATE_ENTRY,
          'Alamat email sudah digunakan oleh pengguna lain.',
          409
        );
      }
    }

    const updates = [];
    const params = [];

    if (full_name) {
      updates.push('full_name = ?');
      params.push(full_name.trim());
    }

    if (email) {
      updates.push('email = ?');
      params.push(email.trim().toLowerCase());
    }

    if (role) {
      updates.push('role = ?');
      params.push(role);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active === true || is_active === 1 || is_active === '1' ? 1 : 0);
    }

    if (password) {
      const saltRounds = 10;
      const newHash = await bcrypt.hash(password, saltRounds);
      updates.push('password_hash = ?');
      params.push(newHash);
    }

    if (updates.length === 0) {
      return errorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Tidak ada data yang diperbarui.', 400);
    }

    updates.push('updated_at = NOW()');
    params.push(employeeId);

    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    // Fetch updated
    const [updatedRows] = await pool.query(
      'SELECT id, employee_code, full_name, email, role, is_active, updated_at FROM users WHERE id = ?',
      [employeeId]
    );

    // Audit log
    await recordAuditLog({
      userId: req.user.id,
      action: 'EMPLOYEE_UPDATE',
      entityType: 'users',
      entityId: employeeId,
      oldValues: currentData,
      newValues: updatedRows[0],
      req
    });

    return successResponse(res, {
      message: 'Data karyawan berhasil diperbarui.',
      employee: updatedRows[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/admin/employees/:id
 * Deactivate / Soft delete employee
 */
async function deleteEmployee(req, res, next) {
  try {
    const employeeId = req.params.id;

    if (parseInt(employeeId, 10) === req.user.id) {
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'Anda tidak dapat menonaktifkan akun Anda sendiri.',
        400
      );
    }

    const [existing] = await pool.query(
      'SELECT id, employee_code, full_name, role, is_active FROM users WHERE id = ? LIMIT 1',
      [employeeId]
    );

    if (existing.length === 0) {
      return errorResponse(res, ERROR_CODES.NOT_FOUND, 'Karyawan tidak ditemukan.', 404);
    }

    await pool.query('UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = ?', [employeeId]);

    await recordAuditLog({
      userId: req.user.id,
      action: 'EMPLOYEE_DEACTIVATE',
      entityType: 'users',
      entityId: employeeId,
      oldValues: existing[0],
      newValues: { is_active: 0 },
      req
    });

    return successResponse(res, {
      message: `Akun karyawan ${existing[0].full_name} (${existing[0].employee_code}) berhasil dinonaktifkan.`
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getEmployees,
  createEmployee,
  getEmployeeById,
  updateEmployee,
  deleteEmployee
};

