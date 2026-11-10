# DOKUMENTASI INTEGRASI REST API (API-INTEGRATION.md)
## Sistem Absensi Karyawan Berbasis Website (Mobile-First / PWA)
**Organisasi:** CV Mandala Mahardika  
**Versi API:** 1.0.0  
**Base URL:** `https://absensi-karyawan-backend-production.up.railway.app/api/v1`  
**Format Data:** `application/json` (Kecuali unggahan swafoto kamera live: `multipart/form-data`)

---

## 1. Konvensi & Standar Respons API

Seluruh respons server dibungkus dalam struktur JSON terpadu sesuai dokumen spesifikasi:

### A. Struktur Respons Sukses (HTTP 200 / 201)
```json
{
  "data": { ... },
  "meta": { ... },
  "error": null
}
```

### B. Struktur Respons Gagal (HTTP 4xx / 5xx)
```json
{
  "data": null,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Pesan deskriptif berbahasa Indonesia."
  }
}
```

### C. Daftar Kode Error Standar
| Kode Error | Keterangan |
|---|---|
| `UNAUTHENTICATED` | Token JWT tidak ada, kedaluwarsa, atau kredensial login salah. |
| `FORBIDDEN` | Pengguna tidak memiliki hak akses (role tidak mencukupi) atau akun nonaktif. |
| `VALIDATION_ERROR` | Format data body request atau tipe file tidak valid. |
| `CAMERA_REQUIRED` | Foto swafoto kamera live tidak disertakan saat check-in. |
| `LOCATION_REQUIRED` | Koordinat GPS (latitude & longitude) tidak dikirimkan. |
| `ALREADY_CHECKED_IN` | Karyawan masih memiliki sesi absensi yang aktif (belum check-out). |
| `NOT_CHECKED_IN` | Tidak ditemukan sesi absensi aktif saat mencoba check-out. |
| `DUPLICATE_ENTRY` | Nilai unik sudah digunakan (misal: kode karyawan atau email). |
| `NOT_FOUND` | Data entitas yang dicari tidak ditemukan. |
| `RATE_LIMITED` | Terlalu banyak permintaan dalam kurun waktu singkat. |
| `EXPORT_FAILED` | Kegagalan saat memproses file CSV atau PDF. |
| `INTERNAL_ERROR` | Kesalahan internal pada server basis data. |

---

## 2. Header Autentikasi (JWT Bearer Token)

Sebagian besar endpoint privat mewajibkan penyertaan header berikut:
```http
Authorization: Bearer <TOKEN_JWT_DARI_LOGIN>
```

---

## 3. Katalog Endpoint Lengkap

```
├── 0. Informasi & Health Check
├── 1. Autentikasi (Auth)
├── 2. Dashboard
├── 3. Transaksi Absensi (Attendance)
├── 4. Permohonan Koreksi Absensi (Corrections)
├── 5. Manajemen Data Karyawan (Admin CRUD)
├── 6. Laporan & Ekspor Data (Reports)
├── 7. Pengaturan Sistem (Superadmin Settings)
└── 8. Rekam Jejak Audit (Superadmin Audit Logs)
```

---

### 0. Informasi & Health Check

#### 0.1 Root Info
- **Method / URL:** `GET /`
- **Akses:** Publik
- **Headers:** Tidak diperlukan

##### Respons Sukses (HTTP 200)
```json
{
  "service": "REST API Sistem Absensi CV Mandala Mahardika",
  "status": "Online",
  "version": "1.0.0",
  "base_api": "/api/v1",
  "health_check": "/api/v1/health",
  "endpoints": {
    "auth": "/api/v1/auth/login",
    "attendance": "/api/v1/attendance",
    "dashboard": "/api/v1/dashboard",
    "admin": "/api/v1/admin"
  }
}
```

#### 0.2 Health Check
- **Method / URL:** `GET /api/v1/health`
- **Akses:** Publik
- **Headers:** Tidak diperlukan

