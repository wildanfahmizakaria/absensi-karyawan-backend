# User Flow — Absensi CV Mandala Mahardika
**Status:** Revisi SOT v0.2 — direvisi berdasarkan arahan pemilik proyek (menunggu konfirmasi)

## 1. Login dan pengarahan peran
```mermaid
flowchart TD
    A[Buka aplikasi] --> B[Halaman login]
    B --> C{Kredensial valid?}
    C -- Tidak --> D[Tampilkan pesan aman]
    D --> B
    C -- Ya --> E[Ambil profil dan peran dari server]
    E --> F{Peran}
    F --> G[Dashboard Karyawan]
    F --> H[Dashboard Admin]
    F --> I[Dashboard Superadmin]
```

## 2. Absen masuk/pulang
```mermaid
flowchart TD
    A[Dashboard karyawan] --> B[Pilih Masuk atau Pulang]
    B --> C{Status dan aturan mengizinkan?}
    C -- Tidak --> D[Tampilkan status dan alasan]
    C -- Ya --> E[Minta izin kamera]
    E --> F{Kamera tersedia dan diizinkan?}
    F -- Tidak --> G[Instruksi aktifkan izin/perangkat]
    F -- Ya --> H[Preview kamera live]
    H --> I[Ambil foto dari stream]
    I --> J[Minta lokasi GPS]
    J --> K{Lokasi GPS diperoleh?}
    K -- Tidak --> L[Instruksi aktifkan izin lokasi / coba lagi]
    K -- Ya --> M[Konfirmasi foto dan koordinat lokasi]
    M --> N[Kirim ke server]
    N --> O{Validasi server}
    O -- Ditolak --> P[Tampilkan alasan dan opsi perbaikan]
    O -- Diterima --> Q[Tampilkan berhasil dan perbarui dashboard]
```

## 3. Riwayat dan laporan
- Karyawan: Dashboard → Riwayat → pilih rentang tanggal/status → detail transaksi (waktu, foto, koordinat lokasi).
- Admin: Dashboard Admin → Laporan → filter periode/karyawan/status → pratinjau → ekspor PDF atau CSV.
- Admin: Manajemen Karyawan → tambah/edit/nonaktifkan → validasi → simpan → catat audit log.
- Superadmin: Pengaturan → ubah profil kantor atau konfigurasi jadwal kerja tetap → konfirmasi → server menyimpan perubahan dan audit log.

## 4. Cabang kegagalan wajib
- Login gagal atau sesi kedaluwarsa.
- Izin kamera ditolak, kamera tidak tersedia, atau browser bukan secure context.
- Lokasi ditolak, GPS nonaktif, atau timeout pengambilan koordinat.
- Jaringan terputus atau server gagal; jangan menampilkan sukses palsu.
- Pengiriman ganda atau transaksi masuk/pulang sudah tercatat untuk hari yang sama.
- Ekspor gagal atau filter tidak menghasilkan data.

## 5. Prinsip alur
- Pengguna mengetahui tahap yang sedang berjalan.
- Foto tidak diunggah sebelum konfirmasi pengguna.
- Waktu transaksi resmi ditentukan server.
- Transaksi yang gagal tidak boleh ditampilkan sebagai absensi sukses.
