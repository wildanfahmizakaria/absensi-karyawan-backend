const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  console.log('Menjalankan migrasi database dan seeding data...');

  const connectionUri = process.env.MYSQL_URL || process.env.DATABASE_URL;
  const targetDbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'absensi_karyawan';

  let connection;
  if (connectionUri) {
    connection = await mysql.createConnection({
      uri: connectionUri,
      multipleStatements: true
    });
  } else {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT, 10) || 3306,
      user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
      password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.MYSQLPASSWORD || ''),
      multipleStatements: true
    });
  }

  try {
    const sqlPath = path.resolve(__dirname, '../database/database.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');

    // Adapt database name dynamically if different from absensi_karyawan (e.g. 'railway' on Railway)
    if (targetDbName !== 'absensi_karyawan') {
      sql = sql
        .replace(/CREATE DATABASE IF NOT EXISTS `absensi_karyawan`/g, `CREATE DATABASE IF NOT EXISTS \`${targetDbName}\``)
        .replace(/USE `absensi_karyawan`;/g, `USE \`${targetDbName}\`;`);
    }

    console.log(`Mengeksekusi migrasi ke database [${targetDbName}]...`);
    await connection.query(sql);

    console.log('✔ Migrasi dan seeding database berhasil dieksekusi!');
  } catch (error) {
    console.error('❌ Gagal menjalankan migrasi:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();

