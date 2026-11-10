const { pool } = require('../config/database');
const { DEFAULT_SETTINGS } = require('../config/constants');

// In-memory cache for settings
let cachedSettings = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Get all system settings from database or cache
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<Object>}
 */
async function getSystemSettings(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedSettings && (now - cacheTime < CACHE_TTL_MS)) {
    return cachedSettings;
  }

  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    const settings = { ...DEFAULT_SETTINGS };

    for (const row of rows) {
      let val = row.setting_value;
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (!isNaN(val) && val.trim() !== '') val = Number(val);
      settings[row.setting_key] = val;
    }

    cachedSettings = settings;
    cacheTime = now;
    return settings;
  } catch (error) {
    console.error('Error loading system settings, using defaults:', error.message);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Get specific setting value
 * @param {string} key
 * @returns {Promise<any>}
 */
async function getSetting(key) {
  const settings = await getSystemSettings();
  return settings[key] !== undefined ? settings[key] : DEFAULT_SETTINGS[key];
}

/**
 * Invalidate in-memory cache
 */
function invalidateSettingsCache() {
  cachedSettings = null;
  cacheTime = 0;
}

module.exports = {
  getSystemSettings,
  getSetting,
  invalidateSettingsCache
};

