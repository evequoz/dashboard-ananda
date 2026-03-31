alter table public.inbox_emails
  add column if not exists deleted_at timestamptz;

alter table public.sent_emails
  add column if not exists deleted_at timestamptz;

create index if not exists idx_inbox_emails_deleted_at on public.inbox_emails(deleted_at);
create index if not exists idx_sent_emails_deleted_at on public.sent_emails(deleted_at);
