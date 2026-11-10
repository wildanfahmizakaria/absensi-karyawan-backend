const { DURATION_STATUS } = require('../config/constants');

/**
 * Calculate elapsed minutes and duration evaluation status
 * Based on DATABASE-SPEC.md Section 6:
 * elapsed_minutes = floor((check_out_at - check_in_at) dalam detik / 60)
 * Break time is NOT deducted.
 *
 * @param {Date|string} checkInAt
 * @param {Date|string|null} checkOutAt
 * @param {number} minimumMinutes - Default: 510 minutes (8h 30m)
 * @returns {{ elapsedMinutes: number|null, durationStatus: string }}
 */
function calculateDuration(checkInAt, checkOutAt, minimumMinutes = 510) {
  if (!checkOutAt) {
    return {
      elapsedMinutes: null,
      durationStatus: DURATION_STATUS.IN_PROGRESS
    };
  }

  const checkIn = new Date(checkInAt);
  const checkOut = new Date(checkOutAt);

  // Time difference in milliseconds
  const diffMs = checkOut.getTime() - checkIn.getTime();
  
  // Floor to full elapsed minutes
  const elapsedMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  const durationStatus = elapsedMinutes >= minimumMinutes
    ? DURATION_STATUS.MEETS_MINIMUM
    : DURATION_STATUS.BELOW_MINIMUM;

  return {
    elapsedMinutes,
    durationStatus
  };
}

/**
 * Format minutes into "X jam Y menit"
 * @param {number|null} minutes
 * @returns {string}
 */
function formatMinutesToHours(minutes) {
  if (minutes === null || minutes === undefined) {
    return '-';
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} jam ${remainingMinutes} menit`;
}

/**
 * Format minutes into "HH:mm"
 * @param {number|null} minutes
 * @returns {string}
 */
function formatMinutesToTime(minutes) {
  if (minutes === null || minutes === undefined) {
    return '--:--';
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
}

module.exports = {
  calculateDuration,
  formatMinutesToHours,
  formatMinutesToTime
};

