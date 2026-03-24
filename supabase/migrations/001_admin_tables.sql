-- Admin tables for UnitLift Admin Dashboard
-- Run this in the Supabase SQL Editor

-- Contact Messages (support inbox)
-- Add this table and update your coaching-app contact form to insert here
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'novo' check (status in ('novo', 'u_obradi', 'rijeseno')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bug Log
create table if not exists public.bug_log (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text not null default 'app.unitlift.com',
  priority text not null default 'srednji' check (priority in ('visok', 'srednji', 'nizak')),
  status text not null default 'otvoren' check (status in ('otvoren', 'u_radu', 'riješen')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admin Notes (ideje)
create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  tag text not null default 'Ostalo',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admin Tasks (zadaci)
create table if not exists public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  priority text not null default 'srednji' check (priority in ('visok', 'srednji', 'nizak')),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mailer Campaigns
create table if not exists public.mailer_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  segment text not null,
  recipient_count integer not null default 0,
  body_preview text,
  sent_at timestamptz not null default now()
);

-- RLS: disable public access, allow only service role
alter table public.contact_messages enable row level security;
alter table public.bug_log enable row level security;
alter table public.admin_notes enable row level security;
alter table public.admin_tasks enable row level security;
alter table public.mailer_campaigns enable row level security;

-- Allow authenticated users (Leon) to access admin tables
create policy "admin_access_contact_messages" on public.contact_messages
  for all using (auth.role() = 'authenticated');

create policy "admin_access_bug_log" on public.bug_log
  for all using (auth.role() = 'authenticated');

create policy "admin_access_admin_notes" on public.admin_notes
  for all using (auth.role() = 'authenticated');

create policy "admin_access_admin_tasks" on public.admin_tasks
  for all using (auth.role() = 'authenticated');

create policy "admin_access_mailer_campaigns" on public.mailer_campaigns
  for all using (auth.role() = 'authenticated');

-- Auto-update updated_at triggers
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contact_messages_updated_at before update on public.contact_messages
  for each row execute function update_updated_at();

create trigger bug_log_updated_at before update on public.bug_log
  for each row execute function update_updated_at();

create trigger admin_notes_updated_at before update on public.admin_notes
  for each row execute function update_updated_at();

create trigger admin_tasks_updated_at before update on public.admin_tasks
  for each row execute function update_updated_at();
