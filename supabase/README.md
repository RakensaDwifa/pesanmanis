# Panduan Database Supabase — PesanManis

Repositori ini mendukung dua jalur inisialisasi database Supabase.

---

## 1. Setup Proyek Baru (Rekomendasi untuk Produksi Baru)

Jika Anda membuat project Supabase baru dari nol:
1. Buka dashboard Supabase → **SQL Editor**.
2. Buka dan salin seluruh isi file:
   ```
   supabase/setup-production.sql
   ```
3. Jalankan query (`Run`).
4. Selesai. Seluruh tabel, index, RLS policy, realtime, storage bucket `foto`, trigger `updated_at`, dan view `ucapan_stats` telah terpasang dengan konfigurasi produksi terkini (termasuk skema harga promo dan referral).

---

## 2. Migrasi Bertahap (Untuk Database yang Sudah Berjalan)

Jika database sudah memiliki data dan tabel dari versi sebelumnya, **jangan jalankan ulang `schema.sql`** karena dapat menyebabkan konflik policy atau reset yang tidak diinginkan. Jalankan migrasi sesuai versi terakhir database Anda:

| File | Keterangan & Tujuan |
|---|---|
| `schema.sql` | Skema pondasi awal (templates, ucapan, payments, views). |
| `schema_v2.sql` | Upgrade RLS, bucket foto, realtime publication, dan view ucapan_stats. |
| `schema_v3.sql` | Menambahkan kolom `ucapan.email`. |
| `schema_v4.sql` | Keamanan RLS templates & security_invoker view ucapan_stats. |
| `schema_v5.sql` | Menambahkan kolom `ucapan.timeline` (JSONB). |
| `schema_v6.sql` | Policy publik share link ucapan, tabel `reactions`, tabel `replies`, dan trigger `updated_at`. |
| `schema_v7.sql` | Hapus default 8.900 pada `payments.amount`, index performa `payments(status, amount)`, tabel `referrals`, tabel `credits`, dan tabel `checkout_sessions`. |
| `schema_v8.sql` | **Wajib dijalankan saat ini:** Tambah kolom add-on ke tabel `ucapan` (`custom_slug`, `qr_photo_enabled`, `touch_particles`, `gate_type`, `gate_data`, `receipt_enabled`) dan kolom `payments.addons`. |
| `schema_v9.sql` | **Keamanan, referral & batas:** RLS select ucapan → hanya pemilik; trigger mencegah update kolom berbayar (`paid`, `custom_slug`, `gate_data`, dll) oleh non-service_role; bucket `foto` dibatasi 5 MB & tipe gambar; index `gate_type`; multi-invite `referrals` (`drop referrals_code_key`); kolom `payments.credit_used`. |

---

## Catatan Keamanan & Pembayaran

1. **Harga Pembayaran (`payments.amount`):**
   - Kolom `amount` tidak memiliki nilai default.
   - Server aplikasi (`app/api/payment/create/route.ts`) selalu mengisi nilai nominal secara eksplisit (promo Rp8.900 untuk 20 transaksi pertama, atau normal Rp19.000).
2. **Webhook (`app/api/payment/webhook/route.ts`):**
   - Webhook memvalidasi `gross_amount` dari Midtrans terhadap baris `payments.amount` yang tersimpan. Jika nominal tidak cocok, transaksi tidak diaktifkan.
3. **Storage Bucket `foto`:**
   - Ukuran maksimum file: 5MB (`file_size_limit: 5242880`).
   - Tipe MIME diizinkan: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
   - Anonim diizinkan upload foto untuk keperluan pembuatan kartu tanpa harus login lebih dulu.
