-- Migrasi schema_v8:
-- 1. Tambah kolom add-on ke tabel ucapan (custom_slug, qr_photo, particles, gate, receipt)
-- 2. Tambah kolom rincian add-on ke tabel payments
-- Idempoten: aman dijalankan berulang.

-- ============================================================
-- 1. ucapan: dukungan add-on monetisasi
-- ============================================================
alter table public.ucapan
  add column if not exists custom_slug varchar(60) unique,
  add column if not exists qr_photo_enabled boolean not null default false,
  add column if not exists touch_particles varchar(30) default null,
  add column if not exists gate_type varchar(20) default null,
  add column if not exists gate_data jsonb default null,
  add column if not exists receipt_enabled boolean not null default false;

create index if not exists ucapan_custom_slug_idx
  on public.ucapan (custom_slug);

-- ============================================================
-- 2. payments: rincian add-on yang dibeli
-- ============================================================
alter table public.payments
  add column if not exists addons jsonb not null default '[]'::jsonb;
