-- ============================================================
-- PesanManis: Skema Migrasi v9 — Keamanan RLS, Privasi & Integritas Pembayaran
-- Jalankan setelah schema_v8.sql di database yang sudah ada (idempotent).
-- ============================================================

-- 1. Ucapan: kolom draft_addons, recipient_response, voice_note_enabled + partial unique index custom_slug (hanya paid = true)
alter table public.ucapan
  add column if not exists draft_addons jsonb default null,
  add column if not exists recipient_response jsonb default null,
  add column if not exists voice_note_enabled boolean not null default false;

alter table public.ucapan
  drop constraint if exists ucapan_custom_slug_key;

drop index if exists public.ucapan_custom_slug_idx;

create unique index if not exists ucapan_paid_custom_slug_uniq
  on public.ucapan (custom_slug)
  where paid = true and custom_slug is not null;

create index if not exists ucapan_owner_created_idx
  on public.ucapan (owner_id, created_at desc);

create index if not exists ucapan_gate_type_idx
  on public.ucapan (gate_type)
  where gate_type is not null;

-- 2. RLS public.ucapan (TO authenticated + initPlan (select auth.uid()))
drop policy if exists "publik bisa baca ucapan" on public.ucapan;
create policy "publik bisa baca ucapan" on public.ucapan
  for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "pemilik buat ucapan" on public.ucapan;
create policy "pemilik buat ucapan" on public.ucapan
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "pemilik update ucapan" on public.ucapan;
create policy "pemilik update ucapan" on public.ucapan
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "pemilik hapus ucapan" on public.ucapan;
create policy "pemilik hapus ucapan" on public.ucapan
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- 3. Trigger: tolak penyetelan kolom berbayar pada INSERT maupun UPDATE oleh non-service_role
create or replace function public.prevent_paid_columns_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  caller_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  if caller_role is distinct from 'service_role' then
    if new.paid is true
      or new.paid_at is not null
      or new.custom_slug is not null
      or new.qr_photo_enabled is true
      or new.touch_particles is not null
      or new.gate_type is not null
      or new.gate_data is not null
      or new.receipt_enabled is true
      or new.voice_note_enabled is true
      or new.recipient_response is not null
    then
      raise exception 'Kolom berbayar dan add-on hanya bisa diaktifkan oleh sistem';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_paid_columns_insert on public.ucapan;
create trigger trg_prevent_paid_columns_insert
  before insert on public.ucapan
  for each row
  execute function public.prevent_paid_columns_insert();

create or replace function public.prevent_paid_columns_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  caller_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  -- Hanya service_role (webhook, status server, admin) yang boleh ubah kolom ini
  if caller_role is distinct from 'service_role' then
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
    if new.voice_note_enabled is distinct from old.voice_note_enabled then
      raise exception 'Kolom voice_note_enabled hanya bisa diubah oleh sistem';
    end if;
    if new.recipient_response is distinct from old.recipient_response then
      raise exception 'Kolom recipient_response hanya bisa diubah oleh sistem';
    end if;
    if old.paid is true and new.draft_addons is distinct from old.draft_addons then
      raise exception 'Kolom draft_addons tidak boleh diubah setelah pembayaran lunas';
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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 4. Payments: simpan snapshot add-on, harga dasar, promo flag, credit_used, & ON DELETE SET NULL
alter table public.payments
  add column if not exists credit_used bigint not null default 0,
  add column if not exists base_amount bigint,
  add column if not exists is_promo boolean not null default false,
  add column if not exists addon_config jsonb not null default '{}'::jsonb;

-- Backfill transaksi promo lama (sebelum kolom is_promo ada)
update public.payments
set
  is_promo = true,
  base_amount = coalesce(base_amount, 8900)
where status = 'PAID'
  and amount = 8900
  and is_promo = false;

-- Jangan hapus riwayat pembayaran saat ucapan dihapus pemilik
alter table public.payments
  drop constraint if exists payments_ucapan_id_fkey;

alter table public.payments
  add constraint payments_ucapan_id_fkey
  foreign key (ucapan_id) references public.ucapan(id) on delete set null;

create index if not exists payments_ucapan_id_idx
  on public.payments (ucapan_id);

create index if not exists payments_tripay_ref_idx
  on public.payments (tripay_ref)
  where tripay_ref is not null;

create index if not exists payments_status_promo_idx
  on public.payments (status, is_promo)
  where status = 'PAID' and is_promo = true;

drop policy if exists "pemilik bisa baca payment" on public.payments;
create policy "pemilik bisa baca payment" on public.payments
  for select to authenticated
  using (
    exists (
      select 1 from public.ucapan u
      where u.id = payments.ucapan_id
        and u.owner_id = (select auth.uid())
    )
  );

