const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorResponse } = require('./utils/response');
const { ERROR_CODES } = require('./config/constants');

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration
app.use(cors({
  origin: true, // Allow frontend during development (e.g., localhost:3000, localhost:5173, etc.)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static route to serve uploaded selfie photos securely
const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads/selfies');
app.use('/uploads/selfies', express.static(uploadDir));

// Rate Limiting
app.use('/api', apiLimiter);

// Mount API v1 Routes
app.use('/api/v1', routes);

// Root Info Route
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'REST API Sistem Absensi CV Mandala Mahardika',
    status: 'Online',
    version: '1.0.0',
    base_api: '/api/v1',
    health_check: '/api/v1/health',
    endpoints: {
      auth: '/api/v1/auth/login',
      attendance: '/api/v1/attendance',
      dashboard: '/api/v1/dashboard',
      admin: '/api/v1/admin'
    }
  });
});

// 404 Route Handler
app.use((req, res) => {
  return errorResponse(
    res,
    ERROR_CODES.NOT_FOUND,
    `Rute ${req.method} ${req.originalUrl} tidak ditemukan pada server API.`,
    404
  );
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;

