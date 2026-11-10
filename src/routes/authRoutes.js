const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Public
router.post('/login', authLimiter, authController.login);

// Authenticated
router.post('/logout', authenticateUser, authController.logout);
router.get('/me', authenticateUser, authController.getProfile);

module.exports = router;

