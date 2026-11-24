<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Panduan AI Agent PesanManis

## 1. Ringkasan Proyek
**PesanManis** adalah platform SaaS ucapan digital interaktif Indonesia (love letter, birthday, anniversary, permintaan maaf) dengan model *once-paid active forever*. Pengguna memilih template interaktif/naratif, menulis surat serta mengunggah foto/musik/video dengan *Live Preview*, lalu membayar via Midtrans Snap (QRIS & e-wallet) untuk mengaktifkan link publik (`/t/[slug]/[id]` atau `/u/[customSlug]`) dan QR Code. Aplikasi mendukung **Demo Mode** otomatis (`localStorage`) ketika environment variable Supabase/Midtrans belum diisi, dan **Remote Production Mode** ketika terkoneksi ke Supabase & Midtrans.

## 2. Tech Stack & Perintah Penting
- **Framework:** Next.js `16.3.1` (App Router, Turbopack, `proxy.ts` menggantikan `middleware.ts`), React `19.2.8`, TypeScript `5`.
- **Styling & Animasi:** Tailwind CSS `v4` (`@tailwindcss/postcss`, konfigurasi `@theme` di `app/globals.css`), Framer Motion `13.1.0`, GSAP `3.15.1`, Lenis `1.3.28` (`lenis/react` smooth scroll tersinkron ke `gsap.ticker`), Lucide React.
- **Backend & Storage:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`) — Auth (Google OAuth & Magic Link OTP), Postgres + RLS, Storage bucket `foto`.
- **Pembayaran, Email & Rate Limit:** Midtrans Snap REST API (`lib/midtrans.ts`), Resend (`lib/email.ts`), Upstash Redis (`lib/rate-limit.ts` dengan fallback in-memory).
- **Perintah Utama:**
  - `npm run dev` — Menjalankan dev server lokal (`http://localhost:3000`).
  - `npx tsc --noEmit` — Typecheck seluruh codebase tanpa emit file.
  - `npm test` — Menjalankan unit test Node native (`node --test --experimental-strip-types test/pricing-and-payment.test.ts test/story-flow.test.ts`).
  - `npm run lint` — Menjalankan ESLint (`eslint.config.mjs`).
  - `npm run build` — Membuat production build Next.js.

## 3. Konvensi & Aturan Coding
- **Next.js 16 Dynamic Params:** `params` dan `searchParams` di App Router page/route handler bertipe `Promise<...>` dan wajib di-`await`.
- **Pemisahan Client vs Server:**
  - Modul yang memakai secret key (`lib/supabase/admin.ts`, `lib/pricing-server.ts`) hanya boleh dipanggil di Server Component atau Route Handler.
  - `lib/pricing.ts` adalah *single source of truth* konstanta harga & kalkulasi add-on; jangan pernah mengimpor client Supabase di dalamnya karena dipakai bersama oleh client & server.
- **Dual-Mode Compatibility (`isRemote()`):** Setiap fitur baru di Builder/Checkout/PublicView wajib mengecek `isRemote()` (`lib/supabase/config.ts`) agar mode demo lokal tetap berfungsi tanpa error saat env Supabase tidak tersedia.
- **Pendaftaran Template Baru:**
  1. Buat komponen template di `components/templates/` yang menerima `TemplateRenderProps` (`{ content, preview }`).
  2. Teruskan prop `preview` ke `TemplateShell` (atau tangani sendiri jika `hasNarrative: true`) agar elemen `fixed` (`CassettePlayer`, `SfxToggle`) dan `CursorTrail` tidak bocor keluar frame Live Preview Builder.
  3. Daftarkan lazy import di `components/templates/registry.tsx`, tambahkan metadata di `lib/templates.ts`, dan tambahkan slug ke `VALID_TEMPLATE_SLUGS` di `lib/supabase/rows.ts`.
- **Penyimpanan Metadata Backward-Compatible:** Field `mood` dan `videoUrl` diserialisasi ke dalam array JSONB `timeline` dengan marker `{ __pm_meta__: "v1", mood, videoUrl }` melalui `toUcapanRow()` dan diekstrak kembali oleh `mapUcapanRow()` di `lib/supabase/rows.ts`.
- **Privasi Publik (`stripPublicUcapan`):** Saat merender halaman publik (`/t/` atau `/u/`) menggunakan `createAdminClient()`, selalu bungkus data dengan `stripPublicUcapan()` agar `email` pembuat dan `gateData.pin` tidak pernah bocor ke client payload.

## 4. Larangan Eksplisit (Do Not)
- **JANGAN** memasang dependency npm baru tanpa persetujuan eksplisit user.
- **JANGAN** menghapus blok `<!-- BEGIN:nextjs-agent-rules -->` di bagian atas file ini.
- **JANGAN** membuka kembali RLS `SELECT` publik langsung ke tabel `public.ucapan` atau mengizinkan client mengupdate kolom `paid`, `paid_at`, `custom_slug`, `qr_photo_enabled`, `touch_particles`, `gate_type`, `gate_data`, `receipt_enabled` pada ucapan yang sudah `paid = true` (dilindungi trigger `prevent_paid_columns_update`).
- **JANGAN** menyalakan kembali bypass aktivasi pembayaran langsung dari `PUT /api/ucapan/[id]`; status `paid = true` di produksi hanya boleh diaktifkan oleh `/api/payment/webhook` atau verifikasi server `/api/payment/status`.
- **JANGAN** mengedit file migrasi lama (`schema.sql` s/d `schema_v8.sql`); setiap perubahan skema harus dikonsolidasikan di migrasi terbaru (`supabase/schema_v9.sql`) dan disinkronkan ke `supabase/setup-production.sql`.
- **JANGAN** mengubah atau menyentuh aset/kode template `bonceng-malam` (`BoncengMalam*.tsx`, `public/rive-assets/`) kecuali diminta secara spesifik oleh user.

## 5. Referensi Dokumentasi Inti
Bacalah dokumen berikut di folder `docs/` sesuai konteks tugas sebelum menulis kode:
1. **`docs/PRD.md`** — Wajib dibaca saat menambah fitur produk, mengubah user flow Builder/Checkout/Dashboard, aturan harga promo/normal, paket bundling add-on, aturan referral/credits, atau mengecek status fitur yang masih WIP.
2. **`docs/DESIGN_SYSTEM.md`** — Wajib dibaca saat membuat atau memodifikasi komponen UI, halaman baru, template ucapan, dark mode, mode immersive (`html[data-immersive]`), kartu kertas terang (`[data-light-card]`), tipografi, atau animasi.
3. **`docs/ARCHITECTURE.md`** — Wajib dibaca saat menyentuh Route Handlers (`app/api/*`), autentikasi Supabase, RLS & skema database, Midtrans webhook/status, cron *abandoned cart*, rate limiting, atau konfigurasi environment variables.
4. **`docs/templates-research.md`** — Wajib dibaca saat merancang atau mengimplementasikan template naratif berbasis `NarrativeEngine`.
