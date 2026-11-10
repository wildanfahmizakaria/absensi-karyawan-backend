/**
 * Application Constants
 * Based on docs/API-spec.md, docs/BUSINESS-RULES.md, docs/DATABASE-SPEC.md
 */

const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
  EMPLOYEE: 'EMPLOYEE'
};

const DURATION_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  MEETS_MINIMUM: 'MEETS_MINIMUM',
  BELOW_MINIMUM: 'BELOW_MINIMUM'
};

const CORRECTION_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

const ERROR_CODES = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CAMERA_REQUIRED: 'CAMERA_REQUIRED',
  LOCATION_REQUIRED: 'LOCATION_REQUIRED',
  LOW_LOCATION_ACCURACY: 'LOW_LOCATION_ACCURACY',
  ALREADY_CHECKED_IN: 'ALREADY_CHECKED_IN',
  NOT_CHECKED_IN: 'NOT_CHECKED_IN',
  ALREADY_CHECKED_OUT: 'ALREADY_CHECKED_OUT',
  RATE_LIMITED: 'RATE_LIMITED',
  EXPORT_FAILED: 'EXPORT_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY'
};

const DEFAULT_SETTINGS = {
  minimum_work_duration_minutes: 510, // 8 hours 30 minutes
  fixed_work_schedule_enabled: false,
  break_time_deducted: false,
  allow_checkout_below_minimum: true,
  cross_midnight_session_enabled: true,
  gps_recording_enabled: true,
  gps_geofence_enabled: false,
  selfie_camera_only: true,
  report_export_format: 'CSV',
  timezone: 'Asia/Jakarta'
};

module.exports = {
  ROLES,
  DURATION_STATUS,
  CORRECTION_STATUS,
  ERROR_CODES,
  DEFAULT_SETTINGS
};

