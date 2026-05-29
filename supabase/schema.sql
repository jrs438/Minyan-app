-- =========================================================================
-- CBT Minyan App — Database Schema
-- Paste this entire file into Supabase SQL Editor and click Run
-- =========================================================================

-- ========== MEMBERS ==========
create table members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete cascade unique,
  phone text not null unique,
  first_name text not null,
  last_name text not null,
  email text,
  role text not null default 'member' check (role in ('member', 'teen', 'gabbai', 'admin')),
  is_teen boolean generated always as (role = 'teen') stored,
  neighborhood text,
  date_of_birth date,
  member_since_hebrew_year text,
  active boolean not null default true,
  can_be_called boolean not null default false,
  needs_ride_default boolean not null default false,
  offers_ride_default boolean not null default false,
  ride_capacity int default 0,
  notif_commit_reminder boolean not null default true,
  notif_red_alert boolean not null default true,
  notif_ride_request boolean not null default false,
  notif_rewards boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on members (role);
create index on members (active);

-- ========== MINYAN TYPES (shacharit, mincha_maariv, etc.) ==========
create table minyan_types (
  id text primary key, -- 'shacharit', 'mincha_maariv'
  display_name text not null,
  sort_order int not null
);
insert into minyan_types values
  ('shacharit', 'Shacharit', 1),
  ('mincha_maariv', 'Mincha/Maariv', 2);

-- ========== MINYANIM (each scheduled service) ==========
create table minyanim (
  id uuid primary key default gen_random_uuid(),
  service_date date not null,
  minyan_type text not null references minyan_types(id),
  start_time timestamptz not null,
  display_time text not null, -- e.g. "6:42 AM" for UI
  hebrew_date text,
  is_shabbat_or_yomtov boolean not null default false,
  yomtov_name text,
  threshold int not null default 10,
  notes text,
  created_at timestamptz not null default now(),
  unique (service_date, minyan_type)
);
create index on minyanim (service_date);
create index on minyanim (start_time);

-- ========== COMMITMENTS ==========
create table commitments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  minyan_id uuid not null references minyanim(id) on delete cascade,
  status text not null check (status in ('yes', 'no', 'maybe')),
  needs_ride boolean not null default false,
  responded_at timestamptz not null default now(),
  unique (member_id, minyan_id)
);
create index on commitments (minyan_id, status);
create index on commitments (member_id);

-- ========== ATTENDANCE ==========
create table attendance (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  minyan_id uuid not null references minyanim(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_in_by text not null default 'self' check (checked_in_by in ('self', 'gabbai')),
  gabbai_id uuid references members(id),
  points_awarded numeric not null default 0,
  was_rescue boolean not null default false,
  was_sponsored_minyan boolean not null default false,
  unique (member_id, minyan_id)
);
create index on attendance (member_id, checked_in_at);
create index on attendance (minyan_id);

-- ========== POINTS LEDGER (every point event for transparency) ==========
create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  points numeric not null,
  reason text not null, -- 'attendance', 'early_commit', 'streak_bonus', 'gabbai_award', 'redemption', 'adjustment'
  reference_id uuid, -- attendance id, etc.
  description text,
  created_at timestamptz not null default now()
);
create index on points_ledger (member_id, created_at desc);

-- ========== DEDICATIONS (attached to specific minyanim) ==========
create table dedications (
  id uuid primary key default gen_random_uuid(),
  minyan_id uuid references minyanim(id) on delete set null,
  sponsor_member_id uuid references members(id) on delete set null,
  dedication_type text not null check (dedication_type in ('memory', 'honor', 'refuah', 'anniversary', 'other')),
  dedication_text text not null, -- "Moshe ben Avraham, z''l"
  sponsor_display_name text, -- "The Cohen family" or "Anonymous"
  is_yahrzeit boolean not null default false,
  hebrew_date text,
  created_at timestamptz not null default now()
);
create index on dedications (minyan_id);

