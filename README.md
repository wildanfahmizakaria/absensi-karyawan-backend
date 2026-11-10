# Backend REST API - Sistem Absensi Karyawan CV Mandala Mahardika

Sistem REST API absensi karyawan berbasis **Node.js + Express.js** yang dirancang mobile-first/PWA, mengacu pada spesifikasi dokumen resmi:
- [`docs/PRD.md`](./docs/PRD.md)
- [`docs/USER-FLOW.md`](./docs/USER-FLOW.md)
- [`docs/DATABASE-SPEC.md`](./docs/DATABASE-SPEC.md)
- [`docs/API-spec.md`](./docs/API-spec.md)
- [`docs/BUSINESS-RULES.md`](./docs/BUSINESS-RULES.md)

---

## 🚀 Fitur Utama & Kepatuhan Aturan Bisnis

1. **Waktu Transaksi Resmi Backend:** Seluruh timestamp absensi (`check_in_at`, `check_out_at`) ditetapkan oleh jam server (bukan waktu lokal perangkat klien).
2. **Evaluasi Batas Durasi Minimal (510 Menit):**
   - Menggunakan konfigurasi dinamis `minimum_work_duration_minutes` bernilai awal **510 menit (8 jam 30 menit)**.
   - **Waktu istirahat tidak dikurangi** dari perhitungan total durasi kerja.
   - Status durasi otomatis dihitung:
     - `IN_PROGRESS`: Masih bertugas (belum check-out).
     - `MEETS_MINIMUM`: Total durasi $\ge$ 510 menit.
     - `BELOW_MINIMUM`: Total durasi < 510 menit.
   - Check-out sebelum 510 menit **tetap diizinkan** (tidak diblokir), dan status otomatis ditandai `BELOW_MINIMUM`.
3. **Sesi Lintas Tengah Malam (*Cross-Midnight Session*):**
   - Check-in sebelum tengah malam (misal shift malam pukul 21:00) tetap aktif dan berjalan normal setelah pergantian hari.
   - Tidak ada penutupan sesi otomatis ataupun reset saat tengah malam tiba.
4. **Proteksi Sesi Ganda (*Atomic Constraint*):**
   - Karyawan dicegah membuka lebih dari 1 sesi aktif secara bersamaan, baik melalui validasi logika controller maupun constraint level basis data (`active_user_session_id` UNIQUE).
5. **Perekaman Lokasi GPS Tanpa Geofence:**
   - Koordinat latitude, longitude, dan estimasi akurasi GPS direkam sebagai jejak audit kehadiran tanpa penolakan radius jarak.
6. **Swafoto Kamera Live (*Live Selfie Upload*):**
   - Wajib melampirkan foto swafoto langsung dari kamera saat check-in, disimpan di `uploads/selfies/`.
7. **Jejak Audit Administratif (*Audit Logs*):**
   - Semua perubahan sensitif (manajemen karyawan, perubahan pengaturan, dan verifikasi permohonan koreksi) dicatat dalam tabel `audit_logs`.
8. **Ekspor Laporan Fleksibel:**
   - Mendukung format **CSV** (dengan UTF-8 BOM untuk kompatibilitas Microsoft Excel Windows) dan format **PDF** resmi.

---

## 📁 Struktur Direktori

