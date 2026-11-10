const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const adminEmployeeRoutes = require('./adminEmployeeRoutes');
const adminReportRoutes = require('./adminReportRoutes');
const adminSettingsRoutes = require('./adminSettingsRoutes');
const adminAuditRoutes = require('./adminAuditRoutes');

// Mount routes under /api/v1
router.use('/auth', authRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/admin/employees', adminEmployeeRoutes);
router.use('/admin/reports', adminReportRoutes);
router.use('/admin/settings', adminSettingsRoutes);
router.use('/admin/audit-logs', adminAuditRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Mandala Mahardika Attendance API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

