-- Apply after 005_donation_photos_receipts.sql in Supabase SQL Editor.
-- The application connects through Spring; no browser access to this table.
create table if not exists donation_messages (
 id bigint generated always as identity primary key,
 donation_id bigint not null references donations(id) on delete cascade,
 sender_id bigint not null references users(id),
 body varchar(2000) not null check (length(trim(body)) > 0),
 created_at timestamp with time zone not null default now()
);
create index if not exists donation_messages_conversation_idx on donation_messages(donation_id,id);
alter table donation_messages enable row level security;
-- No public policies: only the trusted backend database role may access messages.
