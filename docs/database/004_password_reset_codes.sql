-- Run after 003_password_recovery.sql. Existing accounts and SMTP settings stay unchanged.
begin;
alter table public.password_reset_tokens
 add column if not exists failed_attempts integer not null default 0;
-- Retire old emailed links when moving to the passcode flow.
update public.password_reset_tokens set used_at=now() where used_at is null;
commit;
