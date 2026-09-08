alter table public.agents
  add column if not exists business_name text,
  add column if not exists address text,
  add column if not exists existing_phone text,
  add column if not exists language text not null default 'en-GB',
  add column if not exists phone_mode text,
  add column if not exists carrier text,
  add column if not exists onboarding_step int not null default 1;
