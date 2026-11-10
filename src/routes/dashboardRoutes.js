const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateUser, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

// Employee personal dashboard
router.get('/employee', authenticateUser, dashboardController.getEmployeeDashboard);

// Admin & Superadmin operational dashboard
router.get(
  '/admin',
  authenticateUser,
  requireRole(ROLES.ADMIN, ROLES.SUPERADMIN),
  dashboardController.getAdminDashboard
);

module.exports = router;

