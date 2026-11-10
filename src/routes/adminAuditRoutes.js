const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { authenticateUser, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

// Guard audit logs with Superadmin
router.use(authenticateUser, requireRole(ROLES.SUPERADMIN));

router.get('/', auditLogController.getAuditLogs);

module.exports = router;

