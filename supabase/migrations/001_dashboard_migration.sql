create type public.task_status as enum ('À faire', 'En cours', 'Fait');
create type public.task_priority as enum ('Basse', 'Normale', 'Haute');
create type public.task_recurrence as enum ('Aucune', 'Quotidienne', 'Hebdomadaire', 'Mensuelle');
create type public.movement_type as enum ('Entrée', 'Dépense');
create type public.contact_category as enum ('Fournisseur', 'Partenaire', 'Admin', 'Comptable', 'Autre');

create or replace function public.is_dashboard_admin()
returns boolean
language sql
stable
as $$
  select
    coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    or lower(coalesce(auth.jwt() ->> 'email', '')) in ('serge@eh-me.com', 'admin@eh-me.com');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.tasks (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  description text,
  project text,
  priority public.task_priority default 'Normale',
  status public.task_status default 'À faire',
  recurrence public.task_recurrence default 'Aucune',
  done boolean default false,
  due_date date,
  done_date date,
  parent_task_id bigint references public.tasks(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.inbox_emails (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  subject text,
  sender text,
  received_at timestamptz,
  ai_summary text,
  content text,
  action_required boolean default false,
  processed boolean default false,
  account_email text,
  reply_1 text,
  reply_2 text,
  reply_3 text,
  has_attachment boolean default false,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.sent_emails (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  from_email text,
  to_emails text,
  cc text,
  bcc text,
  subject text,
  body text,
  sent_at timestamptz default now(),
  account_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.admin_contacts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  first_name text,
  last_name text,
  email text unique not null,
  phone text,
  company text,
  category public.contact_category,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.finance_entries (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  invoice_date date not null,
  payment_date date,
  label text not null,
  amount numeric(12,2) not null,
  type public.movement_type not null,
  source text,
  category text,
  notes text,
  validated boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.budget_items (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  label text not null,
  monthly_amount numeric(12,2) not null,
  active boolean default true,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.posts_admin (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  status text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.formations_admin (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tasks enable row level security;
alter table public.inbox_emails enable row level security;
alter table public.sent_emails enable row level security;
alter table public.admin_contacts enable row level security;
alter table public.finance_entries enable row level security;
alter table public.budget_items enable row level security;
alter table public.posts_admin enable row level security;
alter table public.formations_admin enable row level security;

create policy tasks_owner_or_admin on public.tasks for all to authenticated using (user_id = auth.uid() or public.is_dashboard_admin()) with check (user_id = auth.uid() or public.is_dashboard_admin());
create policy inbox_owner_or_admin on public.inbox_emails for all to authenticated using (user_id = auth.uid() or public.is_dashboard_admin()) with check (user_id = auth.uid() or public.is_dashboard_admin());
create policy sent_owner_or_admin on public.sent_emails for all to authenticated using (user_id = auth.uid() or public.is_dashboard_admin()) with check (user_id = auth.uid() or public.is_dashboard_admin());
create policy contacts_owner_or_admin on public.admin_contacts for all to authenticated using (user_id = auth.uid() or public.is_dashboard_admin()) with check (user_id = auth.uid() or public.is_dashboard_admin());
create policy finance_owner_or_admin on public.finance_entries for all to authenticated using (user_id = auth.uid() or public.is_dashboard_admin()) with check (user_id = auth.uid() or public.is_dashboard_admin());
create policy budget_owner_or_admin on public.budget_items for all to authenticated using (user_id = auth.uid() or public.is_dashboard_admin()) with check (user_id = auth.uid() or public.is_dashboard_admin());
create policy posts_owner_or_admin on public.posts_admin for all to authenticated using (user_id = auth.uid() or public.is_dashboard_admin()) with check (user_id = auth.uid() or public.is_dashboard_admin());
create policy formations_owner_or_admin on public.formations_admin for all to authenticated using (user_id = auth.uid() or public.is_dashboard_admin()) with check (user_id = auth.uid() or public.is_dashboard_admin());

create trigger trg_tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger trg_inbox_updated_at before update on public.inbox_emails for each row execute function public.set_updated_at();
create trigger trg_sent_updated_at before update on public.sent_emails for each row execute function public.set_updated_at();
create trigger trg_contacts_updated_at before update on public.admin_contacts for each row execute function public.set_updated_at();
create trigger trg_finance_updated_at before update on public.finance_entries for each row execute function public.set_updated_at();
create trigger trg_budget_updated_at before update on public.budget_items for each row execute function public.set_updated_at();
create trigger trg_posts_admin_updated_at before update on public.posts_admin for each row execute function public.set_updated_at();
create trigger trg_formations_admin_updated_at before update on public.formations_admin for each row execute function public.set_updated_at();

