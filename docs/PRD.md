# PRD — Sistem Absensi Karyawan Berbasis Website
**Proyek:** Sistem Absensi Karyawan Berbasis Website (Mobile-First / PWA)  
**Organisasi:** CV Mandala Mahardika  
**Status:** Revisi SOT v0.2 — direvisi berdasarkan arahan pemilik proyek (menunggu konfirmasi)

## 1. Ringkasan
Aplikasi absensi karyawan berbasis web responsif dengan pendekatan mobile-first dan kemampuan PWA. Karyawan melakukan absen masuk/pulang melalui swafoto dari kamera live dan rekaman lokasi GPS yang disimpan sebagai bukti otentik kehadiran (tanpa pembatasan radius geofence kantor). Admin mengelola data operasional dan laporan; superadmin mengelola konfigurasi organisasi serta akses lintas fungsi.

## 2. Tujuan
- Mempercepat pencatatan kehadiran melalui aksi masuk/pulang yang jelas.
- Menyediakan bukti swafoto live dan rekaman koordinat lokasi GPS untuk setiap transaksi absensi.
- Menyajikan riwayat dan rekap absensi yang dapat diekspor ke format PDF dan CSV.
- Memisahkan kewenangan karyawan, admin, dan superadmin.
- Menyediakan pengalaman yang nyaman di layar HP serta dapat dipasang sebagai PWA.

## 3. Peran dan hak akses
| Peran | Hak akses utama |
|---|---|
| Karyawan | Dashboard sendiri, absen masuk/pulang, riwayat dan detail absensi sendiri |
| Admin | Dashboard operasional, pengelolaan karyawan, pemantauan absensi, koreksi berizin, ekspor laporan |
| Superadmin | Seluruh fungsi admin, pengaturan profil organisasi/kantor, manajemen jadwal kerja tetap, manajemen peran, konfigurasi sistem dan audit |

## 4. Ruang lingkup MVP
- Autentikasi login/logout dan kontrol akses berbasis peran.
- Dashboard berbeda sesuai peran.
- Alur absen masuk dan pulang.
- Akses kamera live menggunakan `getUserMedia`; foto diambil dari stream kamera, tanpa pemilih file galeri pada alur absensi.
- Pengambilan geolokasi melalui Geolocation API dan perekaman koordinat lokasi (latitude, longitude, akurasi) tanpa pembatasan radius geofence.
- Riwayat absensi, filter periode/status, detail transaksi.
- Laporan dan ekspor PDF serta CSV (format spreadsheet utama kompatibel Excel).
- Manajemen karyawan, jadwal kerja tetap (fixed schedule), profil organisasi/kantor, dan audit tindakan admin.
- PWA manifest, ikon, dan strategi cache terbatas untuk shell aplikasi.

## 5. Di luar ruang lingkup MVP
- Pembatasan radius geofence kantor (berdasarkan keputusan: GPS tetap direkam tanpa pembatasan radius).
- Payroll dan perhitungan penggajian.
- Integrasi mesin fingerprint/face recognition.
- Aplikasi native Android/iOS.
- Klaim bahwa GPS palsu dapat dicegah 100% oleh browser. Sistem merekam koordinat dan akurasi untuk keperluan audit dan verifikasi server.
- Sinkronisasi absensi offline sebagai transaksi final. Tanpa jaringan, transaksi ditahan dan pengguna diminta mengirim ulang saat online.

## 6. Kebutuhan fungsional
- FR-01: pengguna dapat login dan logout.
- FR-02: navigasi dan data dibatasi berdasarkan peran.
- FR-03: sistem menampilkan status hari ini dan tombol aksi cepat Masuk/Pulang.
- FR-04: transaksi hanya dapat dikirim setelah kamera live menghasilkan foto dan lokasi GPS berhasil diperoleh.
- FR-05: server memeriksa waktu transaksi, status absensi, validitas payload, serta merekam koordinat lokasi dan estimasi akurasi ke basis data.
- FR-06: sistem mencegah duplikasi absen masuk/pulang untuk hari/jadwal kerja yang sama, kecuali melalui proses koreksi berizin.
- FR-07: karyawan dapat melihat riwayat dan detail absensinya sendiri (termasuk foto dan koordinat lokasi).
- FR-08: admin dapat mencari/filter data absensi dan mengekspor laporan ke format PDF dan CSV.
- FR-09: superadmin dapat mengatur pengguna, peran, konfigurasi jadwal kerja tetap, dan parameter organisasi.
- FR-10: tindakan sensitif tercatat pada audit log.

## 7. Kebutuhan nonfungsional
- Mobile-first, responsif, aksesibel, dan usable dengan satu tangan.
- HTTPS wajib untuk kamera dan geolokasi di lingkungan produksi.
- Validasi otorisasi dilakukan di server, bukan hanya menyembunyikan elemen UI.
- Foto dan data lokasi diperlakukan sebagai data sensitif; akses, retensi, dan penghapusannya harus ditetapkan organisasi.
- Tampilkan status loading, izin ditolak, lokasi tidak tersedia/timeout, akurasi rendah, offline, dan kegagalan server.
- Target awal: tampilan inti dapat digunakan pada lebar 360 px; aksi utama memiliki area sentuh sekitar 44×44 px atau lebih.

## 8. Kriteria penerimaan MVP
- Pengguna tiap peran hanya dapat mengakses fungsi yang diizinkan.
- Absen gagal jika foto live atau lokasi GPS tidak tersedia / izin ditolak.
- Server merekam foto dan koordinat lokasi ke transaksi absensi.
- Pengguna mendapat pesan yang jelas untuk semua kegagalan umum (kamera ditolak, lokasi ditolak, gangguan jaringan).
- Riwayat bisa difilter; laporan dapat diunduh dalam format PDF dan CSV.
- UI berfungsi pada ukuran HP, tablet, dan desktop.
- Manifest PWA valid; aplikasi dapat dipasang pada browser yang mendukung.
- Ada pengujian untuk autentikasi, izin kamera & geolokasi, rekaman koordinat, pencegahan duplikasi, akses peran, dan ekspor laporan.

## 9. Status keputusan SOT
- **Keputusan yang telah ditetapkan pemilik proyek:**
  1. **Geolokasi:** Tanpa radius geofence; koordinat GPS (latitude, longitude, accuracy) tetap wajib diambil dan direkam pada setiap transaksi absensi.
  2. **Format Ekspor:** Format spreadsheet utama adalah CSV (kompatibel Excel).
  3. **Jadwal Kerja:** Menggunakan sistem batas durasi kerja minimal 8 jam 30 menit (jam masuk bebas jam berapapun, minimal absen pulang = Jam Masuk + 8 jam 30 menit, dan sistem otomatis memberikan keterangan evaluasi jika durasi kurang atau lebih dari 8 jam 30 menit).
- **Poin teknis yang masih perlu konfirmasi lanjutan:**
  - Jam kerja spesifik (jam masuk, batas toleransi keterlambatan, jam pulang) dan zona waktu (asumsi default WIB).
  - Pilihan runtime backend, database, penyimpanan foto privat, provider hosting, serta kebijakan retensi data foto.
