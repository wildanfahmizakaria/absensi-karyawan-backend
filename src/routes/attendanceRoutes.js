const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const correctionController = require('../controllers/correctionController');
const { authenticateUser, requireRole } = require('../middleware/auth');
const { upload } = require('../config/upload');
const { ROLES } = require('../config/constants');

// Check-in & Check-out actions (with live camera selfie upload)
router.post('/check-in', authenticateUser, upload.single('photo'), attendanceController.checkIn);
router.post('/check-out', authenticateUser, upload.single('photo'), attendanceController.checkOut);

// Today status (for employee action buttons Masuk/Pulang)
router.get('/today', authenticateUser, attendanceController.getTodayStatus);

// History and detail
router.get('/', authenticateUser, attendanceController.getAttendanceHistory);
router.get('/:id', authenticateUser, attendanceController.getAttendanceDetail);

// Attendance Corrections (Database spec Section 5)
router.get('/corrections', authenticateUser, correctionController.getCorrections);
router.post('/corrections', authenticateUser, correctionController.requestCorrection);
router.patch(
  '/corrections/:id/review',
  authenticateUser,
  requireRole(ROLES.ADMIN, ROLES.SUPERADMIN),
  correctionController.reviewCorrection
);

module.exports = router;

