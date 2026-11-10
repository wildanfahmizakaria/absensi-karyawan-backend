const { pool } = require('../config/database');
const { ERROR_CODES } = require('../config/constants');
const { successResponse, errorResponse } = require('../utils/response');
const { getSystemSettings, invalidateSettingsCache } = require('../utils/settings');
const { recordAuditLog } = require('../utils/audit');

/**
 * GET /api/v1/admin/settings/organization
 * Get organization profile settings
 */
async function getOrganizationSettings(req, res, next) {
  try {
    const settings = await getSystemSettings();
    return successResponse(res, {
      organization: {
        company_name: settings.company_name || 'CV Mandala Mahardika',
        timezone: settings.timezone || 'Asia/Jakarta',
        report_export_format: settings.report_export_format || 'CSV'
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/admin/settings/organization
 * Update organization profile settings
 */
async function updateOrganizationSettings(req, res, next) {
  try {
    const { company_name, timezone, report_export_format } = req.body || {};
    const oldSettings = await getSystemSettings();

    const updates = [];
    if (company_name) updates.push({ key: 'company_name', val: company_name, desc: 'Nama resmi perusahaan' });
    if (timezone) updates.push({ key: 'timezone', val: timezone, desc: 'Zona waktu resmi server' });
    if (report_export_format) updates.push({ key: 'report_export_format', val: report_export_format, desc: 'Format laporan' });

    for (const item of updates) {
      const upsertSql = `
        INSERT INTO system_settings (setting_key, setting_value, description, updated_by, updated_at)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          setting_value = VALUES(setting_value),
          updated_by = VALUES(updated_by),
          updated_at = NOW()
      `;
      await pool.query(upsertSql, [item.key, String(item.val), item.desc, req.user.id]);
    }

    invalidateSettingsCache();

    await recordAuditLog({
      userId: req.user.id,
      action: 'UPDATE_ORGANIZATION_SETTINGS',
      entityType: 'system_settings',
      oldValues: oldSettings,
      newValues: req.body,
      req
    });

    return successResponse(res, {
      message: 'Pengaturan organisasi berhasil diperbarui.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/settings/work-schedule
 * Get work schedule & attendance rules configuration
 */
async function getWorkScheduleSettings(req, res, next) {
  try {
    const settings = await getSystemSettings();
    return successResponse(res, {
      work_schedule: {
        minimum_work_duration_minutes: settings.minimum_work_duration_minutes,
        fixed_work_schedule_enabled: settings.fixed_work_schedule_enabled,
        break_time_deducted: settings.break_time_deducted,
        allow_checkout_below_minimum: settings.allow_checkout_below_minimum,
        cross_midnight_session_enabled: settings.cross_midnight_session_enabled,
        gps_recording_enabled: settings.gps_recording_enabled,
        gps_geofence_enabled: settings.gps_geofence_enabled,
        selfie_camera_only: settings.selfie_camera_only
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/admin/settings/work-schedule
 * Update work schedule & attendance rules configuration
 */
async function updateWorkScheduleSettings(req, res, next) {
  try {
    const oldSettings = await getSystemSettings();
    const allowedKeys = [
      'minimum_work_duration_minutes',
      'fixed_work_schedule_enabled',
      'break_time_deducted',
      'allow_checkout_below_minimum',
      'cross_midnight_session_enabled',
      'gps_recording_enabled',
      'gps_geofence_enabled',
      'selfie_camera_only'
    ];

    const updates = [];
    const body = req.body || {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        updates.push({
          key,
          val: String(body[key])
        });
      }
    }

    if (updates.length === 0) {
      return errorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Tidak ada konfigurasi yang diubah.', 400);
    }

    for (const item of updates) {
      const upsertSql = `
        INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          setting_value = VALUES(setting_value),
          updated_by = VALUES(updated_by),
          updated_at = NOW()
      `;
      await pool.query(upsertSql, [item.key, item.val, req.user.id]);
    }

    invalidateSettingsCache();

    await recordAuditLog({
      userId: req.user.id,
      action: 'UPDATE_WORK_SCHEDULE_SETTINGS',
      entityType: 'system_settings',
      oldValues: oldSettings,
      newValues: req.body,
      req
    });

    const updatedSettings = await getSystemSettings(true);

    return successResponse(res, {
      message: 'Konfigurasi aturan kerja berhasil diperbarui.',
      settings: updatedSettings
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOrganizationSettings,
  updateOrganizationSettings,
  getWorkScheduleSettings,
  updateWorkScheduleSettings
};

