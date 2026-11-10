const { pool } = require('../config/database');
const { DURATION_STATUS } = require('../config/constants');
const { successResponse } = require('../utils/response');
const { formatMinutesToHours } = require('../utils/duration');

/**
 * GET /api/v1/dashboard/employee
 * Employee personal dashboard
 */
async function getEmployeeDashboard(req, res, next) {
  try {
    const userId = req.user.id;

    // 1. Current active session
    const [activeRows] = await pool.query(
      `SELECT * FROM attendance_sessions 
       WHERE user_id = ? AND check_out_at IS NULL 
       ORDER BY check_in_at DESC LIMIT 1`,
      [userId]
    );

    const activeSession = activeRows.length > 0 ? activeRows[0] : null;
    let runningMinutes = null;
    if (activeSession) {
      const diffMs = Date.now() - new Date(activeSession.check_in_at).getTime();
      runningMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    }

    // 2. Monthly Summary (Current Month in WIB)
    const [monthlyStats] = await pool.query(
      `SELECT 
         COUNT(*) as total_sessions,
         COALESCE(SUM(elapsed_minutes), 0) as total_minutes,
         SUM(CASE WHEN duration_status = 'MEETS_MINIMUM' THEN 1 ELSE 0 END) as meets_minimum_count,
         SUM(CASE WHEN duration_status = 'BELOW_MINIMUM' THEN 1 ELSE 0 END) as below_minimum_count
       FROM attendance_sessions
       WHERE user_id = ?
         AND check_out_at IS NOT NULL
         AND YEAR(CONVERT_TZ(check_in_at, '+00:00', '+07:00')) = YEAR(CONVERT_TZ(NOW(), '+00:00', '+07:00'))
         AND MONTH(CONVERT_TZ(check_in_at, '+00:00', '+07:00')) = MONTH(CONVERT_TZ(NOW(), '+00:00', '+07:00'))`,
      [userId]
    );

    const stats = monthlyStats[0];

    // 3. Recent 5 sessions
    const [recentSessions] = await pool.query(
      `SELECT id, check_in_at, check_out_at, elapsed_minutes, duration_status, notes 
       FROM attendance_sessions
       WHERE user_id = ?
       ORDER BY check_in_at DESC
       LIMIT 5`,
      [userId]
    );

    return successResponse(res, {
      active_session: activeSession ? {
        ...activeSession,
        running_minutes: runningMinutes,
        running_human: formatMinutesToHours(runningMinutes)
      } : null,
      monthly_summary: {
        total_sessions: parseInt(stats.total_sessions, 10),
        total_hours: (parseInt(stats.total_minutes, 10) / 60).toFixed(1),
        total_minutes: parseInt(stats.total_minutes, 10),
        meets_minimum_count: parseInt(stats.meets_minimum_count, 10),
        below_minimum_count: parseInt(stats.below_minimum_count, 10)
      },
      recent_history: recentSessions
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/dashboard
 * Admin & Superadmin Operational KPI Dashboard
 */
async function getAdminDashboard(req, res, next) {
  try {
    // 1. Total Active Employees
    const [employeeCount] = await pool.query(
      "SELECT COUNT(*) as total FROM users WHERE role = 'EMPLOYEE' AND is_active = 1"
    );

    // 2. Attendance Status Today (WIB)
    // Checked in today
    const [checkedInToday] = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as total 
       FROM attendance_sessions 
       WHERE DATE(CONVERT_TZ(check_in_at, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))`
    );

    // Currently Working (Open sessions across the system)
    const [currentlyWorking] = await pool.query(
      'SELECT COUNT(*) as total FROM attendance_sessions WHERE check_out_at IS NULL'
    );

    // Completed today
    const [completedToday] = await pool.query(
      `SELECT 
         COUNT(*) as total_completed,
         SUM(CASE WHEN duration_status = 'MEETS_MINIMUM' THEN 1 ELSE 0 END) as meets_count,
         SUM(CASE WHEN duration_status = 'BELOW_MINIMUM' THEN 1 ELSE 0 END) as below_count
       FROM attendance_sessions
       WHERE check_out_at IS NOT NULL
         AND DATE(CONVERT_TZ(check_out_at, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))`
    );

    // 3. Month to date stats
    const [monthStats] = await pool.query(
      `SELECT 
         COUNT(*) as total_sessions,
         COALESCE(SUM(elapsed_minutes), 0) as total_minutes,
         SUM(CASE WHEN duration_status = 'MEETS_MINIMUM' THEN 1 ELSE 0 END) as meets_count,
         SUM(CASE WHEN duration_status = 'BELOW_MINIMUM' THEN 1 ELSE 0 END) as below_count
       FROM attendance_sessions
       WHERE check_out_at IS NOT NULL
         AND YEAR(CONVERT_TZ(check_in_at, '+00:00', '+07:00')) = YEAR(CONVERT_TZ(NOW(), '+00:00', '+07:00'))
         AND MONTH(CONVERT_TZ(check_in_at, '+00:00', '+07:00')) = MONTH(CONVERT_TZ(NOW(), '+00:00', '+07:00'))`
    );

    // 4. Recent Activity (last 10 transactions)
    const [recentActivity] = await pool.query(
      `SELECT 
         s.id, s.user_id, s.check_in_at, s.check_out_at, s.elapsed_minutes, s.duration_status,
         u.employee_code, u.full_name
       FROM attendance_sessions s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.updated_at DESC
       LIMIT 10`
    );

    return successResponse(res, {
      kpi: {
        total_active_employees: employeeCount[0].total,
        checked_in_today: checkedInToday[0].total,
        currently_working: currentlyWorking[0].total,
        completed_today: completedToday[0].total_completed,
        today_meets_minimum: parseInt(completedToday[0].meets_count || 0, 10),
        today_below_minimum: parseInt(completedToday[0].below_count || 0, 10)
      },
      month_to_date: {
        total_completed_sessions: monthStats[0].total_sessions,
        total_hours: (parseInt(monthStats[0].total_minutes, 10) / 60).toFixed(1),
        meets_minimum_count: parseInt(monthStats[0].meets_count || 0, 10),
        below_minimum_count: parseInt(monthStats[0].below_count || 0, 10)
      },
      recent_activity: recentActivity
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getEmployeeDashboard,
  getAdminDashboard
};

