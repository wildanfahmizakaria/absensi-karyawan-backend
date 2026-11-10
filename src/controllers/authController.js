const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { ERROR_CODES } = require('../config/constants');
const { successResponse, errorResponse } = require('../utils/response');
const { recordAuditLog } = require('../utils/audit');

/**
 * POST /api/v1/auth/login
 * Public login endpoint
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'Email dan kata sandi wajib diisi.',
        400
      );
    }

    // Query user by email
    const [rows] = await pool.query(
      'SELECT id, employee_code, full_name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return errorResponse(
        res,
        ERROR_CODES.UNAUTHENTICATED,
        'Email atau kata sandi yang Anda masukkan salah.',
        401
      );
    }

    const user = rows[0];

    // Check account status
    if (!user.is_active) {
      return errorResponse(
        res,
        ERROR_CODES.FORBIDDEN,
        'Akun Anda telah dinonaktifkan. Silakan hubungi administrator.',
        403
      );
    }

    // Check password hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return errorResponse(
        res,
        ERROR_CODES.UNAUTHENTICATED,
        'Email atau kata sandi yang Anda masukkan salah.',
        401
      );
    }

    // Sign JWT Token
    const payload = {
      id: user.id,
      employee_code: user.employee_code,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    };

    const secret = process.env.JWT_SECRET || 'mandala_attendance_super_secret_jwt_key_2026_change_in_production';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    const token = jwt.sign(payload, secret, { expiresIn });

    // Sanitize user data for response
    const userResponse = {
      id: user.id,
      employee_code: user.employee_code,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      is_active: Boolean(user.is_active)
    };

    return successResponse(res, {
      token,
      expires_in: expiresIn,
      user: userResponse
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/logout
 * Invalidate session / client logout
 */
async function logout(req, res, next) {
  try {
    return successResponse(res, {
      message: 'Berhasil keluar dari sistem absensi.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/auth/me
 * Get current authenticated user profile
 */
async function getProfile(req, res, next) {
  try {
    const userResponse = {
      id: req.user.id,
      employee_code: req.user.employee_code,
      full_name: req.user.full_name,
      email: req.user.email,
      role: req.user.role,
      is_active: Boolean(req.user.is_active)
    };

    return successResponse(res, { user: userResponse });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  logout,
  getProfile
};