##### Respons Sukses (HTTP 200)
```json
{
  "status": "OK",
  "service": "Mandala Mahardika Attendance API",
  "version": "1.0.0",
  "timestamp": "2026-11-10T16:00:00.000Z"
}
```

---

### 1. Autentikasi (`/auth`)

#### 1.1 Login Pengguna
- **Method / URL:** `POST /api/v1/auth/login`
- **Akses:** Publik
- **Headers:** `Content-Type: application/json`

##### Request Body
```json
{
  "email": "superadmin@mandalamahardika.com",
  "password": "password123"
}
```

##### Respons Sukses (HTTP 200)
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": "24h",
    "user": {
      "id": 1,
      "employee_code": "SA-001",
      "full_name": "Superadmin Mandala",
      "email": "superadmin@mandalamahardika.com",
      "role": "SUPERADMIN",
      "is_active": true
    }
  },
  "meta": {},
  "error": null
}
```

##### Respons Gagal (HTTP 401 - Kredensial Salah)
```json
{
  "data": null,
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Email atau kata sandi yang Anda masukkan salah."
  }
}
```

##### Respons Gagal (HTTP 400 - Validasi)
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email dan kata sandi wajib diisi."
  }
}
```

---

#### 1.2 Profil Pengguna Aktif (`/me`)
- **Method / URL:** `GET /api/v1/auth/me`
- **Akses:** Login (Semua Peran)
- **Headers:** `Authorization: Bearer <TOKEN>`

##### Respons Sukses (HTTP 200)
```json
{
  "data": {
    "user": {
      "id": 3,
      "employee_code": "EMP-001",
      "full_name": "Budi Santoso",
      "email": "budi.santoso@mandalamahardika.com",
      "role": "EMPLOYEE",
      "is_active": true
    }
  },
  "meta": {},
  "error": null
}
```

---

#### 1.3 Logout
- **Method / URL:** `POST /api/v1/auth/logout`
- **Akses:** Login (Semua Peran)
- **Headers:** `Authorization: Bearer <TOKEN>`

##### Respons Sukses (HTTP 200)
```json
{
  "data": {
    "message": "Berhasil keluar dari sistem absensi."
  },
  "meta": {},
  "error": null
}
```

---

### 2. Dashboard (`/dashboard`)

#### 2.1 Dashboard Karyawan
- **Method / URL:** `GET /api/v1/dashboard/employee`
- **Akses:** Karyawan (`EMPLOYEE`)
- **Headers:** `Authorization: Bearer <TOKEN>`

##### Respons Sukses (HTTP 200)
```json
{
  "data": {
    "active_session": {
      "id": 4,
      "user_id": 3,
      "check_in_at": "2026-11-10 08:00:00",
      "check_out_at": null,
      "running_minutes": 270,
      "running_human": "4 jam 30 menit"
    },
    "monthly_summary": {
      "total_sessions": 22,
      "total_hours": "187.0",
      "total_minutes": 11220,
      "meets_minimum_count": 21,
      "below_minimum_count": 1
    },
    "recent_history": [
      {
        "id": 3,
        "check_in_at": "2026-11-09 08:00:00",
        "check_out_at": "2026-11-09 17:00:00",
        "elapsed_minutes": 540,
        "duration_status": "MEETS_MINIMUM",
        "notes": "Tugas harian selesai"
      }
    ]
  },
  "meta": {},
  "error": null
}
```

---

#### 2.2 Dashboard Admin (KPI Operasional)
- **Method / URL:** `GET /api/v1/dashboard/admin`
- **Akses:** `ADMIN`, `SUPERADMIN`
- **Headers:** `Authorization: Bearer <TOKEN>`

