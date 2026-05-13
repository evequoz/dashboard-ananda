-- Phase 1 : colonnes IMAP / anti-spam + tables comptes & listes
-- + RPC pour user_id propriétaire des lignes inbox (inserts service_role)

-- Colonnes inbox
alter table public.inbox_emails
  add column if not exists message_id text,
  add column if not exists spam_score numeric(5,2) default null,
  add column if not exists spam_category text default null,
  add column if not exists challenge_sent boolean not null default false,
  add column if not exists challenge_responded boolean not null default false,
  add column if not exists uid_imap bigint default null,
  add column if not exists folder text default 'INBOX';

comment on column public.inbox_emails.spam_category is 'spam | newsletter | legitimate | automated | unknown';

create unique index if not exists uq_inbox_message_id
  on public.inbox_emails (message_id)
  where message_id is not null;

create index if not exists idx_inbox_account_uid
  on public.inbox_emails (account_email, uid_imap)
  where deleted_at is null;

-- Comptes IMAP/SMTP (mots de passe = secrets Edge uniquement)
create table if not exists public.email_accounts (
  id serial primary key,
  email text unique not null,
  imap_host text not null default 'mail.infomaniak.com',
  imap_port int not null default 993,
  smtp_host text not null default 'mail.infomaniak.com',
  smtp_port int not null default 587,
  username text not null,
  active boolean not null default true,
  last_sync_at timestamptz default null,
  last_uid_seen bigint not null default 0
);

insert into public.email_accounts (email, username) values
  ('serge@eh-me.com', 'serge@eh-me.com'),
  ('admin@eh-me.com', 'admin@eh-me.com'),
  ('serge@seme.ch', 'serge@seme.ch')
on conflict (email) do nothing;

alter table public.email_accounts enable row level security;

-- Listes expéditeurs
create table if not exists public.email_senders (
  id serial primary key,
  email_pattern text not null,
  status text not null,
  label text,
  created_at timestamptz not null default now(),
  constraint email_senders_email_pattern_key unique (email_pattern),
  constraint email_senders_status_chk check (status in ('whitelist', 'blacklist', 'newsletter'))
);

insert into public.email_senders (email_pattern, status, label) values
  ('@stripe.com', 'whitelist', 'Stripe'),
  ('@infomaniak.com', 'whitelist', 'Infomaniak'),
  ('@systeme.io', 'whitelist', 'Systeme.io'),
  ('@resend.com', 'whitelist', 'Resend')
on conflict (email_pattern) do nothing;

alter table public.email_senders enable row level security;

create policy email_senders_admin_all
  on public.email_senders
  for all
  to authenticated
  using (public.is_dashboard_admin())
  with check (public.is_dashboard_admin());

-- RPC : UUID propriétaire pour inserts Edge (service_role)
create or replace function public.dashboard_inbox_owner_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id
  from auth.users u
  where lower(u.email) = 'serge@eh-me.com'
  limit 1;
$$;

grant execute on function public.dashboard_inbox_owner_user_id() to service_role;
