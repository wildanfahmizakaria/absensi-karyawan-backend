const { pool } = require('../config/database');
const { ERROR_CODES, CORRECTION_STATUS, ROLES } = require('../config/constants');
const { successResponse, errorResponse } = require('../utils/response');
const { calculateDuration } = require('../utils/duration');
const { getSetting } = require('../utils/settings');
const { recordAuditLog } = require('../utils/audit');

/**
 * GET /api/v1/attendance/corrections
 * List attendance corrections
 */
async function getCorrections(req, res, next) {
  try {
    const { page = 1, limit = 15, status } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (req.user.role === ROLES.EMPLOYEE) {
      conditions.push('c.requested_by = ?');
      params.push(req.user.id);
    }

    if (status) {
      conditions.push('c.status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM attendance_corrections c ${whereClause}`,
      params
    );
    const totalRecords = countRows[0].total;

    const query = `
      SELECT 
        c.*,
        u_req.employee_code as requester_code, u_req.full_name as requester_name,
        u_rev.full_name as reviewer_name,
        s.check_in_at as original_check_in, s.check_out_at as original_check_out
      FROM attendance_corrections c
      JOIN users u_req ON c.requested_by = u_req.id
      LEFT JOIN users u_rev ON c.reviewed_by = u_rev.id
      JOIN attendance_sessions s ON c.attendance_session_id = s.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(query, [...params, limitNum, offset]);

    return successResponse(res, rows, {
      page: pageNum,
      limit: limitNum,
      total: totalRecords,
      total_pages: Math.ceil(totalRecords / limitNum)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/attendance/corrections
 * Request attendance correction
 */
async function requestCorrection(req, res, next) {
  try {
    const { attendance_session_id, reason, proposed_check_in_at, proposed_check_out_at } = req.body || {};

    if (!attendance_session_id || !reason) {
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'ID sesi absensi dan alasan permohonan koreksi wajib diisi.',
        400
      );
    }

    // Verify session
    const [sessions] = await pool.query(
      'SELECT id, user_id FROM attendance_sessions WHERE id = ? LIMIT 1',
      [attendance_session_id]
    );

    if (sessions.length === 0) {
      return errorResponse(res, ERROR_CODES.NOT_FOUND, 'Sesi absensi tidak ditemukan.', 404);
    }

    const session = sessions[0];

    // Employee can only request for their own session
    if (req.user.role === ROLES.EMPLOYEE && session.user_id !== req.user.id) {
      return errorResponse(res, ERROR_CODES.FORBIDDEN, 'Anda hanya dapat mengajukan koreksi untuk sesi Anda sendiri.', 403);
    }

    const insertQuery = `
      INSERT INTO attendance_corrections 
        (attendance_session_id, requested_by, reason, proposed_check_in_at, proposed_check_out_at, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const [result] = await pool.query(insertQuery, [
      attendance_session_id,
      req.user.id,
      reason.trim(),
      proposed_check_in_at || null,
      proposed_check_out_at || null,
      CORRECTION_STATUS.PENDING
    ]);

    const [newCorrection] = await pool.query(
      'SELECT * FROM attendance_corrections WHERE id = ?',
      [result.insertId]
    );

    return successResponse(res, {
      message: 'Permohonan koreksi absensi berhasil diajukan dan menunggu peninjauan admin.',
      correction: newCorrection[0]
    }, {}, 201);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/attendance/corrections/:id/review
 * Admin review (APPROVE / REJECT)
 */
async function reviewCorrection(req, res, next) {
  try {
    const correctionId = req.params.id;
    const { status, note } = req.body || {};

    if (!status || (status !== CORRECTION_STATUS.APPROVED && status !== CORRECTION_STATUS.REJECTED)) {
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'Status persetujuan harus APPROVED atau REJECTED.',
        400
      );
    }

    const [corrections] = await pool.query(
      'SELECT * FROM attendance_corrections WHERE id = ? LIMIT 1',
      [correctionId]
    );

    if (corrections.length === 0) {
      return errorResponse(res, ERROR_CODES.NOT_FOUND, 'Permohonan koreksi tidak ditemukan.', 404);
    }

    const correction = corrections[0];

    if (correction.status !== CORRECTION_STATUS.PENDING) {
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        `Permohonan koreksi ini sudah diproses sebelumnya dengan status ${correction.status}.`,
        400
      );
    }

    // If APPROVED, optionally update attendance_sessions
    if (status === CORRECTION_STATUS.APPROVED) {
      const [sessionRows] = await pool.query(
        'SELECT * FROM attendance_sessions WHERE id = ? LIMIT 1',
        [correction.attendance_session_id]
      );

      if (sessionRows.length > 0) {
        const originalSession = sessionRows[0];
        const newCheckIn = correction.proposed_check_in_at || originalSession.check_in_at;
        const newCheckOut = correction.proposed_check_out_at || originalSession.check_out_at;

        let elapsed = originalSession.elapsed_minutes;
        let durStatus = originalSession.duration_status;

        if (newCheckIn && newCheckOut) {
          const minMins = await getSetting('minimum_work_duration_minutes') || 510;
          const calc = calculateDuration(newCheckIn, newCheckOut, minMins);
          elapsed = calc.elapsedMinutes;
          durStatus = calc.durationStatus;
        }

        const auditNote = `Koreksi disetujui oleh ${req.user.full_name} (${req.user.employee_code}). Alasan: ${correction.reason}`;
        const updatedNotes = originalSession.notes
          ? `${originalSession.notes} | [KOREKSI]: ${auditNote}`
          : `[KOREKSI]: ${auditNote}`;

        await pool.query(
          `UPDATE attendance_sessions 
           SET check_in_at = ?, check_out_at = ?, elapsed_minutes = ?, duration_status = ?, notes = ?, updated_at = NOW()
           WHERE id = ?`,
          [newCheckIn, newCheckOut, elapsed, durStatus, updatedNotes, originalSession.id]
        );
      }
    }

    // Update correction record
    await pool.query(
      `UPDATE attendance_corrections 
       SET status = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [status, req.user.id, correctionId]
    );

    // Record audit log
    await recordAuditLog({
      userId: req.user.id,
      action: `CORRECTION_${status}`,
      entityType: 'attendance_corrections',
      entityId: correctionId,
      oldValues: { status: correction.status },
      newValues: { status, reviewed_by: req.user.id, note },
      req
    });

    const [updatedCorrection] = await pool.query(
      'SELECT * FROM attendance_corrections WHERE id = ?',
      [correctionId]
    );

    return successResponse(res, {
      message: `Permohonan koreksi absensi telah di-${status.toLowerCase()}.`,
      correction: updatedCorrection[0]
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCorrections,
  requestCorrection,
  reviewCorrection
};

