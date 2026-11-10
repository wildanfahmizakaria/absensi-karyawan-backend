# BUSINESS-RULES.md
## Sistem Absensi Karyawan Berbasis Website (Mobile-First/PWA)
**Organisasi:** CV Mandala Mahardika  
**Versi:** 0.4 — Keputusan durasi, check-out, dan lintas tengah malam  
**Status:** Draft SOT untuk ditinjau; menunggu persetujuan final pengguna.

## 1. Tujuan dan cakupan
Dokumen ini menetapkan aturan bisnis sistem absensi berbasis website/PWA. Dokumen ini harus konsisten dengan PRD, UI-GUIDELINE, API-spec, USER-FLOW, IMPLEMENTATION_PLAN, dan DATABASE-SPEC.

## 2. Peran pengguna
- **Karyawan:** check-in/check-out, mengambil selfie langsung melalui kamera, merekam GPS, dan melihat riwayat absensinya sendiri.
- **Admin:** mengelola data karyawan dan memantau/merekap absensi sesuai kewenangan.
- **Superadmin:** mengelola konfigurasi sistem dan akses administratif tertinggi.
- Hak akses wajib divalidasi di backend/API.

## 3. Aturan check-in
1. Pengguna harus login.
2. Selfie diambil langsung melalui kamera perangkat; unggah foto dari galeri tidak diperbolehkan.
3. Sistem merekam koordinat GPS dan akurasi jika tersedia.
4. GPS hanya dicatat. Tidak ada geofence/radius yang menolak absensi berdasarkan jarak.
5. Waktu resmi absensi berasal dari server, bukan jam perangkat.
6. Sistem mencegah sesi absensi terbuka ganda untuk karyawan yang sama.
7. Sesi yang melewati tengah malam tetap terbuka dan berjalan seperti biasa sampai karyawan melakukan check-out. Pergantian tanggal tidak otomatis menutup atau membuat sesi baru.

## 4. Aturan check-out dan durasi kerja
1. Check-out menutup sesi absensi yang sedang terbuka. Waktu check-out ditentukan server.
2. Tidak ada jam masuk atau jam pulang tetap yang berlaku universal; karyawan dapat check-in pada jam berapa pun.
3. Durasi minimum yang ditargetkan adalah **8 jam 30 menit (510 menit) per sesi absensi**.
4. **Waktu istirahat tidak dikurangi dari durasi.** Durasi dihitung sebagai selisih waktu check-in dan check-out:
   `durasi_berlalu = waktu_check_out - waktu_check_in`.
5. Status sesi:
   - `SEDANG_BERTUGAS`: check-out belum tercatat.
   - `MEMENUHI_DURASI`: durasi >= 510 menit.
   - `KURANG_DURASI`: durasi < 510 menit.
6. Check-out sebelum 510 menit **tetap diizinkan**. Setelah check-out, sesi diberi status `KURANG_DURASI`; sistem tidak memblokir check-out karena durasi belum memenuhi target.
7. Durasi resmi dihitung dari timestamp server. Sistem tidak boleh memanipulasi timestamp agar terlihat memenuhi target.
8. Sesi yang melewati tengah malam tetap menggunakan check-in awal dan terus berjalan sampai check-out, tanpa reset otomatis pada pergantian tanggal.
9. Satu sesi yang melintasi tanggal tetap satu sesi absensi. Pelaporan harian perlu mengacu pada kebijakan pelaporan yang akan ditetapkan, tanpa mengubah timestamp asli sesi.
10. Sesi lupa check-out dan koreksi absensi masih memerlukan aturan terpisah sebelum implementasi final.

## 5. Riwayat, laporan, dan dashboard
- Karyawan hanya dapat melihat riwayat absensinya sendiri.
- Admin/superadmin dapat mengakses data sesuai kewenangan.
- Laporan diekspor ke CSV.
- Kolom yang disarankan: tanggal check-in, kode/nama karyawan, check-in, check-out, total durasi, status durasi, dan data lokasi sesuai hak akses.
- Sesi yang melintasi tengah malam tetap satu sesi dengan timestamp check-in dan check-out asli; aturan pengelompokan ke laporan per tanggal harus ditetapkan tanpa memecah sesi secara otomatis.
- Dashboard karyawan: status sesi, aksi check-in/check-out, dan riwayat.
- Dashboard admin: ringkasan absensi dan pengelolaan karyawan.
- Dashboard superadmin: konfigurasi sistem dan pengelolaan akses.
- UI mobile-first/PWA, gaya SaaS modern-futuristik, dominan biru dan putih.

## 6. Keamanan dan privasi
- Autentikasi diperlukan untuk fitur internal.
- Otorisasi dilakukan di server/API.
- Selfie, koordinat GPS, dan data absensi hanya dapat diakses oleh pihak berwenang.
- Password disimpan sebagai hash, bukan teks biasa.
- Validasi dilakukan di frontend dan backend; rahasia aplikasi tidak disimpan di kode frontend.
- Kebijakan retensi, penghapusan, dan akses foto/lokasi perlu disepakati sebelum produksi.

## 7. Konfigurasi awal
| Kunci | Nilai | Catatan |
|---|---|---|
| `minimum_work_duration_minutes` | `510` | 8 jam 30 menit |
| `fixed_work_schedule_enabled` | `false` | tidak ada jam masuk/pulang universal |
| `break_time_deducted` | `false` | istirahat tidak dikurangi |
| `allow_checkout_below_minimum` | `true` | check-out tetap diizinkan |
| `cross_midnight_session_enabled` | `true` | sesi berlanjut melewati tengah malam |
| `gps_recording_enabled` | `true` | catat GPS jika tersedia/diizinkan |
| `gps_geofence_enabled` | `false` | tidak menolak berdasarkan radius |
| `selfie_camera_only` | `true` | kamera langsung, bukan galeri |
| `report_export_format` | `CSV` | format laporan |
| `timezone` | `Asia/Jakarta` | usulan; perlu konfirmasi |

## 8. Keputusan yang masih terbuka
1. Zona waktu resmi sistem (usulan `Asia/Jakarta`).
2. Apakah selfie diwajibkan juga saat check-out, atau hanya saat check-in?
3. Apakah absensi boleh disimpan jika izin kamera/GPS ditolak atau perangkat tidak mendukung?
4. Bagaimana menangani sesi lupa check-out dan alur koreksi absensi?
5. Bagaimana sesi lintas tengah malam ditampilkan dalam rekap harian (misalnya dikelompokkan menurut tanggal check-in), tanpa menutup sesi otomatis?
6. Retensi data selfie/GPS dan pihak yang dapat mengaksesnya.

## 9. Kriteria penerimaan
- Tidak ada jam check-in universal yang diwajibkan.
- Durasi minimum dikonfigurasi sebagai 510 menit.
- Istirahat tidak dikurangi dari durasi.
- Check-out di bawah 510 menit tetap diizinkan dan menghasilkan status `KURANG_DURASI`.
- Sesi yang melewati tengah malam tidak ditutup atau direset otomatis.
- GPS dicatat tanpa geofence/radius penolakan.
- Selfie berasal dari alur kamera langsung, bukan galeri.
- Laporan CSV memuat durasi dan status.
- Hak akses data divalidasi di server/API.
