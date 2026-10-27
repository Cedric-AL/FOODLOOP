-- Apply after the existing migrations. Adds photo evidence and recipient receipts.
begin;
alter table public.food_items add column if not exists photo bytea;
alter table public.donations add column if not exists handover_at timestamptz;
alter table public.donations add column if not exists collection_method text not null default 'RECIPIENT_PICKUP';
alter table public.donation_requests add column if not exists collection_method text not null default 'RECIPIENT_PICKUP';
alter table public.donation_requests add column if not exists collection_notes text;
create table if not exists public.donation_receipts (
 donation_id bigint primary key references public.donations(id),
 recipient_id bigint not null references public.users(id),
 outcome text not null check(outcome in ('ACCEPTED','REPORTED')),
 issue_type text check(issue_type in ('WRONG_ITEM','QUANTITY','CONDITION','OTHER')),
 notes text,
 evidence_photo bytea,
 review_status text not null check(review_status in ('NOT_REQUIRED','PENDING','RESOLVED','DISMISSED')),
 admin_notes text,
 created_at timestamptz not null,
 updated_at timestamptz not null,
 reviewed_at timestamptz,
 reviewed_by bigint references public.users(id),
 check(evidence_photo is null or octet_length(evidence_photo)<=5242880),
 check(outcome<>'REPORTED' or (issue_type is not null and notes is not null and evidence_photo is not null))
);
create index if not exists idx_donation_receipts_review on public.donation_receipts(review_status);
alter table public.donation_receipts enable row level security;
revoke all on public.donation_receipts from anon,authenticated;
commit;
