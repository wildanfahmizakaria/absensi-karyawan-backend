# DATABASE-SPEC.md
## Sistem Absensi Karyawan Berbasis Website (Mobile-First/PWA)
**Organisasi:** CV Mandala Mahardika  
**Versi:** 0.4 — Keputusan durasi, check-out, dan lintas tengah malam  
**Status:** Draft SOT untuk ditinjau; menunggu persetujuan final pengguna.

## 1. Prinsip rancangan
- Timestamp absensi resmi ditetapkan backend.
- Durasi minimum dikonfigurasi, bukan di-hardcode di banyak tempat.
- Nilai awal minimum adalah 510 menit.
- Durasi tidak mengurangi waktu istirahat.
- Sesi tetap aktif melewati tengah malam sampai check-out dilakukan.
- GPS direkam tanpa geofence.
- File selfie disimpan pada penyimpanan aman; database menyimpan referensi file.
- Rancangan konseptual ini perlu diselaraskan dengan DBMS dan API final.

## 2. Tabel `users`
| Kolom | Tipe konseptual | Aturan |
|---|---|---|
| `id` | UUID/BIGINT | Primary key |
| `employee_code` | VARCHAR(50) | unik |
| `full_name` | VARCHAR(150) | wajib |
| `email` | VARCHAR(255) | unik jika digunakan untuk login |
| `password_hash` | VARCHAR(255) | hash password, bukan teks biasa |
| `role` | ENUM/VARCHAR | `EMPLOYEE`, `ADMIN`, `SUPERADMIN` |
| `is_active` | BOOLEAN | default true |
| `created_at` | TIMESTAMP | waktu server |
| `updated_at` | TIMESTAMP | waktu server |

## 3. Tabel `attendance_sessions`
Satu baris mewakili satu sesi absensi dari check-in sampai check-out. Pergantian tanggal tidak membuat baris/sesi baru secara otomatis.

| Kolom | Tipe konseptual | Aturan |
|---|---|---|
| `id` | UUID/BIGINT | Primary key |
| `user_id` | UUID/BIGINT | FK ke `users.id`, wajib |
| `check_in_at` | TIMESTAMP | waktu server, wajib setelah check-in |
| `check_in_latitude` | DECIMAL(10,7) | nullable jika lokasi tidak tersedia |
| `check_in_longitude` | DECIMAL(10,7) | nullable jika lokasi tidak tersedia |
| `check_in_accuracy_m` | DECIMAL(8,2) | akurasi GPS jika tersedia |
| `check_in_selfie_path` | VARCHAR(500) | referensi selfie check-in |
| `check_out_at` | TIMESTAMP | null selama sesi terbuka, diisi saat check-out |
| `check_out_latitude` | DECIMAL(10,7) | nullable jika lokasi tidak tersedia |
| `check_out_longitude` | DECIMAL(10,7) | nullable jika lokasi tidak tersedia |
| `check_out_accuracy_m` | DECIMAL(8,2) | akurasi GPS jika tersedia |
| `check_out_selfie_path` | VARCHAR(500) | opsional sampai kebijakan selfie check-out ditetapkan |
| `elapsed_minutes` | INTEGER | dihitung backend setelah check-out; selisih penuh tanpa pengurangan istirahat |
| `duration_status` | ENUM/VARCHAR | `IN_PROGRESS`, `MEETS_MINIMUM`, `BELOW_MINIMUM` |
| `notes` | TEXT | catatan opsional |
| `created_at` | TIMESTAMP | waktu server |
| `updated_at` | TIMESTAMP | waktu server |

### Kendala dan indeks
- Foreign key `attendance_sessions.user_id` → `users.id`.
- Indeks gabungan `(user_id, check_in_at)` dan indeks tambahan sesuai kebutuhan laporan.
- Cegah lebih dari satu sesi terbuka per pengguna melalui transaksi/constraint yang didukung DBMS.
- `elapsed_minutes` dihitung server, bukan dipercaya dari frontend.
- Tidak diperlukan kolom geofence karena absensi tidak ditolak berdasarkan radius.
- Jangan gunakan tanggal kalender sebagai pemicu untuk menutup sesi terbuka.

## 4. Tabel `system_settings`
| Kolom | Tipe konseptual | Aturan |
|---|---|---|
| `id` | UUID/BIGINT | Primary key |
| `setting_key` | VARCHAR(100) | unik |
| `setting_value` | VARCHAR(500)/JSON | nilai konfigurasi |
| `description` | TEXT | penjelasan |
| `updated_by` | UUID/BIGINT | FK opsional ke `users.id` |
| `updated_at` | TIMESTAMP | waktu server |