##### Respons Sukses (HTTP 200)
```json
{
  "data": {
    "kpi": {
      "total_active_employees": 25,
      "checked_in_today": 24,
      "currently_working": 18,
      "completed_today": 6,
      "today_meets_minimum": 5,
      "today_below_minimum": 1
    },
    "month_to_date": {
      "total_completed_sessions": 480,
      "total_hours": "4128.5",
      "meets_minimum_count": 465,
      "below_minimum_count": 15
    },
    "recent_activity": [
      {
        "id": 88,
        "user_id": 5,
        "check_in_at": "2026-11-10 08:15:00",
        "check_out_at": null,
        "duration_status": "IN_PROGRESS",
        "employee_code": "EMP-003",
        "full_name": "Ahmad Fauzi"
      }
    ]
  },
  "meta": {},
  "error": null
}
```

---

### 3. Transaksi Absensi (`/attendance`)

#### 3.1 Cek Status Absensi Hari Ini (`/today`)
- **Method / URL:** `GET /api/v1/attendance/today`
- **Akses:** Karyawan (`EMPLOYEE`)
- **Headers:** `Authorization: Bearer <TOKEN>`

##### Respons Sukses (HTTP 200)
```json
{
  "data": {
    "has_active_session": true,
    "active_session": {
      "id": 4,
      "user_id": 3,
      "check_in_at": "2026-11-10 08:00:00",
      "check_in_latitude": "-6.2087650",
      "check_in_longitude": "106.8456000",
      "check_in_accuracy_m": "11.00",
      "check_in_selfie_path": "uploads/selfies/checkin_u3_1794324500000.jpg",
      "check_out_at": null,
      "current_running_minutes": 270,
      "current_running_human": "4 jam 30 menit"
    },
    "today_history": []
  },
  "meta": {},
  "error": null
}
```

---

#### 3.2 Absen Masuk (Check-in)
- **Method / URL:** `POST /api/v1/attendance/check-in`
- **Akses:** Karyawan (`EMPLOYEE`)
- **Headers:**  
  `Authorization: Bearer <TOKEN>`  
  `Content-Type: multipart/form-data`

##### Request Body (Form-Data)
| Field Key | Type | Keterangan |
|---|---|---|
| `photo` | `File` | File gambar swafoto kamera live (JPEG/PNG, max 5MB). **Wajib**. |
| `latitude` | `Text` | Garis lintang GPS, misal: `-6.2087634`. **Wajib**. |
| `longitude` | `Text` | Garis bujur GPS, misal: `106.8455990`. **Wajib**. |
| `accuracy_m` | `Text` | Estimasi akurasi GPS dalam meter, misal: `12.50`. *Opsional*. |
| `notes` | `Text` | Catatan opsional dari karyawan. *Opsional*. |

##### Respons Sukses (HTTP 201 Created)
```json
{
  "data": {
    "message": "Absen masuk berhasil dicatat.",
    "session": {
      "id": 12,
      "user_id": 3,
      "check_in_at": "2026-11-10 08:00:15",
      "check_in_latitude": "-6.2087634",
      "check_in_longitude": "106.8455990",
      "check_in_accuracy_m": "12.50",
      "check_in_selfie_path": "uploads/selfies/checkin_u3_1794324510000.jpg",
      "check_out_at": null,
      "elapsed_minutes": null,
      "duration_status": "IN_PROGRESS",
      "notes": "Mulai bertugas shift pagi",
      "created_at": "2026-11-10 08:00:15",
      "updated_at": "2026-11-10 08:00:15"
    }
  },
  "meta": {},
  "error": null
}
```

##### Respons Gagal (HTTP 400 - Sesi Ganda / Sudah Check-in)
```json
{
  "data": null,
  "error": {
    "code": "ALREADY_CHECKED_IN",
    "message": "Anda masih memiliki sesi absensi aktif yang belum di-checkout. Silakan lakukan absen pulang terlebih dahulu."
  }
}
```

##### Respons Gagal (HTTP 400 - Foto Tidak Ada)
```json
{
  "data": null,
  "error": {
    "code": "CAMERA_REQUIRED",
    "message": "Foto swafoto kamera live wajib disertakan saat melakukan absen masuk."
  }
}
```

---

