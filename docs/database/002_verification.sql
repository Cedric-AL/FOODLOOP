-- Apply ONCE after the initial schema you already ran. Does not recreate your tables.
begin;
create table if not exists verification_applications (
 id bigint generated always as identity primary key,
 user_id bigint not null unique references users(id) on delete cascade,
 organization_name text not null,
 legal_document bytea not null check(octet_length(legal_document)<=5242880),
 identity_document bytea not null check(octet_length(identity_document)<=5242880),
 status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED')),
 review_notes text,
 reviewed_by bigint references users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
alter table verification_applications enable row level security;
revoke all on verification_applications from anon, authenticated;
-- Existing public Data API tables keep their RLS-with-no-policies configuration.
-- Documents are private database bytes, never public URLs or web-server files.
commit;
