-- ============================================================
-- PesanManis: Skema Konsolidasi Produksi Penuh
-- Jalankan skrip ini sekali di Supabase SQL Editor pada database baru.
-- Sudah mencakup:
--   - Tabel templates, ucapan, payments, views, reactions, replies
--   - Tabel referrals, credits, checkout_sessions, drafts, newsletter_subscribers
--   - Storage bucket 'foto' + storage policies (authenticated per folder user)
--   - RLS ketat, Realtime publication, ucapan_stats view, trigger pengaman & updated_at
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- 1. Templates
create table if not exists public.templates (
  id bigint generated always as identity primary key,
  slug text unique not null,
  name text not null,
  type text not null,
  description text,
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.templates enable row level security;
drop policy if exists "publik baca templates" on public.templates;
create policy "publik baca templates" on public.templates for select using (true);

-- 2. Ucapan
create table if not exists public.ucapan (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  template_slug text not null,
  to_name text not null default 'Sayang',
  from_name text not null default 'Kesayanganmu',
  title text not null default 'Untuk Kamu',
  message text not null default '',
  photos text[] default '{}',
  music_url text,
  paid boolean not null default false,
  paid_at timestamptz,
  email text,
  timeline jsonb default null,
  draft_addons jsonb default null,
  custom_slug varchar(60),
  qr_photo_enabled boolean not null default false,
  touch_particles varchar(30) default null,
  gate_type varchar(20) default null,
  gate_data jsonb default null,
  receipt_enabled boolean not null default false,
  voice_note_enabled boolean not null default false,
  extra_photos_enabled boolean not null default false,
  local_video_enabled boolean not null default false,
  recipient_response jsonb default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ucapan enable row level security;

create unique index if not exists ucapan_paid_custom_slug_uniq
  on public.ucapan (custom_slug)
  where paid = true and custom_slug is not null;

create index if not exists ucapan_owner_created_idx
  on public.ucapan (owner_id, created_at desc);

create index if not exists ucapan_gate_type_idx
  on public.ucapan (gate_type)
  where gate_type is not null;

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

-- Trigger: tolak penyetelan kolom berbayar saat INSERT oleh non-service_role
create or replace function public.prevent_paid_columns_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  caller_role text := coalesce(
    nullif(auth.role(), ''),
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    ''
  );
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
      or new.extra_photos_enabled is true
      or new.local_video_enabled is true
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

-- Trigger: tolak perubahan kolom berbayar kecuali service_role
create or replace function public.prevent_paid_columns_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  caller_role text := coalesce(
    nullif(auth.role(), ''),
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    ''
  );
begin
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
    if new.extra_photos_enabled is distinct from old.extra_photos_enabled then
      raise exception 'Kolom extra_photos_enabled hanya bisa diubah oleh sistem';
    end if;
    if new.local_video_enabled is distinct from old.local_video_enabled then
      raise exception 'Kolom local_video_enabled hanya bisa diubah oleh sistem';
    end if;
    if new.recipient_response is distinct from old.recipient_response then
      raise exception 'Kolom recipient_response hanya bisa diubah oleh sistem';
    end if;
    if old.paid is true and new.template_slug is distinct from old.template_slug then
      raise exception 'Kolom template_slug tidak boleh diubah setelah pembayaran lunas';
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

-- Trigger updated_at
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

drop trigger if exists trg_ucapan_updated_at on public.ucapan;
create trigger trg_ucapan_updated_at
  before update on public.ucapan
  for each row
  execute function public.set_updated_at();

-- 3. Payments
create table if not exists public.payments (
  id bigint generated always as identity primary key,
  ucapan_id uuid references public.ucapan(id) on delete set null,
  merchant_ref text unique not null,
  method text,
  amount bigint not null, -- tanpa default, wajib diisi server
  base_amount bigint,
  is_promo boolean not null default false,
  status text not null default 'UNPAID',
  tripay_ref text,
  addons jsonb not null default '[]'::jsonb,
  addon_config jsonb not null default '{}'::jsonb,
  credit_used bigint not null default 0,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists payments_ucapan_id_idx
  on public.payments (ucapan_id);

create index if not exists payments_status_amount_idx
  on public.payments (status, amount);

create index if not exists payments_status_promo_idx
  on public.payments (status, is_promo)
  where status = 'PAID' and is_promo = true;

create index if not exists payments_merchant_ref_idx
  on public.payments (merchant_ref);

create index if not exists payments_tripay_ref_idx
  on public.payments (tripay_ref)
  where tripay_ref is not null;

alter table public.payments enable row level security;

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

-- 4. Views (Tracking kunjungan — insert publik hanya lewat API Next.js)
create table if not exists public.views (
  id bigint generated always as identity primary key,
  ucapan_id uuid references public.ucapan(id) on delete cascade,
  lat double precision,
  lng double precision,
  duration_seconds int default 0,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create index if not exists views_ucapan_id_idx on public.views (ucapan_id);

alter table public.views enable row level security;

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

-- 5. Reactions (Interaksi emoji — akses publik wajib lewat API Next.js)
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  ucapan_id uuid not null references public.ucapan(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now()
);

create index if not exists reactions_ucapan_id_idx on public.reactions (ucapan_id);

alter table public.reactions enable row level security;

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

-- 6. Replies (Balasan pesan — akses publik wajib lewat API Next.js)
create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  ucapan_id uuid not null references public.ucapan(id) on delete cascade,
  from_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists replies_ucapan_id_idx on public.replies (ucapan_id);

alter table public.replies enable row level security;

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

-- 7. Referrals
create table if not exists public.referrals (
  id bigint generated always as identity primary key,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referee_id uuid references auth.users(id) on delete set null,
  code text not null,
  status text not null default 'pending',
  reward_amount bigint not null default 2000,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.referrals drop constraint if exists referrals_code_key;
create index if not exists referrals_referrer_idx on public.referrals (referrer_id);
create index if not exists referrals_code_idx on public.referrals (code);
create unique index if not exists referrals_code_master_idx
  on public.referrals (code) where referee_id is null;
create unique index if not exists referrals_referee_unique_idx
  on public.referrals (referee_id) where referee_id is not null;

alter table public.referrals enable row level security;

drop policy if exists "pemilik baca referrals" on public.referrals;
create policy "pemilik baca referrals" on public.referrals
  for select to authenticated
  using (referrer_id = (select auth.uid()));

-- 8. Credits
create table if not exists public.credits (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount bigint not null,
  type text not null default 'referral',
  reference_id bigint,
  created_at timestamptz not null default now()
);

create index if not exists credits_user_idx on public.credits (user_id);
create unique index if not exists credits_user_type_ref_uniq
  on public.credits (user_id, type, reference_id)
  where reference_id is not null;

alter table public.credits enable row level security;

drop policy if exists "pemilik baca credits" on public.credits;
create policy "pemilik baca credits" on public.credits
  for select to authenticated
  using (user_id = (select auth.uid()));

-- 9. Checkout Sessions (Abandoned cart)
create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  ucapan_id uuid not null references public.ucapan(id) on delete cascade,
  email text,
  started_at timestamptz not null default now(),
  recovery_email_sent boolean not null default false,
  recovery_sent_at timestamptz,
  recovered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists checkout_sessions_recovery_idx
  on public.checkout_sessions (recovery_email_sent, started_at);
create index if not exists checkout_sessions_ucapan_idx
  on public.checkout_sessions (ucapan_id);

alter table public.checkout_sessions enable row level security;

-- 9b. Drafts (sinkronisasi draft Builder antar-perangkat)
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

-- 9c. Newsletter Subscribers
create table if not exists public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  email text unique not null,
  source text not null default 'footer',
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

-- 10. Realtime Publications
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

-- 11. View ucapan_stats (Security Invoker)
drop view if exists public.ucapan_stats;
create view public.ucapan_stats
with (security_invoker = true)
as
select
  u.id as ucapan_id,
  count(v.id) as total_views,
  min(v.first_seen) as first_view_at,
  max(v.last_seen) as last_view_at
from public.ucapan u
left join public.views v on v.ucapan_id = u.id
group by u.id;

-- 12. Storage Bucket 'foto'
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foto', 'foto', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "publik baca foto" on storage.objects;
create policy "publik baca foto" on storage.objects
  for select using (bucket_id = 'foto');

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

-- 12b. Storage Bucket 'musik' (upload audio pengguna maks 15 MB)
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
