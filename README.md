# PremStore Auto — Website Auto Order Aplikasi Premium (100% Full Vercel & 100% Gratis)

Website toko otomatis (**auto-order**) aplikasi premium berbasis **Next.js (App Router)** yang berjalan **100% full di Vercel** dan menggunakan **Secret GitHub Gist** sebagai database permanen (**100% gratis selamanya, tanpa kartu kredit, pakai akun GitHub Anda**).

## Fitur Utama

1. **Storefront Auto-Order (`/`)**
   - Katalog aplikasi premium (Netflix 4K, Spotify, Canva Pro, ChatGPT Plus, YouTube Premium, CapCut Pro) dengan filter kategori, pencarian, dan badge stok real-time.
   - Checkout cepat dengan pilihan metode pembayaran (QRIS, DANA, OVO, GoPay, BCA).
   - Fitur **Lacak Pesanan** berdasarkan nomor Invoice, Email, atau WhatsApp.
2. **Halaman Invoice & Auto-Delivery (`/order/[id]`)**
   - Pembayaran terverifikasi → stok otomatis berkurang → detail akun premium langsung muncul otomatis dengan tombol salin.
3. **Admin Panel Full Vercel (`/admin`)**
   - Login dengan `ADMIN_PASSWORD`.
   - Tambah / edit / hapus produk & harga.
   - **Bulk Input Stok Akun** (paste banyak akun sekaligus, 1 baris = 1 stok).
   - **Riwayat Order** lengkap + tombol konfirmasi manual.
4. **Database Permanen 100% Gratis (Secret GitHub Gist)**
   - Tanpa kartu kredit & tanpa daftar layanan berbayar — cukup pakai akun GitHub yang sudah Anda miliki!

---

## Cara Setup Database Gratis (GitHub Gist — 2 Menit)

1. **Buat Secret Gist**
   - Buka https://gist.github.com (login dengan akun GitHub Anda).
   - Pada kolom **Filename including extension**, isi: `premstore-db.json`
   - Pada kotak isi, ketik: `{}`
   - Klik tombol panah di sebelah tombol hijau → pilih **Create secret gist**.
   - Lihat URL di browser Anda, contoh: `https://gist.github.com/username/a1b2c3d4e5f67890`
   - Salin bagian ID di belakangnya (`a1b2c3d4e5f67890`) — ini adalah **`GITHUB_GIST_ID`**.

2. **Buat GitHub Token**
   - Buka https://github.com/settings/tokens/new (Personal access tokens — Classic).
   - **Note**: isi `premstore-db`
   - **Expiration**: pilih **No expiration**
   - Centang **hanya 1 kotak**: **`gist`**
   - Klik **Generate token** lalu salin token (`ghp_...`) — ini adalah **`GITHUB_TOKEN`**.

---

## Cara Deploy Full ke Vercel

1. Ekstrak `auto-order-premium.zip` (jangan `npm install` dulu) → upload seluruh file ke repository GitHub Anda.
2. Buka [vercel.com](https://vercel.com) → **Add New Project** → pilih repository Anda.
3. Di bagian **Environment Variables**, tambahkan:
   - `ADMIN_PASSWORD` = password rahasia untuk login `/admin`
   - `GITHUB_TOKEN` = token `ghp_...` dari langkah di atas
   - `GITHUB_GIST_ID` = ID Secret Gist dari langkah di atas
   - `NEXT_PUBLIC_STORE_NAME` = nama toko Anda
   - `NEXT_PUBLIC_WHATSAPP_ADMIN` = nomor WA admin (`628xxx`)
4. Klik **Deploy**.

Selesai! Buka:
- Toko pembeli: `https://nama-project-anda.vercel.app`
- Admin update stok: `https://nama-project-anda.vercel.app/admin`
