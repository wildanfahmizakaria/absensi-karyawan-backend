const rateLimit = require('express-rate-limit');
const { ERROR_CODES } = require('../config/constants');
const { errorResponse } = require('../utils/response');

/**
 * Standard API Rate Limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      ERROR_CODES.RATE_LIMITED,
      'Terlalu banyak permintaan dari perangkat Anda. Silakan coba kembali beberapa saat lagi.',
      429
    );
  }
});

/**
 * Auth Rate Limiter (Brute-force protection for login)
 * 15 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      ERROR_CODES.RATE_LIMITED,
      'Terlalu banyak percobaan masuk gagal. Silakan tunggu 15 menit sebelum mencoba kembali.',
      429
    );
  }
});

module.exports = {
  apiLimiter,
  authLimiter
};

