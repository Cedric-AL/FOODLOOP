create table if not exists users (
  id                bigint generated always as identity primary key,
  email             text not null unique,
  password_hash     text not null,  -- store a BCrypt hash only, never a plain password
  first_name        text not null,
  last_name         text not null,
  organization_name text,
  phone             text,
  role              text not null check (role in ('DONOR', 'RECIPIENT', 'ADMIN')),
  location          text,           -- barangay / city / address (plain text for now)
  verified          boolean not null default false,
  created_at        timestamp with time zone not null default now(),
  updated_at        timestamp with time zone not null default now()
);

-- ---------- 2. RECIPIENT NEEDS (used by donation matching) ----------
create table if not exists recipient_needs (
  id              bigint generated always as identity primary key,
  recipient_id    bigint not null references users(id) on delete cascade,
  category        text not null,
  description     text,
  quantity_needed numeric(10,2),
  unit            text,
  active          boolean not null default true,
  created_at      timestamp with time zone not null default now(),
  updated_at      timestamp with time zone not null default now()
);

-- ---------- 3. FOOD ITEMS (surplus food submitted by donors) ----------
create table if not exists food_items (
  id                    bigint generated always as identity primary key,
  donor_id              bigint not null references users(id),
  title                 text not null,
  description           text,
  category              text not null,
  quantity              numeric(10,2) not null check (quantity > 0),
  unit                  text not null,
  expiry_date           date not null,
  date_type             text not null default 'BEST_BEFORE'
                          check (date_type in ('EXPIRATION', 'BEST_BEFORE')),
  food_condition        text,       -- screening input
  packaging_condition   text,       -- screening input
  storage_info          text,       -- screening input
  pickup_location       text not null,
  pickup_available_from  timestamp with time zone,
  pickup_available_until timestamp with time zone,
  notes                 text,
  screening_status      text not null default 'PENDING'
                          check (screening_status in ('PENDING', 'PASSED', 'FAILED')),
  screening_notes       text,
  created_at            timestamp with time zone not null default now(),
  updated_at            timestamp with time zone not null default now()
);

-- ---------- 4. DONATIONS (tracks the lifecycle of one food item) ----------
-- recipient_id stays NULL until a request is confirmed by the donor.
create table if not exists donations (
  id               bigint generated always as identity primary key,
  food_item_id     bigint not null unique references food_items(id),
  recipient_id     bigint references users(id),
  status           text not null default 'SUBMITTED'
                     check (status in ('SUBMITTED', 'UNDER_REVIEW', 'AVAILABLE',
                                       'MATCHED', 'SCHEDULED_FOR_PICKUP', 'COMPLETED',
                                       'CANCELLED')),
  scheduled_pickup timestamp with time zone,
  completed_at     timestamp with time zone,
  notes            text,
  created_at       timestamp with time zone not null default now(),
  updated_at       timestamp with time zone not null default now()
);

-- ---------- 5. DONATION REQUESTS (recipients ask, donors confirm) ----------
create table if not exists donation_requests (
  id           bigint generated always as identity primary key,
  donation_id  bigint not null references donations(id) on delete cascade,
  recipient_id bigint not null references users(id),
  status       text not null default 'PENDING'
                 check (status in ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  message      text,
  created_at   timestamp with time zone not null default now(),
  updated_at   timestamp with time zone not null default now(),
  unique (donation_id, recipient_id)
);


alter table users add column if not exists created_at timestamp with time zone default current_timestamp;
create table if not exists verification_applications (
 id bigint generated always as identity primary key,
 user_id bigint not null unique references users(id) on delete cascade,
 organization_name text not null,
 legal_document bytea not null check(octet_length(legal_document)<=5242880),
 identity_document bytea not null check(octet_length(identity_document)<=5242880),
 status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED')),
 review_notes text,
 reviewed_by bigint references users(id),
 reviewed_at timestamp with time zone,
 created_at timestamp with time zone not null default now()
);
