const app = require('./src/app');
const { testConnection } = require('./src/config/database');
const { getSystemSettings } = require('./src/utils/settings');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  console.log('----------------------------------------------------');
  console.log(' Memulai Server API Absensi CV Mandala Mahardika... ');
  console.log('----------------------------------------------------');

  // Check database connectivity
  const isDbConnected = await testConnection();
  if (isDbConnected) {
    console.log('✔ Berhasil terhubung ke database MySQL.');
    // Pre-load system settings
    const settings = await getSystemSettings(true);
    console.log(`✔ Pengaturan sistem dimuat: Durasi minimal = ${settings.minimum_work_duration_minutes} menit (${(settings.minimum_work_duration_minutes / 60).toFixed(1)} jam).`);
    console.log(`✔ Perekaman lintas tengah malam: ${settings.cross_midnight_session_enabled ? 'Aktif' : 'Nonaktif'}.`);
  } else {
    console.warn('⚠ Database belum dapat terhubung atau MySQL belum dinyalakan di Laragon.');
    console.warn('  Pastikan MySQL pada Laragon sudah berstatus "Start All" dan database "absensi_karyawan" telah diimpor dari database/database.sql.');
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server berjalan pada port: ${PORT}`);
    console.log(`🌐 Base API URL: http://localhost:${PORT}/api/v1`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/v1/health`);
    console.log('----------------------------------------------------');
  });

  // Graceful shutdown
  const gracefulShutdown = (signal) => {
    console.log(`\nMenerima ${signal}. Menutup server secara aman...`);
    server.close(() => {
      console.log('Server berhasil dimatikan.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer();

