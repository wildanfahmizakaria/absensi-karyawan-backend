const { pool } = require('../config/database');
const { ERROR_CODES, DURATION_STATUS, ROLES } = require('../config/constants');
const { successResponse, errorResponse } = require('../utils/response');
const { calculateDuration, formatMinutesToHours } = require('../utils/duration');
const { getSetting } = require('../utils/settings');

/**
 * POST /api/v1/attendance/check-in
 * Record check-in attendance
 */
async function checkIn(req, res, next) {
  try {
    const userId = req.user.id;
    const { latitude, longitude, accuracy_m, notes } = req.body || {};

    // 1. Validate Photo (Live camera required)
    if (!req.file) {
      return errorResponse(
        res,
        ERROR_CODES.CAMERA_REQUIRED,
        'Foto swafoto kamera live wajib disertakan saat melakukan absen masuk.',
        400
      );
    }

    // 2. Validate GPS coordinates
    if (latitude === undefined || longitude === undefined || latitude === '' || longitude === '') {
      return errorResponse(
        res,
        ERROR_CODES.LOCATION_REQUIRED,
        'Koordinat lokasi GPS (latitude dan longitude) wajib disertakan saat absensi.',
        400
      );
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const acc = accuracy_m ? parseFloat(accuracy_m) : null;

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'Koordinat GPS tidak valid.',
        400
      );
    }

    // 3. Prevent duplicate open sessions for the same user
    const [openSessions] = await pool.query(
      'SELECT id, check_in_at FROM attendance_sessions WHERE user_id = ? AND check_out_at IS NULL LIMIT 1',
      [userId]
    );

    if (openSessions.length > 0) {
      return errorResponse(
        res,
        ERROR_CODES.ALREADY_CHECKED_IN,
        'Anda masih memiliki sesi absensi aktif yang belum di-checkout. Silakan lakukan absen pulang terlebih dahulu.',
        400
      );
    }

    // 4. Server clock as authoritative timestamp
    const checkInTime = new Date();
    // Normalize path with forward slashes for cross-platform consistency
    const selfiePath = req.file.path.replace(/\\/g, '/');

    // 5. Insert new attendance session
    const insertQuery = `
      INSERT INTO attendance_sessions 
        (user_id, check_in_at, check_in_latitude, check_in_longitude, check_in_accuracy_m, check_in_selfie_path, duration_status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(insertQuery, [
      userId,
      checkInTime,
      lat,
      lng,
      acc,
      selfiePath,
      DURATION_STATUS.IN_PROGRESS,
      notes || null,
      checkInTime,
      checkInTime
    ]);

    const newSessionId = result.insertId;

    // Fetch created row
    const [rows] = await pool.query(
      'SELECT * FROM attendance_sessions WHERE id = ?',
      [newSessionId]
    );

    return successResponse(res, {
      message: 'Absen masuk berhasil dicatat.',
      session: rows[0]
    }, {}, 201);
  } catch (error) {
    // Catch MySQL unique constraint violation on active_user_session_id
    if (error.code === 'ER_DUP_ENTRY' && error.message.includes('uq_user_active_session')) {
      return errorResponse(
        res,
        ERROR_CODES.ALREADY_CHECKED_IN,
        'Sesi absensi aktif sudah tercatat untuk Anda. Tidak dapat check-in ganda.',
        400
      );
    }
    next(error);
  }
}

/**
 * POST /api/v1/attendance/check-out
 * Record check-out attendance & calculate duration
 */
async function checkOut(req, res, next) {
  try {
    const userId = req.user.id;
    const { latitude, longitude, accuracy_m, notes } = req.body || {};

    // 1. Check if user has an active open session
    const [openSessions] = await pool.query(
      'SELECT * FROM attendance_sessions WHERE user_id = ? AND check_out_at IS NULL ORDER BY check_in_at DESC LIMIT 1',
      [userId]
    );

    if (openSessions.length === 0) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_CHECKED_IN,
        'Tidak ada sesi absensi aktif yang dapat di-checkout. Silakan lakukan absen masuk terlebih dahulu.',
        400
      );
    }

    const currentSession = openSessions[0];

    // 2. Validate GPS coordinates
    if (latitude === undefined || longitude === undefined || latitude === '' || longitude === '') {
      return errorResponse(
        res,
        ERROR_CODES.LOCATION_REQUIRED,
        'Koordinat lokasi GPS (latitude dan longitude) wajib disertakan saat melakukan absen pulang.',
        400
      );
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const acc = accuracy_m ? parseFloat(accuracy_m) : null;

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'Koordinat GPS tidak valid.',
        400
      );
    }

    // 3. Server clock as authoritative timestamp
    const checkOutTime = new Date();

    // 4. Calculate elapsed minutes & duration status (Break time is NOT deducted)
    const minDurationMinutes = await getSetting('minimum_work_duration_minutes') || 510;
    const { elapsedMinutes, durationStatus } = calculateDuration(
      currentSession.check_in_at,
      checkOutTime,
      minDurationMinutes
    );

    // Optional check-out selfie path
    const checkOutSelfiePath = req.file ? req.file.path.replace(/\\/g, '/') : null;
    const updatedNotes = notes
      ? (currentSession.notes ? `${currentSession.notes} | ${notes}` : notes)
      : currentSession.notes;

    // 5. Update session in database
    const updateQuery = `
      UPDATE attendance_sessions
      SET 
        check_out_at = ?,
        check_out_latitude = ?,
        check_out_longitude = ?,
        check_out_accuracy_m = ?,
        check_out_selfie_path = COALESCE(?, check_out_selfie_path),
        elapsed_minutes = ?,
        duration_status = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?
    `;

    await pool.query(updateQuery, [
      checkOutTime,
      lat,
      lng,
      acc,
      checkOutSelfiePath,
      elapsedMinutes,
      durationStatus,
      updatedNotes,
      checkOutTime,
      currentSession.id
    ]);

    // Fetch updated session
    const [updatedRows] = await pool.query(
      'SELECT * FROM attendance_sessions WHERE id = ?',
      [currentSession.id]
    );

    const isMeetsMinimum = durationStatus === DURATION_STATUS.MEETS_MINIMUM;
    const durationHuman = formatMinutesToHours(elapsedMinutes);

    return successResponse(res, {
      message: isMeetsMinimum
        ? `Absen pulang berhasil. Total durasi kerja: ${durationHuman} (Memenuhi target ${minDurationMinutes} menit).`
        : `Absen pulang berhasil. Total durasi kerja: ${durationHuman} (Kurang dari target minimal ${minDurationMinutes} menit).`,
      session: updatedRows[0],
      evaluation: {
        elapsed_minutes: elapsedMinutes,
        duration_human: durationHuman,
        minimum_target_minutes: minDurationMinutes,
        duration_status: durationStatus,
        meets_minimum: isMeetsMinimum
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/attendance/today
 * Get user's attendance status today (including active cross-midnight sessions)
 */
async function getTodayStatus(req, res, next) {
  try {
    const userId = req.user.id;

    // Check for an active open session first (even if started before midnight)
    const [activeRows] = await pool.query(
      `SELECT * FROM attendance_sessions 
       WHERE user_id = ? AND check_out_at IS NULL 
       ORDER BY check_in_at DESC LIMIT 1`,
      [userId]
    );

    const hasActiveSession = activeRows.length > 0;
    const activeSession = hasActiveSession ? activeRows[0] : null;

    // Today's completed sessions (using Asia/Jakarta timezone date)
    const [todayCompleted] = await pool.query(
      `SELECT * FROM attendance_sessions 
       WHERE user_id = ? 
         AND DATE(CONVERT_TZ(check_in_at, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))
       ORDER BY check_in_at DESC`,
      [userId]
    );

    let currentDurationMinutes = null;
    if (activeSession) {
      const diffMs = Date.now() - new Date(activeSession.check_in_at).getTime();
      currentDurationMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    }

    return successResponse(res, {
      has_active_session: hasActiveSession,
      active_session: activeSession ? {
        ...activeSession,
        current_running_minutes: currentDurationMinutes,
        current_running_human: formatMinutesToHours(currentDurationMinutes)
      } : null,
      today_history: todayCompleted
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/attendance
 * List attendance history with filtering and pagination
 */
async function getAttendanceHistory(req, res, next) {
  try {
    const {
      page = 1,
      limit = 15,
      start_date,
      end_date,
      duration_status,
      user_id
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    // Build filter conditions
    const conditions = [];
    const params = [];

    // Authorization: Employees can only view their own records
    if (req.user.role === ROLES.EMPLOYEE) {
      conditions.push('s.user_id = ?');
      params.push(req.user.id);
    } else if (user_id) {
      conditions.push('s.user_id = ?');
      params.push(user_id);
    }

    if (start_date) {
      conditions.push('DATE(CONVERT_TZ(s.check_in_at, "+00:00", "+07:00")) >= ?');
      params.push(start_date);
    }

    if (end_date) {
      conditions.push('DATE(CONVERT_TZ(s.check_in_at, "+00:00", "+07:00")) <= ?');
      params.push(end_date);
    }

    if (duration_status) {
      conditions.push('s.duration_status = ?');
      params.push(duration_status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM attendance_sessions s 
      JOIN users u ON s.user_id = u.id 
      ${whereClause}
    `;
    const [countRows] = await pool.query(countQuery, params);
    const totalRecords = countRows[0].total;

    // Data query
    const dataQuery = `
      SELECT 
        s.id, s.user_id, s.check_in_at, s.check_in_latitude, s.check_in_longitude, s.check_in_accuracy_m, s.check_in_selfie_path,
        s.check_out_at, s.check_out_latitude, s.check_out_longitude, s.check_out_accuracy_m, s.check_out_selfie_path,
        s.elapsed_minutes, s.duration_status, s.notes, s.created_at,
        u.employee_code, u.full_name, u.email
      FROM attendance_sessions s
      JOIN users u ON s.user_id = u.id
      ${whereClause}
      ORDER BY s.check_in_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataQuery, [...params, limitNum, offset]);

    return successResponse(
      res,
      rows,
      {
        page: pageNum,
        limit: limitNum,
        total: totalRecords,
        total_pages: Math.ceil(totalRecords / limitNum)
      }
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/attendance/:id
 * Get detail of a specific attendance session
 */
async function getAttendanceDetail(req, res, next) {
  try {
    const sessionId = req.params.id;

    const query = `
      SELECT 
        s.*,
        u.employee_code, u.full_name, u.email
      FROM attendance_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [sessionId]);

    if (rows.length === 0) {
      return errorResponse(
        res,
        ERROR_CODES.NOT_FOUND,
        'Data sesi absensi tidak ditemukan.',
        404
      );
    }

    const session = rows[0];

    // Authorization check: Employee can only see their own attendance
    if (req.user.role === ROLES.EMPLOYEE && session.user_id !== req.user.id) {
      return errorResponse(
        res,
        ERROR_CODES.FORBIDDEN,
        'Anda tidak memiliki akses untuk melihat data absensi karyawan lain.',
        403
      );
    }

    return successResponse(res, { session });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkIn,
  checkOut,
  getTodayStatus,
  getAttendanceHistory,
  getAttendanceDetail
};