```
backend/
├── database/
│   └── database.sql               # Skema DDL dan data awal MySQL
├── collection.json                # Postman Collection v2.1.0 lengkap
├── scripts/
│   ├── migrate.js                 # Skrip eksekusi migrasi & seed database
│   └── test-api.js                # Skrip pengujian otomatis 15 endpoint
├── src/
│   ├── config/
│   │   ├── constants.js           # Kode error, peran (roles), status durasi
│   │   ├── database.js            # MySQL2 connection pool
│   │   └── upload.js              # Multer storage untuk foto selfie
│   ├── controllers/
│   │   ├── authController.js      # Login, logout, profile
│   │   ├── attendanceController.js# Check-in, check-out, today, riwayat
│   │   ├── dashboardController.js # Dashboard KPI admin & karyawan
│   │   ├── employeeController.js  # CRUD pengelolaan karyawan
│   │   ├── reportController.js    # Laporan & ekspor CSV/PDF
│   │   ├── settingsController.js  # Konfigurasi sistem & jadwal kerja
│   │   ├── correctionController.js# Permohonan & peninjauan koreksi
│   │   └── auditLogController.js  # Log audit tindakan superadmin
│   ├── middleware/
│   │   ├── auth.js                # Verifikasi JWT & proteksi peran
│   │   ├── errorHandler.js        # Global error handler sesuai spesifikasi
│   │   └── rateLimiter.js         # Proteksi brute-force & pembatas laju request
│   ├── routes/
│   │   ├── index.js               # Router sentral (/api/v1)
│   │   ├── authRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── adminEmployeeRoutes.js
│   │   ├── adminReportRoutes.js
│   │   ├── adminSettingsRoutes.js
│   │   └── adminAuditRoutes.js
│   ├── utils/
│   │   ├── response.js            # Standard JSON response { data, meta, error }
│   │   ├── duration.js            # Logika perhitungan durasi kerja
│   │   ├── settings.js            # Caching & getter pengaturan sistem
│   │   ├── audit.js               # Perekam audit_logs
│   │   └── pdfExport.js           # Generator file PDF laporan
│   └── app.js                     # Inisialisasi Express & middleware
├── server.js                      # Entry point server HTTP
├── .env.example                   # Template variabel lingkungan
├── .env                           # Konfigurasi runtime lokal
└── package.json
```

---

## 🛠️ Panduan Instalasi & Menjalankan

### 1. Prasyarat
- **Node.js** v18+ (direkomendasikan v20 / v24)
- **MySQL / MariaDB** (dapat menggunakan Laragon / XAMPP)

### 2. Konfigurasi Lingkungan (`.env`)
Salin file `.env.example` ke `.env` dan sesuaikan koneksi database Anda:
```env
PORT=5000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=absensi_karyawan

JWT_SECRET=mandala_attendance_super_secret_jwt_key_2026_change_in_production
JWT_EXPIRES_IN=24h
UPLOAD_DIR=uploads/selfies
MAX_FILE_SIZE_MB=5
DEFAULT_TIMEZONE=Asia/Jakarta
```

### 3. Migrasi Database & Seeding
Jalankan perintah berikut untuk mengimpor skema tabel dan data awal:
```bash
npm run migrate
```

### 4. Menjalankan Server
```bash
# Mode Produksi
npm start

# Mode Pengembangan (Auto-reload dengan file watcher bawaan Node.js)
npm run dev
```
Server akan aktif di `http://localhost:5000/api/v1`.

### 5. Menjalankan Pengujian API Otomatis
```bash
npm run test:api
```

### 6. Pengujian dengan Postman / Insomnia
Impor file [`collection.json`](./collection.json) ke aplikasi Postman atau Insomnia.
- Variabel `base_url` sudah otomatis disetel ke `http://localhost:5000/api/v1`.
- Skrip pengujian otomatis pada endpoint **Login** akan secara instan menyimpan JWT access token ke variabel koleksi `{{token}}`, sehingga semua endpoint terproteksi dapat langsung diuji tanpa perlu menyalin token secara manual.

### 7. Deployment ke Railway
Panduan lengkap langkah demi langkah untuk men-deploy Service Database MySQL dan Service API Node.js dalam 1 project di Railway tersedia pada dokumen:
👉 [`docs/DEPLOYMENT-RAILWAY.md`](./docs/DEPLOYMENT-RAILWAY.md)

---

## 🔑 Kredensial Pengguna Sampel

Semua akun sampel menggunakan kata sandi default: **`password123`**