-- 5. Kunci RLS views, reactions, dan replies (baca/tulis publik wajib lewat API Next.js)
drop policy if exists "anon bisa insert view" on public.views;
drop policy if exists "pemilik bisa baca views" on public.views;
create policy "pemilik bisa baca views" on public.views
  for select to authenticated
  using (
    exists (
      select 1 from public.ucapan u
      where u.id = views.ucapan_id
        and u.owner_id = (select auth.uid())
    )
  );

drop policy if exists "publik bisa baca reactions" on public.reactions;
drop policy if exists "publik bisa insert reactions" on public.reactions;
drop policy if exists "pemilik bisa baca reactions" on public.reactions;
create policy "pemilik bisa baca reactions" on public.reactions
  for select to authenticated
  using (
    exists (
      select 1 from public.ucapan u
      where u.id = reactions.ucapan_id
        and u.owner_id = (select auth.uid())
    )
  );

drop policy if exists "publik bisa baca replies" on public.replies;
drop policy if exists "publik bisa insert replies" on public.replies;
drop policy if exists "pemilik bisa baca replies" on public.replies;
create policy "pemilik bisa baca replies" on public.replies
  for select to authenticated
  using (
    exists (
      select 1 from public.ucapan u
      where u.id = replies.ucapan_id
        and u.owner_id = (select auth.uid())
    )
  );

-- 6. Referral multi-invite & Credits idempotency
alter table public.referrals
  drop constraint if exists referrals_code_key;

create unique index if not exists referrals_code_master_idx
  on public.referrals (code)
  where referee_id is null;

create unique index if not exists referrals_referee_unique_idx
  on public.referrals (referee_id)
  where referee_id is not null;

drop policy if exists "pemilik baca referrals" on public.referrals;
create policy "pemilik baca referrals" on public.referrals
  for select to authenticated
  using (referrer_id = (select auth.uid()));

create unique index if not exists credits_user_type_ref_uniq
  on public.credits (user_id, type, reference_id)
  where reference_id is not null;

drop policy if exists "pemilik baca credits" on public.credits;
create policy "pemilik baca credits" on public.credits
  for select to authenticated
  using (user_id = (select auth.uid()));

-- 7. Drafts: tabel penyimpanan draft ucapan antar-perangkat untuk user login
create table if not exists public.drafts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

alter table public.drafts enable row level security;

drop policy if exists "pemilik kelola drafts" on public.drafts;
create policy "pemilik kelola drafts" on public.drafts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 8. Newsletter Subscribers (hanya ditulis oleh server melalui service_role)
create table if not exists public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  email text unique not null,
  source text not null default 'footer',
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

-- 9. Storage bucket 'foto': batas 5 MB, tipe MIME gambar, dan wajib authenticated per folder user
update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
where id = 'foto';

drop policy if exists "anonim upload foto" on storage.objects;
drop policy if exists "pemilik upload foto" on storage.objects;
create policy "pemilik upload foto" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'foto'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "pemilik hapus foto" on storage.objects;
create policy "pemilik hapus foto" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'foto'
    and (
      owner_id = (select auth.uid())::text
      or (storage.foldername(name))[1] = (select auth.uid())::text
    )
  );

-- 9b. Storage bucket 'musik': batas 15 MB, tipe MIME audio (MP3/M4A/WAV/OGG/WebM), wajib authenticated per folder user
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'musik',
  'musik',
  true,
  15728640,
  array['audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/m4a','audio/wav','audio/x-wav','audio/ogg','audio/webm']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 15728640,
  allowed_mime_types = array['audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/m4a','audio/wav','audio/x-wav','audio/ogg','audio/webm'];

drop policy if exists "publik baca musik" on storage.objects;
create policy "publik baca musik" on storage.objects
  for select using (bucket_id = 'musik');

drop policy if exists "pemilik upload musik" on storage.objects;
create policy "pemilik upload musik" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'musik'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "pemilik hapus musik" on storage.objects;
create policy "pemilik hapus musik" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'musik'
    and (
      owner_id = (select auth.uid())::text
      or (storage.foldername(name))[1] = (select auth.uid())::text
    )
  );

-- 10. Realtime Publications (lengkapi views & ucapan dengan reactions & replies untuk Dashboard live)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'views'
  ) then
    alter publication supabase_realtime add table public.views;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ucapan'
  ) then
    alter publication supabase_realtime add table public.ucapan;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reactions'
  ) then
    alter publication supabase_realtime add table public.reactions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'replies'
  ) then
    alter publication supabase_realtime add table public.replies;
  end if;
end $$;
