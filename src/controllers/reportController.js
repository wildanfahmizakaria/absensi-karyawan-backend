const { pool } = require('../config/database');
const { ERROR_CODES } = require('../config/constants');
const { successResponse, errorResponse } = require('../utils/response');
const { formatMinutesToHours, formatMinutesToTime } = require('../utils/duration');
const { generateAttendancePDF } = require('../utils/pdfExport');

/**
 * Build filtered attendance report query
 */
function buildReportQuery(filters) {
  const conditions = [];
  const params = [];

  if (filters.user_id) {
    conditions.push('s.user_id = ?');
    params.push(filters.user_id);
  }

  if (filters.start_date) {
    conditions.push('DATE(CONVERT_TZ(s.check_in_at, "+00:00", "+07:00")) >= ?');
    params.push(filters.start_date);
  }

  if (filters.end_date) {
    conditions.push('DATE(CONVERT_TZ(s.check_in_at, "+00:00", "+07:00")) <= ?');
    params.push(filters.end_date);
  }

  if (filters.duration_status) {
    conditions.push('s.duration_status = ?');
    params.push(filters.duration_status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      s.id, s.user_id, s.check_in_at, s.check_in_latitude, s.check_in_longitude, s.check_in_accuracy_m, s.check_in_selfie_path,
      s.check_out_at, s.check_out_latitude, s.check_out_longitude, s.check_out_accuracy_m, s.check_out_selfie_path,
      s.elapsed_minutes, s.duration_status, s.notes,
      u.employee_code, u.full_name, u.email
    FROM attendance_sessions s
    JOIN users u ON s.user_id = u.id
    ${whereClause}
    ORDER BY s.check_in_at DESC
  `;

  return { sql, params };
}

/**
 * GET /api/v1/admin/reports/attendance
 * Filtered report data in JSON format
 */
async function getAttendanceReport(req, res, next) {
  try {
    const { user_id, start_date, end_date, duration_status } = req.query;
    const { sql, params } = buildReportQuery({ user_id, start_date, end_date, duration_status });

    const [rows] = await pool.query(sql, params);

    // Summary calculations
    const totalRecords = rows.length;
    const completedRecords = rows.filter(r => r.check_out_at !== null);
    const meetsCount = rows.filter(r => r.duration_status === 'MEETS_MINIMUM').length;
    const belowCount = rows.filter(r => r.duration_status === 'BELOW_MINIMUM').length;
    const inProgressCount = rows.filter(r => r.duration_status === 'IN_PROGRESS').length;
    const totalMinutes = completedRecords.reduce((sum, r) => sum + (r.elapsed_minutes || 0), 0);

    return successResponse(res, {
      summary: {
        total_sessions: totalRecords,
        completed_sessions: completedRecords.length,
        in_progress_sessions: inProgressCount,
        meets_minimum_count: meetsCount,
        below_minimum_count: belowCount,
        total_hours: (totalMinutes / 60).toFixed(1),
        total_minutes: totalMinutes
      },
      records: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/reports/attendance/export?format=csv|pdf
 * Export report to CSV or PDF
 */
async function exportAttendanceReport(req, res, next) {
  try {
    const { format = 'csv', user_id, start_date, end_date, duration_status } = req.query;
    const exportFormat = format.toLowerCase();

    if (exportFormat !== 'csv' && exportFormat !== 'pdf') {
      return errorResponse(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'Format ekspor tidak didukung. Gunakan format=csv atau format=pdf.',
        400
      );
    }

    const { sql, params } = buildReportQuery({ user_id, start_date, end_date, duration_status });
    const [rows] = await pool.query(sql, params);

    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    // --- CSV Export ---
    if (exportFormat === 'csv') {
      const filename = `Laporan_Absensi_Mandala_${timestampStr}.csv`;

      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Write UTF-8 BOM so Excel on Windows recognizes Indonesian characters cleanly
      res.write('\uFEFF');

      // CSV Header row
      const headers = [
        'No',
        'Kode Karyawan',
        'Nama Karyawan',
        'Email',
        'Waktu Check-in (WIB)',
        'Waktu Check-out (WIB)',
        'Durasi (Menit)',
        'Durasi Kerja',
        'Status Durasi',
        'Catatan',
        'Latitude Check-in',
        'Longitude Check-in',
        'Akurasi Masuk (m)',
        'Latitude Check-out',
        'Longitude Check-out',
        'Akurasi Pulang (m)'
      ];

      res.write(headers.map(h => `"${h}"`).join(';') + '\r\n');

      // CSV Data rows
      rows.forEach((row, index) => {
        const durationFormatted = formatMinutesToHours(row.elapsed_minutes);
        let statusLabel = 'Sedang Bertugas';
        if (row.duration_status === 'MEETS_MINIMUM') statusLabel = 'Memenuhi Durasi';
        else if (row.duration_status === 'BELOW_MINIMUM') statusLabel = 'Kurang Dari Target';

        const line = [
          index + 1,
          row.employee_code || '',
          row.full_name || '',
          row.email || '',
          row.check_in_at ? String(row.check_in_at) : '',
          row.check_out_at ? String(row.check_out_at) : 'Masih Bertugas',
          row.elapsed_minutes !== null ? row.elapsed_minutes : '',
          durationFormatted,
          statusLabel,
          (row.notes || '').replace(/"/g, '""'),
          row.check_in_latitude || '',
          row.check_in_longitude || '',
          row.check_in_accuracy_m || '',
          row.check_out_latitude || '',
          row.check_out_longitude || '',
          row.check_out_accuracy_m || ''
        ];

        res.write(line.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';') + '\r\n');
      });

      return res.end();
    }

    // --- PDF Export ---
    if (exportFormat === 'pdf') {
      const filename = `Laporan_Absensi_Mandala_${timestampStr}.pdf`;
      const pdfBuffer = await generateAttendancePDF(rows, {
        startDate: start_date,
        endDate: end_date
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(pdfBuffer);
    }
  } catch (error) {
    console.error('Export Error:', error);
    return errorResponse(res, ERROR_CODES.EXPORT_FAILED, 'Gagal membuat file ekspor laporan.', 500);
  }
}

module.exports = {
  getAttendanceReport,
  exportAttendanceReport
};

