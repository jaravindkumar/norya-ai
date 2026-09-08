create table if not exists public.demo_verifications (
  id uuid primary key default uuid_generate_v4(),
  email_hash text not null,
  phone text not null,
  code_hash text not null,
  ip_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists demo_verifications_ip_created_idx
  on public.demo_verifications(ip_hash, created_at desc);
create index if not exists demo_verifications_email_created_idx
  on public.demo_verifications(email_hash, created_at desc);

alter table public.demo_verifications enable row level security;
-- No client policies: only server-side service-role routes may access verification secrets.
