create table if not exists public.calendar_connections (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  provider text not null default 'google',
  refresh_token_encrypted text not null,
  calendar_id text not null default 'primary',
  connected_at timestamptz not null default now(),
  unique(account_id, provider)
);
alter table public.calendar_connections enable row level security;
-- Intentionally no client policies. Only service-role server routes can access encrypted tokens.
