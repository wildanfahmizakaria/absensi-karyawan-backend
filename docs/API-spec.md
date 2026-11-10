# API Specification — Draft
**Status:** Revisi SOT v0.2 — direvisi berdasarkan arahan pemilik proyek (menunggu konfirmasi)

## 1. Konvensi
- Base path: `/api/v1`
- Transport: HTTPS; JSON untuk request/response kecuali unggahan multipart.
- Autentikasi: access token/session aman melalui mekanisme backend yang dipilih. Cookie sesi, bila digunakan, wajib `HttpOnly`, `Secure`, dan kebijakan `SameSite` yang sesuai.
- Waktu disimpan server dalam UTC dan ditampilkan sesuai zona waktu organisasi (WIB).
- Semua endpoint privat menerapkan otorisasi server-side dan validasi input.

## 2. Bentuk respons umum
```json
{
  "data": {},
  "meta": {},
  "error": null
}
```
Contoh error:
```json
{
  "data": null,
  "error": {
    "code": "LOCATION_REQUIRED",
    "message": "Koordinat lokasi GPS wajib disertakan saat melakukan absensi."
  }
}
```

## 3. Endpoint inti
| Method | Path | Peran | Keterangan |
|---|---|---|---|
| POST | `/auth/login` | Publik | Login pengguna |
| POST | `/auth/logout` | Login | Logout / pembatalan sesi |
| GET | `/auth/me` | Login | Profil dan peran aktif |
| GET | `/dashboard/employee` | Karyawan | Ringkasan absensi pribadi |
| GET | `/attendance/today` | Karyawan | Status absensi hari ini |
| POST | `/attendance/check-in` | Karyawan | Kirim absen masuk (multipart foto + koordinat GPS) |
| POST | `/attendance/check-out` | Karyawan | Kirim absen pulang (multipart foto + koordinat GPS) |
| GET | `/attendance` | Karyawan/Admin | Riwayat absensi (karyawan hanya miliknya) |
| GET | `/attendance/{id}` | Karyawan/Admin | Detail absensi (foto, waktu server, koordinat GPS) |
| GET | `/admin/dashboard` | Admin/Superadmin | KPI operasional kehadiran |
| GET/POST | `/admin/employees` | Admin/Superadmin | Daftar dan tambah karyawan |
| GET/PATCH | `/admin/employees/{id}` | Admin/Superadmin | Detail dan pembaruan karyawan |
| GET | `/admin/reports/attendance` | Admin/Superadmin | Data laporan terfilter |
| GET | `/admin/reports/attendance/export?format=pdf` | Admin/Superadmin | Unduh laporan format PDF |
| GET | `/admin/reports/attendance/export?format=csv` | Admin/Superadmin | Unduh laporan format CSV |
| GET/PATCH | `/admin/settings/organization` | Superadmin | Baca/ubah profil organisasi & kantor |
| GET/PATCH | `/admin/settings/work-schedule` | Superadmin | Baca/ubah jadwal kerja tetap (jam masuk/pulang, toleransi) |
| GET | `/admin/audit-logs` | Superadmin | Log audit tindakan administratif |

## 4. Payload absen
`POST /attendance/check-in` dan `/attendance/check-out` menggunakan `multipart/form-data`:
- `photo`: blob JPEG hasil capture dari stream kamera live.
- `latitude`: angka desimal koordinat GPS.
- `longitude`: angka desimal koordinat GPS.
- `accuracy_m`: estimasi akurasi lokasi dalam meter.
- `captured_at_client`: timestamp klien untuk diagnostik saja; bukan sumber waktu otoritatif.
- `idempotency_key`: nilai unik untuk mencegah pengiriman ganda.

Server menentukan waktu transaksi resmi menggunakan clock server. Identitas pengguna diambil dari sesi/token terotentikasi, bukan dari user ID yang dikirim pada body.

## 5. Validasi server
- Validasi sesi, peran, status akun aktif, dan kesesuaian jadwal kerja tetap.
- Validasi tipe, ukuran, dan dekode foto JPEG hasil stream live.
- Pastikan foto dan koordinat GPS tersedia; tolak jika izin lokasi ditolak atau data koordinat tidak valid.
- Simpan rekaman koordinat (latitude, longitude, accuracy_m) sebagai bukti audit lokasi kehadiran tanpa pembatasan radius geofence.
- Cegah duplikasi absensi masuk/pulang pada tanggal dan jadwal kerja yang sama menggunakan idempotency key.
- Terapkan rate limiting, audit log, dan proteksi CSRF.
- Simpan foto di storage privat; sediakan URL bertanda tangan berumur pendek bila perlu menampilkan foto di UI.

## 6. Kode error minimum
`UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_ERROR`, `CAMERA_REQUIRED`, `LOCATION_REQUIRED`, `LOW_LOCATION_ACCURACY`, `ALREADY_CHECKED_IN`, `NOT_CHECKED_IN`, `ALREADY_CHECKED_OUT`, `RATE_LIMITED`, `EXPORT_FAILED`, `INTERNAL_ERROR`.

## 7. Status keputusan SOT
- **Keputusan yang dikunci pemilik proyek:**
  - Perekaman GPS wajib tanpa batasan radius geofence.
  - Format ekspor laporan: CSV (kompatibel Excel) dan PDF.
  - Pengaturan jadwal kerja: Jadwal kerja tetap (fixed working hours).
- **Keputusan teknis lanjutan:**
  - Pilihan runtime backend & database (Node/Go/PHP/PostgreSQL/MySQL).
  - Skema rinci tabel database dan mekanisme token/sesi.
  - Provider object storage privat untuk foto absensi.