#### 3.3 Absen Pulang (Check-out)
- **Method / URL:** `POST /api/v1/attendance/check-out`
- **Akses:** Karyawan (`EMPLOYEE`)
- **Headers:**  
  `Authorization: Bearer <TOKEN>`  
  `Content-Type: multipart/form-data` atau `application/json`

##### Request Body
```json
{
  "latitude": "-6.2087610",
  "longitude": "106.8456102",
  "accuracy_m": "10.20",
  "notes": "Selesai menyelesaikan seluruh tugas shift"
}
```
*(Catatan: Bila mengirimkan file swafoto check-out, gunakan format `multipart/form-data` dengan key `photo`)*

##### Respons Sukses (HTTP 200 - Memenuhi Target $\ge$ 510 Menit)
```json
{
  "data": {
    "message": "Absen pulang berhasil. Total durasi kerja: 8 jam 45 menit (Memenuhi target 510 menit).",
    "session": {
      "id": 12,
      "user_id": 3,
      "check_in_at": "2026-11-10 08:00:00",
      "check_out_at": "2026-11-10 16:45:00",
      "elapsed_minutes": 525,
      "duration_status": "MEETS_MINIMUM",
      "notes": "Mulai bertugas shift pagi | Selesai menyelesaikan seluruh tugas shift"
    },
    "evaluation": {
      "elapsed_minutes": 525,
      "duration_human": "8 jam 45 menit",
      "minimum_target_minutes": 510,
      "duration_status": "MEETS_MINIMUM",
      "meets_minimum": true
    }
  },
  "meta": {},
  "error": null
}
```

##### Respons Sukses (HTTP 200 - Pulang Cepat / Kurang Dari 510 Menit)
> *Check-out tetap diizinkan dan tidak diblokir!*
```json
{
  "data": {
    "message": "Absen pulang berhasil. Total durasi kerja: 6 jam 30 menit (Kurang dari target minimal 510 menit).",
    "session": {
      "id": 13,
      "user_id": 4,
      "check_in_at": "2026-11-10 08:00:00",
      "check_out_at": "2026-11-10 14:30:00",
      "elapsed_minutes": 390,
      "duration_status": "BELOW_MINIMUM",
      "notes": "Izin pulang lebih awal urusan keluarga"
    },
    "evaluation": {
      "elapsed_minutes": 390,
      "duration_human": "6 jam 30 menit",
      "minimum_target_minutes": 510,
      "duration_status": "BELOW_MINIMUM",
      "meets_minimum": false
    }
  },
  "meta": {},
  "error": null
}
```

##### Respons Gagal (HTTP 400 - Belum Check-in)
```json
{
  "data": null,
  "error": {
    "code": "NOT_CHECKED_IN",
    "message": "Tidak ada sesi absensi aktif yang dapat di-checkout. Silakan lakukan absen masuk terlebih dahulu."
  }
}
```

---

#### 3.4 Riwayat Absensi
- **Method / URL:** `GET /api/v1/attendance`
- **Akses:** Login (Karyawan hanya melihat miliknya sendiri, Admin dapat melihat seluruhnya)
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Query Parameters:**
  - `page` (integer, default: 1)
  - `limit` (integer, default: 15)
  - `start_date` (string `YYYY-MM-DD`)
  - `end_date` (string `YYYY-MM-DD`)
  - `duration_status` (`IN_PROGRESS` | `MEETS_MINIMUM` | `BELOW_MINIMUM`)
  - `user_id` (integer, khusus Admin)

