# PremStore Auto — Website Auto Order Aplikasi Premium + Local Stock Server

Website toko otomatis (auto-order) aplikasi premium berbasis **Next.js (App Router)** yang siap di-deploy ke **Vercel**, dilengkapi **Local Stock Server** (`local-server/`) untuk mengelola produk, menambah stok akun secara massal, dan menyinkronkannya ke Vercel secara aman melalui API Key.

## Fitur Utama

### 1. Website Storefront (Deploy ke Vercel)
- **Katalog Aplikasi Premium** (Netflix, Spotify, Canva Pro, ChatGPT Plus, YouTube Premium, CapCut Pro, dll) dengan filter kategori & pencarian.
- **Stok Real-Time** — menampilkan jumlah akun yang tersedia; otomatis terkunci saat stok habis.
- **Auto Order & Auto Delivery 24/7** — pembeli checkout → dapat invoice & QRIS → setelah pembayaran terkonfirmasi, akun langsung diambil otomatis dari pool stok dan ditampilkan ke pembeli (lengkap dengan tombol salin).
- **Lacak Pesanan** — pembeli dapat membuka kembali detail akun kapan saja menggunakan nomor Invoice atau Email.
- **Endpoint Sync Aman (`/api/sync/stock`)** — dilindungi header `x-api-key` (`SYNC_API_KEY`) untuk menerima update stok dari Local Server dan mengirim daftar pesanan terbaru.
- **Universal Storage Adapter**:
  - Otomatis memakai **Upstash Redis / Vercel KV** saat environment variables diatur (disarankan untuk produksi di Vercel agar stok permanen).
  - Otomatis memakai file JSON lokal (`data/store.json`) saat dijalankan di komputer lokal.

### 2. Local Stock Server (`local-server/`)
- Berjalan secara lokal di `http://localhost:4000` (zero-dependency Node.js, ringan & cepat).
- **Dashboard Admin Lokal** untuk:
  - Tambah / edit / hapus produk & harga.
  - **Bulk Input Stok Akun** (1 baris = 1 akun, misalnya `email@mail.com | password | Profile 1 PIN 1234`).
  - **Auto-Sync** atau tombol manual **Push ke Vercel** untuk mengirim perubahan stok langsung ke website live.
  - **Pull Order & Stok** dari Vercel untuk melihat transaksi terbaru dan menyinkronkan status akun yang sudah terjual.

---

## Cara Menjalankan di Lokal

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Jalankan Website (Port 3000)**
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000`
3. **Jalankan Local Stock Server (Port 4000)** di terminal terpisah:
   ```bash
   npm run local-server
   ```
   Buka `http://localhost:4000`

---

## Cara Deploy ke Vercel

1. Push folder project ini ke repository GitHub Anda.
2. Buka [vercel.com](https://vercel.com) → **Add New Project** → pilih repository Anda.
3. Tambahkan **Environment Variables** di Vercel:
   - `SYNC_API_KEY`: buat kunci rahasia acak (contoh: `rahasia-toko-prem-2026`).
   - `NEXT_PUBLIC_STORE_NAME`: nama toko Anda.
   - `NEXT_PUBLIC_WHATSAPP_ADMIN`: nomor WA admin format `628xxx`.
4. **Penting untuk Penyimpanan Permanen di Vercel**:
   - Di dashboard project Vercel, buka tab **Storage** → **Create Database** → pilih **Upstash Redis** (tersedia paket gratis).
   - Sambungkan ke project Anda, maka `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN` (atau `KV_REST_API_URL` & `KV_REST_API_TOKEN`) otomatis terpasang.
   - Redeploy project.

---

## Cara Update Stok dari Local Server ke Vercel

1. Jalankan `npm run local-server` di komputer Anda lalu buka `http://localhost:4000`.
2. Di bar konfigurasi atas:
   - **URL Website**: masukkan URL Vercel Anda, misalnya `https://premstore-anda.vercel.app`
   - **SYNC_API_KEY**: masukkan kunci yang sama persis dengan di Vercel Environment Variables.
   - Centang **Auto-Sync** jika ingin setiap perubahan otomatis langsung terkirim ke Vercel.
3. Klik **Simpan Config**.
4. Tambah produk / paste stok akun baru → klik **⬆ Push ke Vercel**.
5. Untuk melihat pesanan masuk dari pembeli di Vercel, klik **⬇ Pull Order & Stok**.
