-- Run after 002_verification.sql. Adds password recovery without replacing accounts.
begin;
alter table public.users add column if not exists credential_version integer not null default 0;
create table if not exists public.password_reset_tokens (
 token_hash varchar(64) primary key,
 account_id bigint not null references public.users(id) on delete cascade,
 credential_version integer not null,
 created_at timestamptz not null,
 expires_at timestamptz not null,
 used_at timestamptz
);
create index if not exists idx_password_reset_account_created on public.password_reset_tokens(account_id,created_at);
alter table public.password_reset_tokens enable row level security;
revoke all on public.password_reset_tokens from anon,authenticated;
commit;