Nilai awal:
| `setting_key` | Nilai | Keterangan |
|---|---|---|
| `minimum_work_duration_minutes` | `510` | 8 jam 30 menit |
| `fixed_work_schedule_enabled` | `false` | tidak ada jam universal |
| `break_time_deducted` | `false` | istirahat tidak dikurangi |
| `allow_checkout_below_minimum` | `true` | check-out tetap diizinkan |
| `cross_midnight_session_enabled` | `true` | sesi tetap berjalan lintas tengah malam |
| `gps_recording_enabled` | `true` | catat GPS jika tersedia/diizinkan |
| `gps_geofence_enabled` | `false` | tidak ada penolakan radius |
| `selfie_camera_only` | `true` | kamera langsung |
| `timezone` | `Asia/Jakarta` | usulan; perlu konfirmasi |

## 5. Tabel opsional `attendance_corrections`
Direkomendasikan untuk permintaan koreksi dan jejak audit.

| Kolom | Tipe konseptual | Aturan |
|---|---|---|
| `id` | UUID/BIGINT | Primary key |
| `attendance_session_id` | UUID/BIGINT | FK ke `attendance_sessions.id` |
| `requested_by` | UUID/BIGINT | FK ke `users.id` |
| `reviewed_by` | UUID/BIGINT | FK ke `users.id`, nullable sebelum ditinjau |
| `reason` | TEXT | alasan wajib |
| `proposed_check_in_at` | TIMESTAMP | nullable |
| `proposed_check_out_at` | TIMESTAMP | nullable |
| `status` | ENUM/VARCHAR | `PENDING`, `APPROVED`, `REJECTED` |
| `reviewed_at` | TIMESTAMP | nullable |
| `created_at` | TIMESTAMP | waktu server |

Koreksi yang disetujui harus meninggalkan jejak audit.

## 6. Perhitungan durasi dan status
Rumus konseptual:
`elapsed_minutes = floor((check_out_at - check_in_at) dalam detik / 60)`

- Jika `check_out_at` null: `duration_status = IN_PROGRESS`.
- Jika `elapsed_minutes >= minimum_work_duration_minutes` (nilai awal 510): `duration_status = MEETS_MINIMUM`.
- Jika `elapsed_minutes < minimum_work_duration_minutes`: `duration_status = BELOW_MINIMUM`.
- Istirahat tidak dikurangi dari rumus durasi.
- Check-out di bawah 510 menit tidak ditolak; sesi ditandai `BELOW_MINIMUM`.
- Backend adalah sumber perhitungan resmi; frontend hanya menampilkan hasil.

## 7. Aturan sesi lintas tengah malam
- Sesi dengan check-in sebelum tengah malam tetap terbuka setelah pergantian tanggal.
- Pergantian tanggal tidak menutup sesi, tidak mengubah timestamp, dan tidak membuat sesi baru.
- Durasi terus bertambah sampai check-out dilakukan.
- Rekap harian dapat mengelompokkan sesi berdasarkan tanggal check-in sebagai usulan awal; kebijakan tampilan laporan per tanggal masih perlu dikonfirmasi.
- Backend harus mencegah pembuatan sesi kedua saat sesi pertama masih terbuka.

## 8. Catatan integrasi API
- Check-in: backend membuat timestamp dan menyimpan referensi selfie serta koordinat/akurasi GPS yang tersedia.
- Check-out: backend membuat timestamp, menghitung durasi, dan menentukan status.
- Frontend tidak boleh menjadi sumber waktu atau durasi resmi.
- Validasi jenis/ukuran selfie dan perilaku saat izin kamera/GPS ditolak harus ditetapkan pada API-spec.
- Endpoint laporan harus menerapkan otorisasi sesuai peran.

## 9. Keputusan yang perlu dikonfirmasi
1. Zona waktu resmi sistem (usulan `Asia/Jakarta`).
2. Apakah selfie check-out wajib?
3. Apakah absensi dapat disimpan jika kamera/GPS tidak tersedia atau izin ditolak?
4. Penanganan sesi lupa check-out dan alur koreksi.
5. Pengelompokan sesi lintas tengah malam pada laporan harian.
6. DBMS final, format ID, retensi data, dan kebijakan akses foto/GPS.

## 10. Kriteria penerimaan
- Minimum durasi tersimpan sebagai 510 menit.
- Durasi dihitung backend dari timestamp server, tanpa mengurangi istirahat.
- Check-out di bawah 510 menit diizinkan dan berstatus `BELOW_MINIMUM`.
- Sesi terbuka tidak ditutup otomatis saat tengah malam.
- GPS direkam tanpa geofence/radius penolakan.
- Password disimpan sebagai hash; selfie dirujuk melalui penyimpanan aman.
- Skema mendukung laporan CSV dan hak akses berbasis peran.