-- ========== SPONSORSHIPS (payments) ==========
create table sponsorships (
  id uuid primary key default gen_random_uuid(),
  sponsor_member_id uuid references members(id) on delete set null,
  amount_cents int not null,
  currency text not null default 'usd',
  stripe_payment_intent_id text unique,
  stripe_checkout_session_id text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  contribution_type text not null check (contribution_type in ('dedication', 'pool', 'yahrzeit')),
  dedication_id uuid references dedications(id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index on sponsorships (status, paid_at);
create index on sponsorships (sponsor_member_id);

-- ========== POOL STATE (single row, updated on payment / redemption) ==========
create table pool_state (
  id int primary key default 1,
  balance_cents int not null default 0,
  total_sponsors int not null default 0,
  total_contributed_cents int not null default 0,
  total_paid_out_cents int not null default 0,
  updated_at timestamptz not null default now(),
  check (id = 1) -- only one row ever
);
insert into pool_state (id, balance_cents) values (1, 0);

-- ========== REWARDS (configuration + claimed) ==========
create table rewards_config (
  id int primary key default 1,
  points_per_minyan int not null default 8,
  points_per_sponsored_bonus int not null default 4,
  points_per_rescue int not null default 40,
  points_per_streak_7 int not null default 20,
  points_per_streak_30 int not null default 100,
  point_to_cents int not null default 25, -- 1 point = $0.25
  monthly_prize_1_cents int not null default 20000,
  monthly_prize_2_cents int not null default 7500,
  monthly_prize_3_cents int not null default 5000,
  quarterly_prize_cents int not null default 30000,
  streak_30_bonus_cents int not null default 10000,
  min_redemption_points int not null default 80,
  check (id = 1)
);
insert into rewards_config (id) values (1);

create table rewards_claimed (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  amount_cents int not null,
  reason text not null, -- 'monthly_1', 'monthly_2', 'quarterly', 'streak_30', 'redemption'
  period text, -- '2026-03', '2026-Q1'
  notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index on rewards_claimed (member_id);

-- ========== YAHRZEIT TRACKING (for prompts) ==========
create table yahrzeits (
  id uuid primary key default gen_random_uuid(),
  family_member_id uuid not null references members(id) on delete cascade,
  deceased_name text not null, -- "Moshe ben Avraham"
  english_name text, -- optional display
  hebrew_date text not null, -- "14 Adar" — recurring annually
  notes text,
  relationship text, -- 'father', 'mother', etc.
  created_at timestamptz not null default now()
);
create index on yahrzeits (family_member_id);

-- ========== NOTIFICATION LOG (audit trail, prevent duplicates) ==========
create table notifications_sent (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  channel text not null check (channel in ('push', 'sms', 'email')),
  category text not null, -- 'commit_reminder', 'red_alert', 'yahrzeit_prompt', etc.
  reference_id uuid, -- minyan_id, yahrzeit_id, etc.
  body text,
  sent_at timestamptz not null default now(),
  success boolean not null default true,
  error_message text
);
create index on notifications_sent (member_id, sent_at desc);
create index on notifications_sent (category, reference_id);

-- =========================================================================
-- VIEWS — convenience reads
-- =========================================================================

-- Upcoming minyanim with commit counts (drives the home screen)
create or replace view v_upcoming_minyanim as
select
  m.*,
  (select count(*) from commitments c where c.minyan_id = m.id and c.status = 'yes') as yes_count,
  (select count(*) from commitments c where c.minyan_id = m.id and c.status = 'maybe') as maybe_count,
  (select count(*) from commitments c where c.minyan_id = m.id and c.status = 'no') as no_count,
  (select count(*) from commitments c where c.minyan_id = m.id and c.needs_ride = true) as needs_ride_count,
  exists (select 1 from dedications d where d.minyan_id = m.id) as has_dedication,
  (select json_build_object(
    'id', d.id,
    'dedication_text', d.dedication_text,
    'dedication_type', d.dedication_type,
    'sponsor_display_name', d.sponsor_display_name,
    'is_yahrzeit', d.is_yahrzeit
  ) from dedications d where d.minyan_id = m.id limit 1) as dedication
from minyanim m
where m.service_date >= current_date
order by m.start_time;

-- Monthly teen leaderboard
create or replace view v_teen_leaderboard_month as
select
  m.id,
  m.first_name,
  m.last_name,
  sum(pl.points) as points_this_month,
  (select count(*) from attendance a where a.member_id = m.id
    and a.checked_in_at >= date_trunc('month', current_date)) as minyanim_this_month
from members m
left join points_ledger pl on pl.member_id = m.id
  and pl.created_at >= date_trunc('month', current_date)
where m.role = 'teen' and m.active = true
group by m.id
order by points_this_month desc nulls last;

-- Adult recognition (25+ minyanim in current month)
create or replace view v_adult_recognition_month as
select
  m.id, m.first_name, m.last_name,
  (select count(*) from attendance a where a.member_id = m.id
    and a.checked_in_at >= date_trunc('month', current_date)) as attendance_count
from members m
where m.role in ('member', 'gabbai', 'admin') and m.active = true
  and (select count(*) from attendance a where a.member_id = m.id
    and a.checked_in_at >= date_trunc('month', current_date)) >= 15
order by attendance_count desc;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================

alter table members enable row level security;
alter table commitments enable row level security;
alter table attendance enable row level security;
alter table points_ledger enable row level security;
alter table dedications enable row level security;
alter table sponsorships enable row level security;
alter table rewards_claimed enable row level security;
alter table yahrzeits enable row level security;
alter table notifications_sent enable row level security;

-- Helper: is the current user a gabbai/admin? Runs as SECURITY DEFINER so the
-- lookup bypasses RLS on members and does NOT trigger recursive policy checks.
create or replace function public.is_gabbai_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.members
    where auth_user_id = auth.uid()
      and role in ('gabbai', 'admin')
  );
$$;

-- Everyone can read their own member row; gabbaim/admins can read all active members
create policy "members read own" on members for select
  using (auth_user_id = auth.uid() or
    public.is_gabbai_or_admin());

create policy "members update own" on members for update
  using (auth_user_id = auth.uid());

create policy "admins insert members" on members for insert
  with check (public.is_gabbai_or_admin());

-- Commitments — members manage their own, gabbaim read all
create policy "commit own" on commitments for all
  using (member_id in (select id from members where auth_user_id = auth.uid()));

create policy "gabbai read all commitments" on commitments for select
  using (public.is_gabbai_or_admin());

-- Attendance — gabbaim write, all members read (for leaderboards)
create policy "all read attendance" on attendance for select using (true);
create policy "self checkin" on attendance for insert
  with check (member_id in (select id from members where auth_user_id = auth.uid()) and checked_in_by = 'self');
create policy "gabbai checkin" on attendance for all
  using (public.is_gabbai_or_admin());

-- Points ledger — read own or all-for-gabbai
create policy "points read own" on points_ledger for select
  using (member_id in (select id from members where auth_user_id = auth.uid()));
create policy "gabbai all points" on points_ledger for all
  using (public.is_gabbai_or_admin());

-- Dedications and sponsorships — public read (they're meant to be seen)
create policy "all read dedications" on dedications for select using (true);
create policy "own sponsorships" on sponsorships for select
  using (sponsor_member_id in (select id from members where auth_user_id = auth.uid()));
create policy "gabbai all sponsorships" on sponsorships for all
  using (public.is_gabbai_or_admin());

-- Yahrzeits — own or admin
create policy "own yahrzeits" on yahrzeits for all
  using (family_member_id in (select id from members where auth_user_id = auth.uid())
    or public.is_gabbai_or_admin());

-- =========================================================================
-- Lookup / config tables: anyone signed in can read; only a gabbai/admin
-- (or the service role, which bypasses RLS) can change them.
-- =========================================================================

alter table minyanim enable row level security;
create policy "minyanim read" on minyanim for select using (true);
create policy "minyanim gabbai write" on minyanim for all
  using (public.is_gabbai_or_admin()) with check (public.is_gabbai_or_admin());

alter table minyan_types enable row level security;
create policy "minyan_types read" on minyan_types for select using (true);
create policy "minyan_types gabbai write" on minyan_types for all
  using (public.is_gabbai_or_admin()) with check (public.is_gabbai_or_admin());

alter table rewards_config enable row level security;
create policy "rewards_config read" on rewards_config for select using (true);
create policy "rewards_config gabbai write" on rewards_config for all
  using (public.is_gabbai_or_admin()) with check (public.is_gabbai_or_admin());

-- pool_state is only ever written by the service role (Stripe webhook), so no
-- write policy is needed — RLS with just a read policy blocks anon writes.
alter table pool_state enable row level security;
create policy "pool_state read" on pool_state for select using (true);

-- =========================================================================
-- Done. Next: run `npm run dev` after setting up env vars.
-- =========================================================================
