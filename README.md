# SynoxHub

Dashboard multi-fungsi: Asisten AI, Unduh Video (TikTok & YouTube), dan Cari Profil (TikTok/WhatsApp/Instagram) — pakai API kamu sendiri (`api.synoxcloud.xyz`). Tanpa MongoDB, semua data disimpan di file JSON (`data/*.json`).

## Menjalankan

```bash
npm install
npm start
```

Buka `http://localhost:3000`. Login default:

- **Username:** `admin`
- **Password:** `admin123`

⚠️ Segera ganti password admin (buat akun admin baru lewat panel admin, lalu hapus akun admin lama) karena saat ini belum ada halaman "ubah password" sendiri.

## Struktur

- `server.js` — entry point Express
- `lib/db.js` — baca/tulis file JSON sederhana (pengganti database)
- `lib/store.js` — semua logika data: user, settings, limit harian, log aktivitas
- `lib/synox.js` — pembungkus semua panggilan ke `api.synoxcloud.xyz` (AI, downloader, stalker), termasuk dukungan tombol Stop
- `routes/` — halaman & endpoint: `auth`, `ai`, `downloader`, `stalker`, `admin`
- `views/` — tampilan EJS, tema "Signal Room" (graphite + aksen amber/cyan)
- `public/` — CSS & JS sisi klien
- `data/` — `users.json`, `settings.json`, `logs.json` (dibuat otomatis saat pertama kali jalan)

## Fitur

**Semua pengguna (setelah login/daftar):**
- Dashboard ringkasan + sisa jatah harian
- **Asisten AI** — obrolan real-time, tombol Stop yang benar-benar membatalkan request ke API (bukan cuma di browser), deteksi otomatis blok kode dari jawaban AI lengkap dengan tombol **Salin** & **Unduh** (nama file menyesuaikan bahasa kode), serta upload foto untuk pratinjau (API AI saat ini hanya menerima teks, jadi foto tidak dikirim ke model — sesuai permintaan, fitur ini di-skip secara otomatis dengan pesan yang jelas ke pengguna)
- **Unduh Video** — tempel link TikTok atau YouTube, sistem otomatis mendeteksi platform
- **Cari Profil** — cari profil publik TikTok, WhatsApp, atau Instagram
- Limit harian 5x pemakaian (bisa diubah admin), reset otomatis tiap hari, admin tidak kena limit

**Khusus admin (Panel Admin):**
1. Ubah nama & tagline website
2. Ubah background: warna solid (HEX) atau upload gambar
3. Ubah limit harian default untuk pendaftar baru
4. Tambah akun baru (user/admin)
5. Ubah limit harian per pengguna
6. Naikkan/turunkan peran (promote/demote)
7. Hapus akun
8. Log aktivitas terbaru (login, pemakaian AI, download, pencarian, aksi admin)

## Catatan penting soal API

Endpoint `api.synoxcloud.xyz` yang kamu berikan tidak menyertakan dokumentasi resmi format parameter untuk `stalker/tiktokstalk` dan `stalker/whatsapp`, jadi kode ini menebak nama parameter paling umum:

- TikTok stalk: `?username=...`
- WhatsApp stalk: `?number=...`
- Instagram stalk: `?username=...` (sudah sesuai contoh yang kamu berikan)

Kalau ternyata nama parameternya beda, tinggal sesuaikan di `lib/synox.js` (fungsi `stalkTiktok` / `stalkWhatsapp`).

Bentuk balasan API (nama field JSON) juga bisa bervariasi. Untuk itu:
- Chat AI mencoba beberapa nama field umum (`result`, `message`, `response`, `answer`, `data`) sebelum jatuh ke teks mentah.
- Unduh video & cari profil pakai `public/js/result-render.js`, yang otomatis mendeteksi field bergambar (avatar/thumbnail) dan field link unduhan dari nama key-nya, lalu tetap menampilkan JSON mentah yang bisa dibuka (`Lihat data mentah`) sebagai jaring pengaman kalau tampilan otomatis kurang pas untuk struktur data tertentu.

Karena sandbox pembuatan proyek ini tidak punya akses keluar ke `api.synoxcloud.xyz`, seluruh alur (login, limit harian, upload foto, tombol Stop, panel admin) sudah diuji end-to-end, tapi respons asli dari API belum bisa divalidasi langsung dari sini — coba jalankan di komputermu sendiri dan kabari kalau ada bentuk respons yang meleset, gampang disesuaikan.

## Deploy lewat GitHub (Railway / Render)

Aplikasi ini proses Node.js biasa (bukan serverless), jadi **tidak perlu ubah kode apa pun** untuk deploy ke Railway atau Render — beda dengan Vercel yang filesystem-nya nggak persisten.

### 1. Push ke GitHub

```bash
cd synoxhub
git init
git add .
git commit -m "SynoxHub"
git branch -M main
git remote add origin https://github.com/USERNAME/synoxhub.git
git push -u origin main
```

### 2A. Deploy ke Railway (rekomendasi)

1. Buka [railway.app](https://railway.app) → login pakai GitHub.
2. **New Project** → **Deploy from GitHub repo** → pilih repo `synoxhub`.
3. Railway otomatis mendeteksi Node.js (baca `railway.toml` yang sudah disiapkan) dan langsung `npm install && node server.js`.
4. Tunggu build selesai → klik **Settings > Networking > Generate Domain** untuk dapat URL publik.
5. (Opsional, biar data tidak reset saat redeploy) di tab **Volumes**, attach volume dan mount ke path `/app/data`.
6. (Opsional) di tab **Variables**, tambahkan `SESSION_SECRET` dengan string acak sendiri.

### 2B. Deploy ke Render (alternatif)

1. Buka [render.com](https://render.com) → login pakai GitHub.
2. **New +** → **Web Service** → pilih repo `synoxhub`. Render akan membaca `render.yaml` otomatis.
3. Plan **Free** sudah cukup untuk coba-coba (catatan: free tier "tidur" kalau tidak ada trafik lama, dan disk-nya reset saat servicenya redeploy/wake dari sleep — kalau mau data permanen, upgrade ke plan berbayar lalu tambahkan **Render Disk** yang di-mount ke `/opt/render/project/src/data`).
4. Klik **Create Web Service**, tunggu build, lalu dapat URL publik otomatis.

Setelah live, login pertama tetap pakai `admin` / `admin123` — langsung ganti dari Panel Admin.

## Author

`mhrdwnx` · `apikey-bysynox` (tercantum di halaman login & daftar)
