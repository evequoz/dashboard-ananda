alter table public.inbox_emails
  add column if not exists linked_task_id bigint references public.tasks(id) on delete set null,
  add column if not exists converted_to_task boolean not null default false,
  add column if not exists converted_at timestamptz;

alter table public.tasks
  add column if not exists source_email_id bigint references public.inbox_emails(id) on delete set null;

create unique index if not exists uq_tasks_source_email_id
  on public.tasks(source_email_id)
  where source_email_id is not null;

create index if not exists idx_inbox_emails_linked_task_id on public.inbox_emails(linked_task_id);
create index if not exists idx_inbox_emails_converted_to_task on public.inbox_emails(converted_to_task);

