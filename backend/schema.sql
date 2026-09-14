-- Riverside Community Hub — Database Schema
-- Run this once, in full, in a fresh Supabase project's SQL Editor.
-- Safe to re-run individual sections if something fails partway —
-- most statements use IF NOT EXISTS / OR REPLACE where practical.

-- ==========================
-- ENUMS
-- ==========================
create type user_role as enum ('member', 'staff', 'admin');
create type membership_tier as enum ('free', 'standard', 'family');
create type resource_type as enum ('room', 'equipment');
create type booking_status as enum ('pending', 'approved', 'rejected', 'cancelled');

-- ==========================
-- TABLES
-- ==========================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'member',
  membership_tier membership_tier not null default 'free',
  joined_at timestamptz not null default now(),
  contact_email text,
  contact_phone text
);

create table resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type resource_type not null,
  capacity int,
  description text
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references resources(id),
  member_id uuid not null references profiles(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status booking_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint valid_range check (end_time > start_time)
);

-- Prevent double-booking at the DB level (blocks overlaps for
-- non-rejected/cancelled bookings only).
create extension if not exists btree_gist;
alter table bookings add constraint no_overlap
  exclude using gist (
    resource_id with =,
    tstzrange(start_time, end_time) with &&
  ) where (status in ('pending', 'approved'));

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  goal_amount numeric(12,2) not null,
  current_amount numeric(12,2) not null default 0,
  active boolean not null default true
);

create table donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references profiles(id), -- nullable = anonymous
  amount numeric(12,2) not null check (amount > 0),
  campaign_id uuid references campaigns(id),
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ==========================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ==========================
-- With "Confirm email" enabled, the browser has no active session at the
-- moment signUp() is called — auth.uid() is null client-side — so an
-- RLS-guarded insert into `profiles` from the frontend fails. This
-- trigger creates the profile row server-side instead, the instant a new
-- auth.users row appears, bypassing RLS safely (SECURITY DEFINER).
-- The frontend passes full_name as signup metadata for this to read.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, membership_tier)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'member',
    'free'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==========================
-- ROLE-CHECK HELPER (avoids RLS self-recursion)
-- ==========================
-- A policy on `profiles` that queries `profiles` to check the caller's
-- role causes Postgres to recursively re-evaluate RLS on the same table,
-- which errors out as a 500. This function runs the role lookup with
-- elevated privileges internally, sidestepping the recursion.
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role::text from public.profiles where id = auth.uid();
$$;

-- ==========================
-- RLS
-- ==========================
alter table profiles enable row level security;
alter table resources enable row level security;
alter table bookings enable row level security;
alter table campaigns enable row level security;
alter table donations enable row level security;
alter table notifications enable row level security;

-- profiles: users read/update their own; staff/admin read all
create policy "own profile read" on profiles for select using (auth.uid() = id);
create policy "own profile insert" on profiles for insert with check (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);
create policy "staff read all profiles" on profiles for select using (
  public.get_my_role() in ('staff', 'admin')
);

-- resources: public read
create policy "public read resources" on resources for select using (true);
create policy "staff manage resources" on resources for all using (
  public.get_my_role() in ('staff', 'admin')
);

-- bookings: members see/manage only their own; staff/admin see all
create policy "own bookings" on bookings for select using (member_id = auth.uid());
create policy "own booking insert" on bookings for insert with check (member_id = auth.uid());
create policy "own booking cancel" on bookings for update using (member_id = auth.uid());
create policy "staff manage bookings" on bookings for all using (
  public.get_my_role() in ('staff', 'admin')
);

-- donations: insert-open (public/anon allowed), update restricted to admin
create policy "public insert donations" on donations for insert with check (true);
create policy "read own donations" on donations for select using (donor_id = auth.uid());
create policy "admin read all donations" on donations for select using (
  public.get_my_role() = 'admin'
);
create policy "admin update donations" on donations for update using (
  public.get_my_role() = 'admin'
);

-- campaigns: public read, staff/admin write
create policy "public read campaigns" on campaigns for select using (true);
create policy "staff manage campaigns" on campaigns for all using (
  public.get_my_role() in ('staff', 'admin')
);

-- notifications: own only
create policy "own notifications" on notifications for select using (user_id = auth.uid());
create policy "own notifications update" on notifications for update using (user_id = auth.uid());

-- ==========================
-- SEED DATA
-- ==========================
insert into resources (name, type, capacity, description) values
  ('Main Hall', 'room', 80, 'Large multipurpose hall for events and programmes'),
  ('Meeting Room A', 'room', 10, 'Small meeting room for staff/community meetings'),
  ('Youth Room', 'room', 25, 'Dedicated space for youth programmes'),
  ('Yoga Mats (set of 10)', 'equipment', 10, 'Set of yoga mats for gym sessions'),
  ('Sound System', 'equipment', 1, 'Portable PA system for events');

insert into campaigns (title, goal_amount, current_amount, active) values
  ('Winter Food Parcels 2026', 50000, 0, true);
