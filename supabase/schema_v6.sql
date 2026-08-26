-- Migrasi schema_v6 (Phase 1): perbaikan RLS, trigger updated_at, konsistensi timeline.
-- Jalankan di Supabase SQL Editor (atau via migration) SETELAH schema.sql + schema_v5.sql.
-- Idempoten di mana memungkinkan (IF NOT EXISTS / CREATE OR REPLACE).

-- ============================================================
-- 1. ucapan: izinkan publik (anon) membaca ucapan lewat link share.
--    Baik Free maupun Paid bisa dilihat penerima tanpa login.
--    ID ucapan berupa UUID (unguessable) sehingga aman dibaca publik.
--    Pembeda Free vs Paid: watermark (ditampilkan di sisi klien saat !paid).
-- ============================================================
create policy if not exists "publik bisa baca ucapan"
  on public.ucapan
  for select
  using (true);

-- ============================================================
-- 2. payments: RLS sudah aktif tapi belum punya policy.
--    Beri akses baca ke pemilik ucapan terkait (join via ucapan_id).
--    (App menulis payment lewat service_role yang membypass RLS.)
-- ============================================================
create policy if not exists "pemilik bisa baca payment"
  on public.payments
  for select
  using (
    exists (
      select 1 from public.ucapan u
      where u.id = payments.ucapan_id
        and u.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 3. views: aktifkan RLS.
--    - anon boleh INSERT (tracking kunjungan, tanpa auth)
--    - pemilik ucapan boleh SELECT agregat kunjungannya
--    Catatan privasi (UU PDP): kolom lat/lng menyimpan lokasi pengunjung.
--    Pertimbangkan tidak mengumpulkan lat/lng presisi tinggi di MVP.
-- ============================================================
alter table public.views enable row level security;

create policy if not exists "anon bisa insert view"
  on public.views
  for insert
  with check (true);

create policy if not exists "pemilik bisa baca views"
  on public.views
  for select
  using (
    exists (
      select 1 from public.ucapan u
      where u.id = views.ucapan_id
        and u.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 4. templates: aktifkan RLS, publik boleh SELECT (katalog).
--    Tidak ada write lewat client (seed dikelola server-side).
-- ============================================================
alter table public.templates enable row level security;

create policy if not exists "publik bisa baca templates"
  on public.templates
  for select
  using (true);

-- ============================================================
-- 5. Trigger updated_at otomatis pada tabel ucapan.
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ucapan_updated_at on public.ucapan;
create trigger trg_ucapan_updated_at
  before update on public.ucapan
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 6. Konsistensi kolom timeline: pastikan ada di tabel ucapan
--    (schema_v5.sql menambahkannya, tapi schema.sql base tidak).
-- ============================================================
alter table public.ucapan
  add column if not exists timeline JSONB default null;

-- ============================================================
-- 7. Reaksi (dua arah): penerima bisa membalas perasaan lewat emoji.
--    Publik (anon) boleh insert + select (ucapan_id unguessable).
-- ============================================================
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  ucapan_id uuid not null references public.ucapan (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now()
);

create index if not exists reactions_ucapan_id_idx
  on public.reactions (ucapan_id);

alter table public.reactions enable row level security;

create policy if not exists "publik bisa baca reactions"
  on public.reactions
  for select
  using (true);

create policy if not exists "publik bisa insert reactions"
  on public.reactions
  for insert
  with check (char_length(emoji) between 1 and 8);

-- ============================================================
-- 8. Balasan (dua arah): penerima bisa membalas ucapan.
--    Publik (anon) boleh insert + select.
-- ============================================================
create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  ucapan_id uuid not null references public.ucapan (id) on delete cascade,
  from_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists replies_ucapan_id_idx
  on public.replies (ucapan_id);

alter table public.replies enable row level security;

create policy if not exists "publik bisa baca replies"
  on public.replies
  for select
  using (true);

create policy if not exists "publik bisa insert replies"
  on public.replies
  for insert
  with check (
    char_length(from_name) between 1 and 60
    and char_length(message) between 1 and 1000
  );
