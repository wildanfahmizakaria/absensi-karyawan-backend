const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateUser, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

// Guard all settings endpoints with Superadmin
router.use(authenticateUser, requireRole(ROLES.SUPERADMIN));

// Organization profile
router.get('/organization', settingsController.getOrganizationSettings);
router.patch('/organization', settingsController.updateOrganizationSettings);

// Work Schedule & Attendance rules
router.get('/work-schedule', settingsController.getWorkScheduleSettings);
router.patch('/work-schedule', settingsController.updateWorkScheduleSettings);

module.exports = router;

