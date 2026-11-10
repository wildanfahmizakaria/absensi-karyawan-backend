/**
 * Standard API Response Formatter
 * Following docs/API-spec.md Section 2
 */

/**
 * Send standard success response
 * @param {import('express').Response} res
 * @param {Object|Array} data
 * @param {Object} [meta={}]
 * @param {number} [statusCode=200]
 */
function successResponse(res, data = {}, meta = {}, statusCode = 200) {
  return res.status(statusCode).json({
    data,
    meta,
    error: null
  });
}

/**
 * Send standard error response
 * @param {import('express').Response} res
 * @param {string} code - Error code defined in ERROR_CODES
 * @param {string} message - User-friendly error message
 * @param {number} [statusCode=400]
 * @param {Object} [details=null]
 */
function errorResponse(res, code, message, statusCode = 400, details = null) {
  const errorObj = {
    code,
    message
  };

  if (details) {
    errorObj.details = details;
  }

  return res.status(statusCode).json({
    data: null,
    error: errorObj
  });
}

module.exports = {
  successResponse,
  errorResponse
};

