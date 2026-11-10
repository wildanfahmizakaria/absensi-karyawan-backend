const { ERROR_CODES } = require('../config/constants');
const { errorResponse } = require('../utils/response');

/**
 * Global Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  // If response has already started sending
  if (res.headersSent) {
    return next(err);
  }

  console.error('Unhandled Server Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method
  });

  // Handle Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const maxMb = process.env.MAX_FILE_SIZE_MB || 5;
    return errorResponse(
      res,
      ERROR_CODES.VALIDATION_ERROR,
      `Ukuran file foto melebihi batas maksimal (${maxMb} MB).`,
      400
    );
  }

  if (err.code === 'INVALID_FILE_TYPE') {
    return errorResponse(
      res,
      ERROR_CODES.VALIDATION_ERROR,
      err.message,
      400
    );
  }

  // Handle JSON parsing error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(
      res,
      ERROR_CODES.VALIDATION_ERROR,
      'Format JSON pada body request tidak valid.',
      400
    );
  }

  // Default internal server error
  const message = process.env.NODE_ENV === 'development'
    ? err.message
    : 'Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.';

  return errorResponse(
    res,
    ERROR_CODES.INTERNAL_ERROR,
    message,
    err.statusCode || 500
  );
}

module.exports = {
  errorHandler
};