| Peran | Nama | Email | Kode Karyawan |
|---|---|---|---|
| **SUPERADMIN** | Superadmin Mandala | `superadmin@mandalamahardika.com` | `SA-001` |
| **ADMIN** | Admin Operasional | `admin@mandalamahardika.com` | `ADM-001` |
| **EMPLOYEE** | Budi Santoso | `budi.santoso@mandalamahardika.com` | `EMP-001` |
| **EMPLOYEE** | Siti Rahmawati | `siti.rahmawati@mandalamahardika.com` | `EMP-002` |
| **EMPLOYEE** | Ahmad Fauzi | `ahmad.fauzi@mandalamahardika.com` | `EMP-003` |

---

## 📑 Daftar Endpoint API (`/api/v1`)

### Format Respons Standar
```json
// Sukses (HTTP 200/201)
{
  "data": { ... },
  "meta": { ... },
  "error": null
}

// Error (HTTP 4xx/5xx)
{
  "data": null,
  "error": {
    "code": "LOCATION_REQUIRED",
    "message": "Koordinat lokasi GPS (latitude dan longitude) wajib disertakan saat absensi."
  }
}
```

### 1. Autentikasi (`/auth`)
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| `POST` | `/auth/login` | Publik | Masuk dengan email & password |
| `POST` | `/auth/logout` | Login | Keluar dari sesi |
| `GET` | `/auth/me` | Login | Mendapatkan profil aktif pengguna |

### 2. Absensi (`/attendance`)
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| `GET` | `/attendance/today` | Karyawan | Cek status absensi hari ini / sesi aktif |
| `POST` | `/attendance/check-in` | Karyawan | Absen masuk (multipart: `photo`, `latitude`, `longitude`, `accuracy_m`) |
| `POST` | `/attendance/check-out` | Karyawan | Absen pulang (multipart: `latitude`, `longitude`, `photo` opsional) |
| `GET` | `/attendance` | Karyawan/Admin | Riwayat absensi (filter tanggal, status, pagination) |
| `GET` | `/attendance/:id` | Karyawan/Admin | Detail data transaksi absensi |
| `GET` | `/attendance/corrections` | Karyawan/Admin | Daftar permohonan koreksi absensi |
| `POST` | `/attendance/corrections` | Karyawan | Mengajukan permohonan koreksi absensi |
| `PATCH` | `/attendance/corrections/:id/review` | Admin | Menyetujui/menolak permohonan koreksi |

### 3. Dashboard (`/dashboard`)
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| `GET` | `/dashboard/employee` | Karyawan | Ringkasan absensi pribadi bulan ini & sesi aktif |
| `GET` | `/dashboard/admin` | Admin | KPI operasional kehadiran karyawan hari ini |

### 4. Manajemen Karyawan (`/admin/employees`)
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| `GET` | `/admin/employees` | Admin | Daftar karyawan (search, filter, pagination) |
| `POST` | `/admin/employees` | Admin | Tambah karyawan baru |
| `GET` | `/admin/employees/:id` | Admin | Detail data karyawan |
| `PATCH` | `/admin/employees/:id` | Admin | Perbarui nama, email, role, status, atau password |
| `DELETE` | `/admin/employees/:id` | Admin | Nonaktifkan akun karyawan |

### 5. Laporan & Ekspor (`/admin/reports`)
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| `GET` | `/admin/reports/attendance` | Admin | Rekap absensi terfilter (JSON) |
| `GET` | `/admin/reports/attendance/export?format=csv` | Admin | Unduh laporan format CSV kompatibel Excel |
| `GET` | `/admin/reports/attendance/export?format=pdf` | Admin | Unduh laporan format PDF |

### 6. Pengaturan Sistem (`/admin/settings`)
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| `GET` | `/admin/settings/organization` | Superadmin | Profil organisasi & zona waktu |
| `PATCH` | `/admin/settings/organization` | Superadmin | Ubah profil organisasi |
| `GET` | `/admin/settings/work-schedule` | Superadmin | Konfigurasi durasi minimal kerja (510 mnt, dll) |
| `PATCH` | `/admin/settings/work-schedule` | Superadmin | Ubah konfigurasi aturan jam kerja |

### 7. Jejak Audit (`/admin/audit-logs`)
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| `GET` | `/admin/audit-logs` | Superadmin | Daftar log audit aktivitas sensitif admin |

