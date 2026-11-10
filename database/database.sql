-- ==============================================================================
-- DATABASE SCHEMA & SEED DATA
-- Proyek: Sistem Absensi Karyawan Berbasis Website (Mobile-First / PWA)
-- Organisasi: CV Mandala Mahardika
-- Dokumen Acuan: docs/DATABASE-SPEC.md (Versi 0.4) & docs/BUSINESS-RULES.md
-- Target DBMS: MySQL 8.0+ / MariaDB 10.5+
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Inisialisasi Database
-- ------------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `absensi_karyawan`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `absensi_karyawan`;

-- Matikan foreign key checks sementara untuk mempermudah drop dan re-create tabel
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `attendance_corrections`;
DROP TABLE IF EXISTS `attendance_sessions`;
DROP TABLE IF EXISTS `system_settings`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------------
-- 2. Tabel `users`
-- ------------------------------------------------------------------------------
-- Menyimpan identitas pengguna, hak akses, dan status akun aktif.
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_code` VARCHAR(50) NOT NULL COMMENT 'Kode identitas karyawan unik',
  `full_name` VARCHAR(150) NOT NULL COMMENT 'Nama lengkap karyawan',
  `email` VARCHAR(255) NOT NULL COMMENT 'Alamat email aktif untuk autentikasi',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Hash sandi aman (bcrypt/argon2)',
  `role` ENUM('EMPLOYEE', 'ADMIN', 'SUPERADMIN') NOT NULL DEFAULT 'EMPLOYEE' COMMENT 'Peran akses pengguna',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Status keaktifan akun (1=Aktif, 0=Nonaktif)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu server akun dibuat',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Waktu server akun diperbarui',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_employee_code` (`employee_code`),
  UNIQUE KEY `uq_users_email` (`email`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabel data pengguna dan peran akses';

-- ------------------------------------------------------------------------------
-- 3. Tabel `attendance_sessions`
-- ------------------------------------------------------------------------------
-- Menyimpan sesi absensi dari check-in hingga check-out.
-- Satu baris mewakili satu sesi kerja penuh (bisa lintas tengah malam).
-- Kolom virtual `active_user_session_id` memastikan 1 karyawan hanya memiliki maksimal 1 sesi aktif.
CREATE TABLE `attendance_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Relasi ke tabel users.id',
  
  -- Data Check-in
  `check_in_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu resmi check-in dari server',
  `check_in_latitude` DECIMAL(10, 7) NULL DEFAULT NULL COMMENT 'Garis lintang GPS check-in',
  `check_in_longitude` DECIMAL(10, 7) NULL DEFAULT NULL COMMENT 'Garis bujur GPS check-in',
  `check_in_accuracy_m` DECIMAL(8, 2) NULL DEFAULT NULL COMMENT 'Estimasi akurasi GPS dalam meter saat check-in',
  `check_in_selfie_path` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Path referensi file swafoto check-in di storage',
  
  -- Data Check-out
  `check_out_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Waktu resmi check-out dari server (NULL jika masih bertugas)',
  `check_out_latitude` DECIMAL(10, 7) NULL DEFAULT NULL COMMENT 'Garis lintang GPS check-out',
  `check_out_longitude` DECIMAL(10, 7) NULL DEFAULT NULL COMMENT 'Garis bujur GPS check-out',
  `check_out_accuracy_m` DECIMAL(8, 2) NULL DEFAULT NULL COMMENT 'Estimasi akurasi GPS dalam meter saat check-out',
  `check_out_selfie_path` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Path referensi file swafoto check-out di storage',
  
  -- Hasil Evaluasi Durasi
  `elapsed_minutes` INT NULL DEFAULT NULL COMMENT 'Total menit kerja riil = floor((check_out_at - check_in_at)/60) tanpa potong istirahat',
  `duration_status` ENUM('IN_PROGRESS', 'MEETS_MINIMUM', 'BELOW_MINIMUM') NOT NULL DEFAULT 'IN_PROGRESS' COMMENT 'Status evaluasi durasi kerja',
  `notes` TEXT NULL DEFAULT NULL COMMENT 'Catatan opsional karyawan / sistem',

  -- Kolom virtual untuk mencegah lebih dari 1 sesi aktif (open session) per karyawan
  `active_user_session_id` BIGINT UNSIGNED GENERATED ALWAYS AS (IF(`check_out_at` IS NULL, `user_id`, NULL)) VIRTUAL,
  
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu server baris dibuat',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Waktu server baris diperbarui',
  
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_attendance_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  -- Constraint unik untuk mencegah sesi ganda terbuka
  UNIQUE KEY `uq_user_active_session` (`active_user_session_id`),
  
  -- Indeks untuk performa kueri riwayat dan pelaporan
  INDEX `idx_sessions_user_check_in` (`user_id`, `check_in_at`),
  INDEX `idx_sessions_check_in_at` (`check_in_at`),
  INDEX `idx_sessions_check_out_at` (`check_out_at`),
  INDEX `idx_sessions_duration_status` (`duration_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabel sesi transaksi absensi kerja';

-- ------------------------------------------------------------------------------
-- 4. Tabel `system_settings`
-- ------------------------------------------------------------------------------
-- Menyimpan parameter konfigurasi dinamis sistem absensi.
CREATE TABLE `system_settings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL COMMENT 'Kunci konfigurasi sistem',
  `setting_value` VARCHAR(500) NOT NULL COMMENT 'Nilai konfigurasi (teks / angka / boolean / JSON)',
  `description` TEXT NULL DEFAULT NULL COMMENT 'Deskripsi fungsi pengaturan',
  `updated_by` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'ID pengguna yang terakhir mengubah pengaturan',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu server konfigurasi dibuat',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Waktu server konfigurasi diperbarui',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_system_settings_key` (`setting_key`),
  CONSTRAINT `fk_system_settings_updated_by`
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabel konfigurasi operasional sistem';

-- ------------------------------------------------------------------------------
-- 5. Tabel `attendance_corrections`
-- ------------------------------------------------------------------------------
-- Menyimpan permohonan pengajuan koreksi absensi dan riwayat peninjauannya.
CREATE TABLE `attendance_corrections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `attendance_session_id` BIGINT UNSIGNED NOT NULL COMMENT 'ID sesi absensi yang diajukan koreksi',
  `requested_by` BIGINT UNSIGNED NOT NULL COMMENT 'ID karyawan pemohon koreksi',
  `reviewed_by` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'ID admin peninjau koreksi',
  `reason` TEXT NOT NULL COMMENT 'Alasan wajib permohonan koreksi',
  `proposed_check_in_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Usulan waktu check-in pengganti',
  `proposed_check_out_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Usulan waktu check-out pengganti',
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT 'Status verifikasi pengajuan',
  `reviewed_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Waktu peninjauan dilakukan',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu pengajuan dibuat',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Waktu status diperbarui',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_corrections_session`
    FOREIGN KEY (`attendance_session_id`) REFERENCES `attendance_sessions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_corrections_requested_by`
    FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_corrections_reviewed_by`
    FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_corrections_session_id` (`attendance_session_id`),
  INDEX `idx_corrections_requested_by` (`requested_by`),
  INDEX `idx_corrections_reviewed_by` (`reviewed_by`),
  INDEX `idx_corrections_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabel permohonan koreksi sesi absensi';

-- ------------------------------------------------------------------------------
-- 6. Tabel `audit_logs`
-- ------------------------------------------------------------------------------
-- Menyimpan jejak audit aktivitas administratif dan aksi sensitif (PRD FR-10).
CREATE TABLE `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'ID pengguna pelaku tindakan (NULL jika dilakukan sistem)',
  `action` VARCHAR(100) NOT NULL COMMENT 'Jenis aksi (e.g., UPDATE_SETTING, APPROVE_CORRECTION, USER_CREATE)',
  `entity_type` VARCHAR(100) NOT NULL COMMENT 'Nama entitas/tabel terkait',
  `entity_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'ID rekaman entitas terkait',
  `old_values` JSON NULL DEFAULT NULL COMMENT 'Data snapshot sebelum perubahan',
  `new_values` JSON NULL DEFAULT NULL COMMENT 'Data snapshot sesudah perubahan',
  `ip_address` VARCHAR(45) NULL DEFAULT NULL COMMENT 'Alamat IP pengguna',
  `user_agent` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Informasi browser / perangkat pengguna',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu server aksi tercatat',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_audit_logs_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_audit_logs_user_id` (`user_id`),
  INDEX `idx_audit_logs_action` (`action`),
  INDEX `idx_audit_logs_entity` (`entity_type`, `entity_id`),
  INDEX `idx_audit_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabel jejak audit aktivitas sistem dan admin';

-- ==============================================================================
-- SEED DATA (DATA AWAL)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- A. Data Awal Pengguna (Users)
-- Catatan: Password default seluruh akun sampel di bawah adalah: password123
-- Hash Bcrypt: $2y$10$AwDvWGpmPaTMAv7JiVxcTO7RqeDpiIW.spZBaoxz.mYQgtu8iJeKK
-- ------------------------------------------------------------------------------
INSERT INTO `users` (`id`, `employee_code`, `full_name`, `email`, `password_hash`, `role`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'SA-001', 'Superadmin Mandala', 'superadmin@mandalamahardika.com', '$2y$10$AwDvWGpmPaTMAv7JiVxcTO7RqeDpiIW.spZBaoxz.mYQgtu8iJeKK', 'SUPERADMIN', 1, '2026-11-01 07:00:00', '2026-11-01 07:00:00'),
(2, 'ADM-001', 'Admin Operasional', 'admin@mandalamahardika.com', '$2y$10$AwDvWGpmPaTMAv7JiVxcTO7RqeDpiIW.spZBaoxz.mYQgtu8iJeKK', 'ADMIN', 1, '2026-11-01 07:00:00', '2026-11-01 07:00:00'),
(3, 'EMP-001', 'Budi Santoso', 'budi.santoso@mandalamahardika.com', '$2y$10$AwDvWGpmPaTMAv7JiVxcTO7RqeDpiIW.spZBaoxz.mYQgtu8iJeKK', 'EMPLOYEE', 1, '2026-11-01 07:00:00', '2026-11-01 07:00:00'),
(4, 'EMP-002', 'Siti Rahmawati', 'siti.rahmawati@mandalamahardika.com', '$2y$10$AwDvWGpmPaTMAv7JiVxcTO7RqeDpiIW.spZBaoxz.mYQgtu8iJeKK', 'EMPLOYEE', 1, '2026-11-01 07:00:00', '2026-11-01 07:00:00'),
(5, 'EMP-003', 'Ahmad Fauzi', 'ahmad.fauzi@mandalamahardika.com', '$2y$10$AwDvWGpmPaTMAv7JiVxcTO7RqeDpiIW.spZBaoxz.mYQgtu8iJeKK', 'EMPLOYEE', 1, '2026-11-01 07:00:00', '2026-11-01 07:00:00');

-- ------------------------------------------------------------------------------
-- B. Data Awal Konfigurasi Sistem (System Settings)
-- Mengacu pada Spesifikasi DATABASE-SPEC.md Bagian 4 & BUSINESS-RULES.md Bagian 7
-- ------------------------------------------------------------------------------
INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `description`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 'minimum_work_duration_minutes', '510', 'Batas durasi kerja minimal per sesi absensi (510 menit = 8 jam 30 menit)', 1, '2026-11-01 07:00:00', '2026-11-01 07:00:00'),
(2, 'fixed_work_schedule_enabled', 'false', 'Mode jadwal kerja tetap universal dinonaktifkan; karyawan bebas masuk jam berapapun', 1, '2026-11-01 07:00:00', '2026-11-01 07:00:00'),
(3, 'break_time_deducted', 'false', 'Waktu istirahat tidak dikurangi dari perhitungan total durasi kerja', 1, '2026-11-01 07:00:00', '2026-11-01 07:00:00'),
(4, 'allow_checkout_below_minimum', 'true', 'Izin check-out tetap diberikan meskipun durasi kerja belum mencapai 510 menit', 1, '2026-11-01 07:00:00', '2026-11-01 07:00:00'),
(5, 'cross_midnight_session_enabled', 'true', 'Sesi absensi tetap aktif berjalan melintasi pergantian hari/tengah malam tanpa reset', 1, '2026-11-01 07:00:00', '2026-11-01 07:00:00'),
(6, 'gps_recording_enabled', 'true', 'Perekaman koordinat lokasi GPS diaktifkan untuk bukti audit kehadiran', 1, '2026-11-01 07:00:00', '2026-11-01 07:00:00'),
(7, 'gps_geofence_enabled', 'false', 'Pembatasan radius geofence kantor dimatikan; absensi tidak ditolak berdasarkan jarak', 1, '2026-11-01 07:00:00', '2026-11-01 07:00:00'),
(8, 'selfie_camera_only', 'true', 'Wajib swafoto langsung dari kamera perangkat (stream live), galeri tidak diizinkan', 1, '2026-11-01 07:00:00', '2026-11-01 07:00:00'),
(9, 'report_export_format', 'CSV', 'Format standar ekspor laporan absensi (CSV kompatibel Excel & PDF)', 1, '2026-11-01 07:00:00', '2026-11-01 07:00:00'),
(10, 'timezone', 'Asia/Jakarta', 'Zona waktu resmi server aplikasi (Waktu Indonesia Barat / UTC+7)', 1, '2026-11-01 07:00:00', '2026-11-01 07:00:00');

-- ------------------------------------------------------------------------------
-- C. Data Sampel Sesi Absensi (Attendance Sessions)
-- Mencontohkan seluruh skenario aturan bisnis:
-- Sesi 1: Memenuhi durasi kerja (540 menit >= 510 menit -> MEETS_MINIMUM)
-- Sesi 2: Kurang dari durasi minimal (420 menit < 510 menit -> BELOW_MINIMUM)
-- Sesi 3: Sesi kerja malam melintasi tengah malam (540 menit -> MEETS_MINIMUM)
-- Sesi 4: Sesi yang sedang berjalan aktif saat ini (check_out_at NULL -> IN_PROGRESS)
-- ------------------------------------------------------------------------------
INSERT INTO `attendance_sessions` (
  `id`, `user_id`,
  `check_in_at`, `check_in_latitude`, `check_in_longitude`, `check_in_accuracy_m`, `check_in_selfie_path`,
  `check_out_at`, `check_out_latitude`, `check_out_longitude`, `check_out_accuracy_m`, `check_out_selfie_path`,
  `elapsed_minutes`, `duration_status`, `notes`, `created_at`, `updated_at`
) VALUES
-- Sesi 1: Budi Santoso (Memenuhi Durasi: 9 Jam = 540 Menit)
(
  1, 3,
  '2026-11-04 08:00:00', -6.2087634, 106.8455990, 12.50, 'uploads/selfies/checkin_emp001_20261104_080000.jpg',
  '2026-11-04 17:00:00', -6.2087610, 106.8456102, 10.20, 'uploads/selfies/checkout_emp001_20261104_170000.jpg',
  540, 'MEETS_MINIMUM', 'Tugas reguler kantor selesai tepat waktu',
  '2026-11-04 08:00:00', '2026-11-04 17:00:00'
),
-- Sesi 2: Siti Rahmawati (Kurang Durasi: 7 Jam = 420 Menit < 510 Menit)
(
  2, 4,
  '2026-11-04 08:30:00', -6.2001234, 106.8324567, 15.00, 'uploads/selfies/checkin_emp002_20261104_083000.jpg',
  '2026-11-04 15:30:00', -6.2001500, 106.8324800, 14.50, 'uploads/selfies/checkout_emp002_20261104_153000.jpg',
  420, 'BELOW_MINIMUM', 'Izin pulang lebih awal karena urusan keluarga darurat',
  '2026-11-04 08:30:00', '2026-11-04 15:30:00'
),
-- Sesi 3: Ahmad Fauzi (Shift Malam Lintas Tengah Malam: 21:00 sd 06:00 = 540 Menit -> MEETS_MINIMUM)
(
  3, 5,
  '2026-11-04 21:00:00', -6.2154321, 106.8512345, 8.00, 'uploads/selfies/checkin_emp003_20261104_210000.jpg',
  '2026-11-05 06:00:00', -6.2154400, 106.8512500, 9.10, 'uploads/selfies/checkout_emp003_20261105_060000.jpg',
  540, 'MEETS_MINIMUM', 'Penjagaan shift malam operasional',
  '2026-11-04 21:00:00', '2026-11-05 06:00:00'
),
-- Sesi 4: Budi Santoso (Sesi Aktif Hari Ini / Sedang Bertugas)
(
  4, 3,
  '2026-11-05 08:00:00', -6.2087650, 106.8456000, 11.00, 'uploads/selfies/checkin_emp001_20261105_080000.jpg',
  NULL, NULL, NULL, NULL, NULL,
  NULL, 'IN_PROGRESS', 'Sedang bertugas hari ini',
  '2026-11-05 08:00:00', '2026-11-05 08:00:00'
);

-- ------------------------------------------------------------------------------
-- D. Data Sampel Pengajuan Koreksi Absensi (Attendance Corrections)
-- ------------------------------------------------------------------------------
INSERT INTO `attendance_corrections` (
  `id`, `attendance_session_id`, `requested_by`, `reviewed_by`, `reason`,
  `proposed_check_in_at`, `proposed_check_out_at`, `status`, `reviewed_at`, `created_at`, `updated_at`
) VALUES
(
  1, 2, 4, NULL,
  'Pengajuan keterangan resmi untuk kepulangan lebih awal dikarenakan urusan keluarga mendadak',
  NULL, '2026-11-04 17:00:00',
  'PENDING', NULL,
  '2026-11-04 16:00:00', '2026-11-04 16:00:00'
);

-- ------------------------------------------------------------------------------
-- E. Data Sampel Jejak Audit (Audit Logs)
-- ------------------------------------------------------------------------------
INSERT INTO `audit_logs` (
  `id`, `user_id`, `action`, `entity_type`, `entity_id`,
  `old_values`, `new_values`, `ip_address`, `user_agent`, `created_at`
) VALUES
(
  1, 1, 'SYSTEM_INITIALIZATION', 'system_settings', 1,
  NULL,
  JSON_OBJECT('minimum_work_duration_minutes', '510', 'cross_midnight_session_enabled', 'true', 'timezone', 'Asia/Jakarta'),
  '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-11-01 07:00:00'
),
(
  2, 2, 'EMPLOYEE_CREATE', 'users', 5,
  NULL,
  JSON_OBJECT('employee_code', 'EMP-003', 'full_name', 'Ahmad Fauzi', 'role', 'EMPLOYEE'),
  '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-11-01 07:05:00'
);

