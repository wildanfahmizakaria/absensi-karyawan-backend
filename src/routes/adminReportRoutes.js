const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateUser, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

// Guard all report endpoints with Admin/Superadmin
router.use(authenticateUser, requireRole(ROLES.ADMIN, ROLES.SUPERADMIN));

router.get('/attendance', reportController.getAttendanceReport);
router.get('/attendance/export', reportController.exportAttendanceReport);

module.exports = router;

