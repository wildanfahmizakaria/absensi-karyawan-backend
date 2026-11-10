const mysql = require('mysql2/promise');
require('dotenv').config();

// Support standard environment variables, Railway variables (MYSQLHOST, etc.), or connection string (MYSQL_URL / DATABASE_URL)
const connectionUri = process.env.MYSQL_URL || process.env.DATABASE_URL;

const poolConfig = connectionUri
  ? {
      uri: connectionUri,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      dateStrings: true
    }
  : {
      host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT, 10) || 3306,
      user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
      password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.MYSQLPASSWORD || ''),
      database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'absensi_karyawan',
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      dateStrings: true
    };

const pool = mysql.createPool(poolConfig);

/**
 * Check if the database connection is alive
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    connection.release();
    return true;
  } catch (error) {
    console.error('MySQL Connection Error:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};

