-- ============================================================
-- PesanManis: Skema Migrasi v9 — Keamanan RLS & Batas Bucket
-- Jalankan setelah schema_v8.sql di database yang sudah ada.
-- ============================================================

-- 1. RLS: Publik tidak boleh baca seluruh tabel ucapan (strip email & gate_data)
drop policy if exists "publik bisa baca ucapan" on public.ucapan;
create policy "publik bisa baca ucapan" on public.ucapan
  for select using (auth.uid() = owner_id);

-- 2. RLS: Tambah with check pada update + trigger pengaman kolom berbayar
drop policy if exists "pemilik update ucapan" on public.ucapan;
create policy "pemilik update ucapan" on public.ucapan
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Trigger: tolak perubahan kolom berbayar kecuali service_role
create or replace function public.prevent_paid_columns_update()
returns trigger
language plpgsql
security definer
as $$
declare
  caller_role text := current_setting('request.jwt.claim.role', true);
begin
  -- Hanya service_role (webhook, admin) yang boleh ubah kolom ini
  if caller_role <> 'service_role' then
    if new.paid is distinct from old.paid then
      raise exception 'Kolom paid hanya bisa diubah oleh sistem';
    end if;
    if new.paid_at is distinct from old.paid_at then
      raise exception 'Kolom paid_at hanya bisa diubah oleh sistem';
    end if;
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Kolom owner_id tidak boleh diubah';
    end if;
    if new.custom_slug is distinct from old.custom_slug then
      raise exception 'Kolom custom_slug hanya bisa diubah oleh sistem';
    end if;
    if new.qr_photo_enabled is distinct from old.qr_photo_enabled then
      raise exception 'Kolom qr_photo_enabled hanya bisa diubah oleh sistem';
    end if;
    if new.touch_particles is distinct from old.touch_particles then
      raise exception 'Kolom touch_particles hanya bisa diubah oleh sistem';
    end if;
    if new.gate_type is distinct from old.gate_type then
      raise exception 'Kolom gate_type hanya bisa diubah oleh sistem';
    end if;
    if new.gate_data is distinct from old.gate_data then
      raise exception 'Kolom gate_data hanya bisa diubah oleh sistem';
    end if;
    if new.receipt_enabled is distinct from old.receipt_enabled then
      raise exception 'Kolom receipt_enabled hanya bisa diubah oleh sistem';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_paid_columns_update on public.ucapan;
create trigger trg_prevent_paid_columns_update
  before update on public.ucapan
  for each row
  execute function public.prevent_paid_columns_update();

-- 3. Storage bucket 'foto': batas 5 MB & tipe MIME gambar
update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
where id = 'foto';

-- 4. Opsional: index untuk performa verifikasi gate
create index if not exists ucapan_gate_type_idx on public.ucapan (gate_type) where gate_type is not null;

-- 5. Referral multi-invite: izinkan satu kode referral dipakai oleh beberapa teman
--    (1 baris master dengan referee_id IS NULL per referrer, dan 1 baris per referee_id)
alter table public.referrals
  drop constraint if exists referrals_code_key;

create unique index if not exists referrals_code_master_idx
  on public.referrals (code)
  where referee_id is null;

create unique index if not exists referrals_referee_unique_idx
  on public.referrals (referee_id)
  where referee_id is not null;

-- 6. Payments: simpan nominal saldo referral (credits) yang dipakai saat checkout
alter table public.payments
  add column if not exists credit_used bigint not null default 0;

-- 7. Catatan: Halaman publik (/t/..., /u/...) sekarang harus menggunakan
--    createAdminClient() di Server Component dan melakukan strip email/gate_data
--    sebelum mengirim ke client.