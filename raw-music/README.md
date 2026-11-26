# Panduan Galeri Musik MP3 (`raw-music/`)

Folder `raw-music/` menyimpan file audio **mentah** (`.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`, atau `.aac`) yang Anda kurasi sendiri untuk **Tab Galeri** di Builder PesanManis. Folder ini otomatis diabaikan oleh `.gitignore` sehingga file mentah berukuran besar tidak ikut masuk ke Git.

## Cara Menambah atau Mengganti Lagu Galeri (Tanpa Edit Kode)

1. Taruh file audio Anda ke folder kategori yang sesuai:
   - `raw-music/ungkapan-sayang/` → tampil di template **Love Message** (lagu pertama juga otomatis dipakai untuk kartu Hero landing page)
   - `raw-music/birthday/` → tampil di template **Birthday**
   - `raw-music/anniversary/` → tampil di template **Anniversary**
   - `raw-music/permintaan-maaf/` → tampil di template **Sorry Message**
2. Gunakan format penamaan **`Artis - Judul Lagu.mp3`** (atau `Judul Lagu.mp3`) agar nama artis dan judul tampil rapi di daftar Galeri, misalnya:
   - `raw-music/ungkapan-sayang/Sal Priadi - Kita Usahakan Rumah Itu.mp3`
   - `raw-music/ungkapan-sayang/Jaz - Bersamamu.mp3`
   - `raw-music/anniversary/Ed Sheeran - Perfect.mp3`
3. Jalankan perintah build musik:

```bash
npm run music:build
```

## Opsi Tambahan

```bash
# Bangun ulang semua file walau sudah pernah dikonversi
npm run music:build -- --force

# Hapus file .mp3 di public/music/ yang sumber mentahnya sudah dihapus dari raw-music/
npm run music:build -- --prune

# Gunakan bitrate lebih hemat (~2,4 MB per lagu 3,5 menit)
npm run music:build -- --bitrate 96k
```

## Apa yang Dilakukan `scripts/build-music.mjs`?

1. **Durasi penuh utuh:** Tidak memotong lagu menjadi 60 detik, sehingga pengguna bebas memilih titik mulai & berakhir mana pun lewat Trimmer di Builder.
2. **Normalisasi volume (`-16 LUFS`):** Menjaga tingkat suara antar-lagu seragam dan nyaman saat didengar di HP.
3. **Kompresi ringan (`112 kbps` stereo, `44.1 kHz`, tanpa cover art/metadata berat):** Disimpan ke `public/music/<kategori>/<slug>.mp3` untuk dilayani cepat melalui CDN statis.
4. **Update manifest otomatis:** Memperbarui `lib/music-manifest.ts` dengan judul, artis, kategori, durasi asli (`ffprobe`), dan URL siap putar.

> **Catatan Lisensi:** Pastikan seluruh file audio yang Anda taruh di `raw-music/` dan distribusikan melalui `public/music/` adalah audio yang Anda miliki hak/lisensi penggunaannya.
