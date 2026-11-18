-- Migrasi schema_v7:
-- 1. Hapus default pada payments.amount (wajib eksplisit dari server, promo vs normal)
-- 2. Tambah index performa payments(status, amount) untuk penghitungan kuota promo
-- 3. Tabel referrals, credits, dan checkout_sessions (lengkap dengan RLS)
-- Idempoten: aman dijalankan berulang.

-- ============================================================
-- 1. payments: hapus default 8900
-- ============================================================
alter table public.payments
  alter column amount drop default;

-- Index untuk getActivePrice() yang menghitung transaksi promo berstatus PAID
create index if not exists payments_status_amount_idx
  on public.payments (status, amount);

-- ============================================================
-- 2. referrals: tabel kode referral pengguna
-- ============================================================
create table if not exists public.referrals (
  id bigint generated always as identity primary key,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referee_id uuid references auth.users(id) on delete set null,
  code text unique not null,
  status text not null default 'pending',
  reward_amount bigint not null default 2000,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists referrals_referrer_idx
  on public.referrals (referrer_id);

create index if not exists referrals_code_idx
  on public.referrals (code);

alter table public.referrals enable row level security;

drop policy if exists "pemilik baca referrals" on public.referrals;
create policy "pemilik baca referrals" on public.referrals
  for select
  using (referrer_id = auth.uid());

-- ============================================================
-- 3. credits: saldo reward referral pengguna
-- ============================================================
create table if not exists public.credits (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount bigint not null,
  type text not null default 'referral',
  reference_id bigint,
  created_at timestamptz not null default now()
);

create index if not exists credits_user_idx
  on public.credits (user_id);

alter table public.credits enable row level security;

drop policy if exists "pemilik baca credits" on public.credits;
create policy "pemilik baca credits" on public.credits
  for select
  using (user_id = auth.uid());

-- ============================================================
-- 4. checkout_sessions: pelacakan keranjang untuk abandoned cart recovery
-- ============================================================
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
-- Service role membypass RLS untuk cron dan webhook