##### Respons Sukses (HTTP 200)
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 3,
      "check_in_at": "2026-11-04 08:00:00",
      "check_out_at": "2026-11-04 17:00:00",
      "elapsed_minutes": 540,
      "duration_status": "MEETS_MINIMUM",
      "notes": "Tugas reguler kantor selesai tepat waktu",
      "employee_code": "EMP-001",
      "full_name": "Budi Santoso",
      "email": "budi.santoso@mandalamahardika.com"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 15,
    "total": 1,
    "total_pages": 1
  },
  "error": null
}
```

---

#### 3.5 Detail Sesi Absensi
- **Method / URL:** `GET /api/v1/attendance/:id`
- **Akses:** Karyawan (hanya miliknya), Admin/Superadmin
- **Headers:** `Authorization: Bearer <TOKEN>`

##### Respons Sukses (HTTP 200)
```json
{
  "data": {
    "session": {
      "id": 1,
      "user_id": 3,
      "check_in_at": "2026-11-04 08:00:00",
      "check_in_latitude": "-6.2087634",
      "check_in_longitude": "106.8455990",
      "check_in_accuracy_m": "12.50",
      "check_in_selfie_path": "uploads/selfies/checkin_emp001_20261104_080000.jpg",
      "check_out_at": "2026-11-04 17:00:00",
      "check_out_latitude": "-6.2087610",
      "check_out_longitude": "106.8456102",
      "check_out_accuracy_m": "10.20",
      "check_out_selfie_path": "uploads/selfies/checkout_emp001_20261104_170000.jpg",
      "elapsed_minutes": 540,
      "duration_status": "MEETS_MINIMUM",
      "notes": "Tugas reguler kantor selesai tepat waktu",
      "employee_code": "EMP-001",
      "full_name": "Budi Santoso",
      "email": "budi.santoso@mandalamahardika.com"
    }
  },
  "meta": {},
  "error": null
}
```

---

### 4. Permohonan Koreksi Absensi (`/attendance/corrections`)

#### 4.1 Daftar Permohonan Koreksi
- **Method / URL:** `GET /api/v1/attendance/corrections`
- **Akses:** Karyawan (melihat miliknya), Admin (melihat semua)
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Query Parameters:** `page`, `limit`, `status` (`PENDING` | `APPROVED` | `REJECTED`)

##### Respons Sukses (HTTP 200)
```json
{
  "data": [
    {
      "id": 1,
      "attendance_session_id": 2,
      "requested_by": 4,
      "reviewed_by": null,
      "reason": "Pengajuan keterangan resmi kepulangan lebih awal",
      "proposed_check_in_at": null,
      "proposed_check_out_at": "2026-11-04 17:00:00",
      "status": "PENDING",
      "requester_code": "EMP-002",
      "requester_name": "Siti Rahmawati",
      "reviewer_name": null
    }
  ],
  "meta": {
    "page": 1,
    "limit": 15,
    "total": 1,
    "total_pages": 1
  },
  "error": null
}
```

---

#### 4.2 Mengajukan Koreksi (Karyawan)
- **Method / URL:** `POST /api/v1/attendance/corrections`
- **Akses:** Karyawan (`EMPLOYEE`)
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`

##### Request Body
```json
{
  "attendance_session_id": 2,
  "reason": "Kendala jaringan seluler di lokasi luar kantor saat check-out",
  "proposed_check_in_at": null,
  "proposed_check_out_at": "2026-11-04 17:00:00"
}
```

##### Respons Sukses (HTTP 201 Created)
```json
{
  "data": {
    "message": "Permohonan koreksi absensi berhasil diajukan dan menunggu peninjauan admin.",
    "correction": {
      "id": 2,
      "attendance_session_id": 2,
      "requested_by": 3,
      "reason": "Kendala jaringan seluler di lokasi luar kantor saat check-out",
      "status": "PENDING",
      "created_at": "2026-11-10 10:00:00"
    }
  },
  "meta": {},
  "error": null
}
```

---

