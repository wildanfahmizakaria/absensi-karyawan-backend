# PANDUAN DEPLOYMENT KE RAILWAY (DEPLOYMENT-RAILWAY.md)
## Sistem Absensi Karyawan CV Mandala Mahardika
**Target Platform:** [Railway.app](https://railway.com)  
**Komponen:** 1 Project berisi **Service Database (MySQL)** dan **Service Backend API (Node.js)**

---

## 🏗️ Gambaran Arsitektur Proyek di Railway

Di dalam 1 Project Railway (contoh nama: `absensi-mandala`), akan terdapat 2 service:
```
Project: absensi-mandala
│
├── 1. Service Database (MySQL)
│     └── Menyediakan instance basis data MySQL 8.x terisolasi
│
└── 2. Service Backend API (Node.js)
      └── Menjalankan Express.js REST API terhubung ke Service Database
```

---

## 📋 Langkah Demi Langkah Deployment

### Langkah 1: Buat Project Baru di Railway
1. Buka [Railway Dashboard](https://railway.com/dashboard).
2. Klik tombol **`+ New Project`**.
3. Pilih **`Empty Project`**.
4. Beri nama project Anda (misal: `absensi-mandala-mahardika`).

---

### Langkah 2: Buat Service Database (MySQL)
1. Di dalam project yang baru dibuat, klik **`+ New`** (atau tombol *Create*).
2. Pilih opsi **`Database`** $\rightarrow$ pilih **`Add MySQL`**.
3. Tunggu beberapa detik hingga service MySQL selesai dibuat (*Active*).
4. Klik pada service MySQL tersebut:
   - Di tab **Variables**, Railway akan otomatis membuat variabel bawaan:
     - `MYSQLHOST`
     - `MYSQLPORT`
     - `MYSQLUSER`
     - `MYSQLPASSWORD`
     - `MYSQLDATABASE` (default: `railway`)
     - `MYSQL_URL` (format: `mysql://root:...@...:.../railway`)

---

### Langkah 3: Buat Service Backend API (Node.js)
1. Pastikan folder kode `backend` ini sudah di-push ke GitHub repository Anda.
2. Di canvas project Railway yang sama, klik **`+ New`** $\rightarrow$ pilih **`GitHub Repo`**.
3. Pilih repository proyek absensi Anda. (Jika proyek berada di sub-folder `backend`, set *Root Directory* di Settings menjadi `/backend`).
4. Railway akan otomatis mendeteksi Node.js dari `package.json`.

---

### Langkah 4: Konfigurasi Environment Variables pada Service API
Buka service **Backend API** Anda di Railway $\rightarrow$ masuk ke tab **`Variables`** $\rightarrow$ tambahkan variabel berikut:

#### Opsi A: Menggunakan Connection URL Otomatis (Direkomendasikan & Paling Ringkas)
Tambahkan 1 variabel referensi ke database:
```env
MYSQL_URL=${{MySQL.MYSQL_URL}}
```
*(Backend kita sudah diprogram otomatis mendeteksi variabel `MYSQL_URL` ini!)*

#### Tambahkan juga variabel aplikasi lainnya:
```env
NODE_ENV=production
JWT_SECRET=mandala_super_secret_jwt_key_produksi_2026_ganti_acak
JWT_EXPIRES_IN=24h
DEFAULT_TIMEZONE=Asia/Jakarta
MAX_FILE_SIZE_MB=5
```
*(Catatan: Variabel `PORT` tidak perlu disetel manual karena Railway akan menyuntikkannya secara otomatis).*

---

### Langkah 5: Pasang Persistent Volume untuk Foto Swafoto (Penting!)
Container di Railway bersifat *ephemeral* (file yang baru diunggah akan terhapus jika aplikasi melakukan *restart* atau *redeploy*). Agar foto swafoto absensi karyawan tetap tersimpan aman permanen:
1. Klik service **Backend API** $\rightarrow$ buka tab **`Volumes`**.
2. Klik **`+ Add Volume`**.
3. Isi kolom **Mount Path**:
   ```
   /app/uploads/selfies
   ```
   *(atau `uploads/selfies` jika root directory adalah `/backend`)*
4. Simpan. Sekarang seluruh foto absensi karyawan aman dan tersimpan permanen.

---

### Langkah 6: Generate Public Domain URL untuk API
1. Klik service **Backend API** $\rightarrow$ buka tab **`Settings`**.
2. Scroll ke bagian **Networking** $\rightarrow$ klik **`Generate Domain`**.
3. Anda akan mendapatkan URL publik HTTPS, contoh:
   ```
   https://absensi-api-production.up.railway.app
   ```
4. Uji di browser Anda:
   - `https://absensi-api-production.up.railway.app/` $\rightarrow$ Info API
   - `https://absensi-api-production.up.railway.app/api/v1/health` $\rightarrow$ `{"status":"OK"}`

---

### Langkah 7: Inisialisasi Skema & Seed Data Database
Pilih salah satu cara tercepat berikut untuk mengeksekusi file `database/database.sql`:

#### Cara 1: Menggunakan Skrip Migrasi Otomatis via Railway CLI (Paling Mudah)
Dari terminal laptop Anda:
```bash
# 1. Login ke akun Railway (gunakan scope @railway/cli)
npx @railway/cli login

# 2. Hubungkan ke project Anda
npx @railway/cli link

# 3. Jalankan migrasi langsung ke MySQL Railway:
npx @railway/cli run npm run migrate
```
*(Atau pasang CLI secara global: `npm install -g @railway/cli` lalu jalankan `railway login`)*
Skrip akan otomatis membaca variabel `MYSQL_URL` dari Railway dan mengeksekusi tabel beserta data awal!

#### Cara 2: Import via MySQL Client Langsung
1. Buka service **MySQL** di Railway $\rightarrow$ buka tab **`Connect`**.
2. Pada bagian **Public Networking**, salin perintah koneksi MySQL yang disediakan Railway, contohnya:
   ```bash
   mysql -h roundhouse.proxy.rlwy.net -P 12345 -u root -p<PASSWORD> railway < database/database.sql
   ```

#### Cara 3: Melalui Tab Data di Dashboard Railway
1. Buka service **MySQL** di Railway $\rightarrow$ buka tab **`Data`**.
2. Buka Query Editor / console SQL bawaan.
3. Buka isi file [`database/database.sql`](./database/database.sql), salin kodenya, paste ke editor query Railway, lalu klik **Run**.

---

## 🔒 Checklist Pra-Produksi

- [x] Kode database backend mendukung `MYSQL_URL`, `MYSQLHOST`, dan referensi Railway secara otomatis.
- [x] Skrip migrasi (`scripts/migrate.js`) otomatis mendeteksi nama database Railway (`railway`) tanpa error constraint nama database lokal.
- [x] Password akun awal sudah ter-hash Bcrypt valid (`password123`).
- [x] Nilai `JWT_SECRET` diganti dengan string acak yang kuat di tab Variables Railway.
- [x] Persistent volume untuk path upload foto sudah dikonfigurasi.

