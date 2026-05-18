alter table public.sent_emails
  add column if not exists reply_to_email_id bigint references public.inbox_emails(id) on delete set null;

create index if not exists idx_sent_emails_reply_to_inbox
  on public.sent_emails(reply_to_email_id)
  where reply_to_email_id is not null;
