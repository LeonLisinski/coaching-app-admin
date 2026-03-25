-- Admin Vault table
create table if not exists public.admin_vault (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null default 'link', -- 'link' | 'auth' | 'api' | 'note'
  url text,
  username text,
  password text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.admin_vault enable row level security;

create policy "Admin full access to vault"
  on public.admin_vault
  for all
  using (true)
  with check (true);