#### 4.3 Meninjau Koreksi (Admin - Approve / Reject)
- **Method / URL:** `PATCH /api/v1/attendance/corrections/:id/review`
- **Akses:** `ADMIN`, `SUPERADMIN`
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`

##### Request Body
```json
{
  "status": "APPROVED",
  "note": "Disetujui berdasarkan konfirmasi tertulis atasan lapangan."
}
```

##### Respons Sukses (HTTP 200)
```json
{
  "data": {
    "message": "Permohonan koreksi absensi telah di-approved.",
    "correction": {
      "id": 2,
      "status": "APPROVED",
      "reviewed_by": 2,
      "reviewed_at": "2026-11-10 10:30:00"
    }
  },
  "meta": {},
  "error": null
}
```

---

### 5. Manajemen Karyawan (`/admin/employees`)

#### 5.1 Daftar Karyawan (Read - Index)
- **Method / URL:** `GET /api/v1/admin/employees`
- **Akses:** `ADMIN`, `SUPERADMIN`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Query Parameters:**
  - `page` (default: 1)
  - `limit` (default: 10)
  - `search` (pencarian nama, kode karyawan, email)
  - `role` (`EMPLOYEE` | `ADMIN` | `SUPERADMIN`)
  - `is_active` (`1` | `0`)

##### Respons Sukses (HTTP 200)
```json
{
  "data": [
    {
      "id": 3,
      "employee_code": "EMP-001",
      "full_name": "Budi Santoso",
      "email": "budi.santoso@mandalamahardika.com",
      "role": "EMPLOYEE",
      "is_active": 1,
      "created_at": "2026-11-01 07:00:00",
      "updated_at": "2026-11-01 07:00:00"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "total_pages": 1
  },
  "error": null
}
```

---

#### 5.2 Tambah Karyawan Baru (Create)
- **Method / URL:** `POST /api/v1/admin/employees`
- **Akses:** `ADMIN`, `SUPERADMIN`
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`

##### Request Body
```json
{
  "employee_code": "EMP-010",
  "full_name": "Dewi Lestari",
  "email": "dewi.lestari@mandalamahardika.com",
  "password": "password123",
  "role": "EMPLOYEE"
}
```

##### Respons Sukses (HTTP 201 Created)
```json
{
  "data": {
    "message": "Karyawan baru berhasil ditambahkan.",
    "employee": {
      "id": 6,
      "employee_code": "EMP-010",
      "full_name": "Dewi Lestari",
      "email": "dewi.lestari@mandalamahardika.com",
      "role": "EMPLOYEE",
      "is_active": 1,
      "created_at": "2026-11-10 11:00:00"
    }
  },
  "meta": {},
  "error": null
}
```

##### Respons Gagal (HTTP 409 - Duplikat Kode/Email)
```json
{
  "data": null,
  "error": {
    "code": "DUPLICATE_ENTRY",
    "message": "Kode karyawan sudah terdaftar dalam sistem. Gunakan nilai lain."
  }
}
```

---

#### 5.3 Detail Karyawan (Read - Detail)
- **Method / URL:** `GET /api/v1/admin/employees/:id`
- **Akses:** `ADMIN`, `SUPERADMIN`
- **Headers:** `Authorization: Bearer <TOKEN>`

##### Respons Sukses (HTTP 200)
```json
{
  "data": {
    "employee": {
      "id": 6,
      "employee_code": "EMP-010",
      "full_name": "Dewi Lestari",
      "email": "dewi.lestari@mandalamahardika.com",
      "role": "EMPLOYEE",
      "is_active": 1,
      "created_at": "2026-11-10 11:00:00",
      "updated_at": "2026-11-10 11:00:00"
    }
  },
  "meta": {},
  "error": null
}
```

---

#### 5.4 Update Data Karyawan (Update)
- **Method / URL:** `PATCH /api/v1/admin/employees/:id`
- **Akses:** `ADMIN`, `SUPERADMIN`
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`

##### Request Body
```json
{
  "full_name": "Dewi Lestari, S.T.",
  "email": "dewi.lestari@mandalamahardika.com",
  "role": "EMPLOYEE",
  "is_active": 1,
  "password": "newpassword123"
}
```
*(Seluruh field bersifat opsional, isi hanya yang ingin diubah)*

##### Respons Sukses (HTTP 200)
```json
{
  "data": {
    "message": "Data karyawan berhasil diperbarui.",
    "employee": {
      "id": 6,
      "employee_code": "EMP-010",
      "full_name": "Dewi Lestari, S.T.",
      "email": "dewi.lestari@mandalamahardika.com",
      "role": "EMPLOYEE",
      "is_active": 1,
      "updated_at": "2026-11-10 11:15:00"
    }
  },
  "meta": {},
  "error": null
}
```

---

#### 5.5 Nonaktifkan Akun Karyawan (Delete / Soft Deactivate)
- **Method / URL:** `DELETE /api/v1/admin/employees/:id`
- **Akses:** `ADMIN`, `SUPERADMIN`
- **Headers:** `Authorization: Bearer <TOKEN>`

##### Respons Sukses (HTTP 200)
```json
{
  "data": {
    "message": "Akun karyawan Dewi Lestari, S.T. (EMP-010) berhasil dinonaktifkan."
  },
  "meta": {},
  "error": null
}
```

---

### 6. Laporan & Ekspor (`/admin/reports`)

#### 6.1 Data Laporan Terfilter (JSON)
- **Method / URL:** `GET /api/v1/admin/reports/attendance`
- **Akses:** `ADMIN`, `SUPERADMIN`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Query Parameters:** `user_id`, `start_date`, `end_date`, `duration_status`

##### Respons Sukses (HTTP 200)
```json
{
  "data": {
    "summary": {
      "total_sessions": 30,
      "completed_sessions": 28,
      "in_progress_sessions": 2,
      "meets_minimum_count": 26,
      "below_minimum_count": 2,
      "total_hours": "238.0",
      "total_minutes": 14280
    },
    "records": [
      {
        "id": 1,
        "employee_code": "EMP-001",
        "full_name": "Budi Santoso",
        "check_in_at": "2026-11-04 08:00:00",
        "check_out_at": "2026-11-04 17:00:00",
        "elapsed_minutes": 540,
        "duration_status": "MEETS_MINIMUM",
        "notes": "Tugas reguler kantor selesai tepat waktu"
      }
    ]
  },
  "meta": {},
  "error": null
}
```

---

#### 6.2 Ekspor Laporan CSV (Excel Kompatibel)
- **Method / URL:** `GET /api/v1/admin/reports/attendance/export?format=csv`
- **Akses:** `ADMIN`, `SUPERADMIN`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Query Parameters:**
  - `format=csv`
  - `start_date=2026-11-01`
  - `end_date=2026-11-30`

##### Respons Header & Stream (HTTP 200)
- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="Laporan_Absensi_Mandala_2026-11-10T16-00-00.csv"`
- *File CSV otomatis diawali byte BOM UTF-8 (`\uFEFF`) agar langsung terbuka rapi di Microsoft Excel Windows tanpa masalah pemisah kolom.*

---

#### 6.3 Ekspor Laporan Format PDF
- **Method / URL:** `GET /api/v1/admin/reports/attendance/export?format=pdf`
- **Akses:** `ADMIN`, `SUPERADMIN`
- **Headers:** `Authorization: Bearer <TOKEN>`

##### Respons Header & Stream (HTTP 200)
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="Laporan_Absensi_Mandala_2026-11-10T16-00-00.pdf"`
- *Dokumen PDF resmi berorientasi landscape A4 lengkap dengan kop perusahaan CV Mandala Mahardika, box ringkasan KPI, dan tabel rekaman absensi.*

---

### 7. Pengaturan Sistem (`/admin/settings`)

#### 7.1 Profil Organisasi
- **Melihat:** `GET /api/v1/admin/settings/organization`
- **Mengubah:** `PATCH /api/v1/admin/settings/organization`
- **Akses:** Khusus `SUPERADMIN`
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`

##### Request Body (PATCH)
```json
{
  "company_name": "CV Mandala Mahardika",
  "timezone": "Asia/Jakarta",
  "report_export_format": "CSV"
}
```

##### Respons Sukses (HTTP 200)
```json
{
  "data": {
    "message": "Pengaturan organisasi berhasil diperbarui."
  },
  "meta": {},
  "error": null
}
```

---

#### 7.2 Konfigurasi Durasi Kerja Minimal & Aturan Absensi
- **Melihat:** `GET /api/v1/admin/settings/work-schedule`
- **Mengubah:** `PATCH /api/v1/admin/settings/work-schedule`
- **Akses:** Khusus `SUPERADMIN`
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`

##### Request Body (PATCH)
```json
{
  "minimum_work_duration_minutes": 510,
  "allow_checkout_below_minimum": true,
  "cross_midnight_session_enabled": true,
  "gps_recording_enabled": true,
  "gps_geofence_enabled": false,
  "selfie_camera_only": true
}
```

##### Respons Sukses (HTTP 200)
```json
{
  "data": {
    "message": "Konfigurasi aturan kerja berhasil diperbarui.",
    "settings": {
      "minimum_work_duration_minutes": 510,
      "allow_checkout_below_minimum": true,
      "cross_midnight_session_enabled": true,
      "gps_recording_enabled": true,
      "gps_geofence_enabled": false,
      "selfie_camera_only": true,
      "report_export_format": "CSV",
      "timezone": "Asia/Jakarta"
    }
  },
  "meta": {},
  "error": null
}
```

---

### 8. Rekam Jejak Audit (`/admin/audit-logs`)

#### 8.1 Daftar Audit Logs
- **Method / URL:** `GET /api/v1/admin/audit-logs`
- **Akses:** Khusus `SUPERADMIN`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Query Parameters:** `page`, `limit`, `action`, `entity_type`

##### Respons Sukses (HTTP 200)
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "action": "UPDATE_WORK_SCHEDULE_SETTINGS",
      "entity_type": "system_settings",
      "entity_id": null,
      "old_values": {
        "minimum_work_duration_minutes": 510
      },
      "new_values": {
        "minimum_work_duration_minutes": 510,
        "allow_checkout_below_minimum": true
      },
      "ip_address": "127.0.0.1",
      "user_agent": "Mozilla/5.0 ...",
      "created_at": "2026-11-10 11:30:00",
      "employee_code": "SA-001",
      "full_name": "Superadmin Mandala",
      "email": "superadmin@mandalamahardika.com",
      "role": "SUPERADMIN"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  },
  "error": null
}
```

---

## 4. Tips Integrasi Frontend (Mobile-First / PWA)

1. **Alur Swafoto Kamera Live (`getUserMedia`):**
   - Ambil stream langsung dari kamera HP karyawan (`navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })`).
   - Draw frame ke element `<canvas>`, lalu panggil `canvas.toBlob((blob) => { ... }, 'image/jpeg', 0.85)`.
   - Masukkan `blob` tersebut ke dalam objek `FormData` dengan key `photo`:
     ```javascript
     const formData = new FormData();
     formData.append('photo', blob, 'selfie.jpg');
     formData.append('latitude', position.coords.latitude);
     formData.append('longitude', position.coords.longitude);
     formData.append('accuracy_m', position.coords.accuracy);
     formData.append('notes', 'Mulai bertugas');

     await axios.post('/api/v1/attendance/check-in', formData, {
       headers: { 'Content-Type': 'multipart/form-data' }
     });
     ```
2. **Perekaman Lokasi GPS:**
   - Gunakan `navigator.geolocation.getCurrentPosition(...)` dengan opsi `enableHighAccuracy: true`.
   - Tidak perlu menghitung jarak/radius di frontend karena sistem backend tidak menolak absensi berdasarkan radius (tanpa geofence).
3. **Penyimpanan Token JWT:**
   - Simpan token di `localStorage` atau secure cookie setelah login sukses.
   - Pasang interceptor HTTP (misal pada Axios) untuk menyisipkan header `Authorization: Bearer <TOKEN>` pada setiap panggilan API.

