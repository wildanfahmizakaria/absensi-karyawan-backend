const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { ERROR_CODES, ROLES } = require('../config/constants');
const { errorResponse } = require('../utils/response');

/**
 * Middleware to verify JWT authentication token
 */
async function authenticateUser(req, res, next) {
  try {
    let token = null;

    // Check Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.cookies && req.cookies.session_token) {
      token = req.cookies.session_token;
    }

    if (!token) {
      return errorResponse(
        res,
        ERROR_CODES.UNAUTHENTICATED,
        'Token autentikasi tidak ditemukan. Silakan login terlebih dahulu.',
        401
      );
    }

    const secret = process.env.JWT_SECRET || 'mandala_attendance_super_secret_jwt_key_2026_change_in_production';
    let decoded;

    try {
      decoded = jwt.verify(token, secret);
    } catch (jwtErr) {
      return errorResponse(
        res,
        ERROR_CODES.UNAUTHENTICATED,
        'Sesi telah kedaluwarsa atau token tidak valid. Silakan login kembali.',
        401
      );
    }

    // Verify user in database and ensure account is active
    const [rows] = await pool.query(
      'SELECT id, employee_code, full_name, email, role, is_active FROM users WHERE id = ? LIMIT 1',
      [decoded.id]
    );

    if (rows.length === 0) {
      return errorResponse(
        res,
        ERROR_CODES.UNAUTHENTICATED,
        'Pengguna tidak ditemukan dalam sistem.',
        401
      );
    }

    const user = rows[0];

    if (!user.is_active) {
      return errorResponse(
        res,
        ERROR_CODES.FORBIDDEN,
        'Akun Anda sedang dinonaktifkan. Hubungi administrator.',
        403
      );
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return errorResponse(
      res,
      ERROR_CODES.INTERNAL_ERROR,
      'Terjadi kesalahan internal saat memeriksa autentikasi.',
      500
    );
  }
}

/**
 * Middleware to restrict access based on user role
 * @param {...string} allowedRoles
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(
        res,
        ERROR_CODES.UNAUTHENTICATED,
        'Autentikasi diperlukan.',
        401
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        ERROR_CODES.FORBIDDEN,
        'Anda tidak memiliki hak akses untuk tindakan ini.',
        403
      );
    }

    next();
  };
}

module.exports = {
  authenticateUser,
  requireRole,
  ROLES
};

