alter table public.finance_entries
  add column if not exists auto_key text;

create unique index if not exists uq_finance_entries_auto_key
  on public.finance_entries(auto_key)
  where auto_key is not null;
