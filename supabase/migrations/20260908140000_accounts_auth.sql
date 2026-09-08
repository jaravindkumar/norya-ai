create extension if not exists "uuid-ossp";

create table if not exists public.accounts (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_name text,
  plan text not null default 'trial',
  status text not null default 'trialing',
  minutes_included int not null default 30,
  minutes_used numeric not null default 0,
  trial_ends_at timestamptz default (now() + interval '14 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now()
);
create index if not exists accounts_owner_idx on public.accounts(owner_id);
create unique index if not exists accounts_stripe_cust_idx
  on public.accounts(stripe_customer_id) where stripe_customer_id is not null;

create table if not exists public.agents (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  industry text,
  services text,
  opening_hours text,
  greeting text,
  voice_id text,
  elevenlabs_agent_id text,
  phone_number_id text,
  phone_number text,
  provisioning_state text not null default 'pending',
  last_error text,
  created_at timestamptz default now()
);
create index if not exists agents_account_idx on public.agents(account_id);

create table if not exists public.calls (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid references public.accounts(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  conversation_id text unique,
  call_sid text,
  direction text,
  from_number text,
  to_number text,
  duration_seconds int default 0,
  transcript jsonb,
  summary text,
  outcome text,
  data_fields jsonb,
  created_at timestamptz default now()
);
create index if not exists calls_account_idx on public.calls(account_id, created_at desc);

create table if not exists public.demo_calls (
  id uuid primary key default uuid_generate_v4(),
  phone_hash text not null,
  email_hash text,
  ip_hash text,
  verified_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists demo_phone_idx on public.demo_calls(phone_hash, created_at desc);
create index if not exists demo_ip_idx on public.demo_calls(ip_hash, created_at desc);

alter table public.accounts enable row level security;
alter table public.agents enable row level security;
alter table public.calls enable row level security;
alter table public.demo_calls enable row level security;

create policy "own account" on public.accounts for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "own agents" on public.agents for all
  using (account_id in (select id from public.accounts where owner_id = (select auth.uid())))
  with check (account_id in (select id from public.accounts where owner_id = (select auth.uid())));
create policy "own calls" on public.calls for select
  using (account_id in (select id from public.accounts where owner_id = (select auth.uid())));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.accounts (owner_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
