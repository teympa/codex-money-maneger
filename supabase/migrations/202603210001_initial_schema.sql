create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_type') then
    create type public.account_type as enum ('bank', 'cash', 'card', 'emoney', 'wallet', 'points');
  end if;
  if not exists (select 1 from pg_type where typname = 'transaction_kind') then
    create type public.transaction_kind as enum ('income', 'expense', 'transfer', 'adjustment');
  end if;
  if not exists (select 1 from pg_type where typname = 'category_type') then
    create type public.category_type as enum ('fixed', 'variable', 'savings', 'income');
  end if;
  if not exists (select 1 from pg_type where typname = 'source_type') then
    create type public.source_type as enum ('manual', 'chat', 'csv', 'api_sync');
  end if;
  if not exists (select 1 from pg_type where typname = 'alert_type') then
    create type public.alert_type as enum ('budget_threshold', 'budget_exceeded', 'monthly_balance_risk', 'goal_risk', 'sync_error');
  end if;
  if not exists (select 1 from pg_type where typname = 'alert_severity') then
    create type public.alert_severity as enum ('info', 'warning', 'danger');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null unique,
  timezone text not null default 'Asia/Tokyo',
  currency text not null default 'JPY',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  type public.account_type not null,
  institution_name text,
  opening_balance integer not null default 0,
  is_active boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  type public.category_type not null,
  color text not null default '#64748b',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  transaction_date date not null,
  amount integer not null check (amount > 0),
  transaction_kind public.transaction_kind not null,
  from_account_id uuid references public.accounts (id) on delete set null,
  to_account_id uuid references public.accounts (id) on delete set null,
  merchant_name text,
  category_id uuid references public.categories (id) on delete set null,
  memo text,
  source_type public.source_type not null default 'manual',
  external_id text,
  raw_text text,
  confidence numeric(4, 3),
  is_duplicate_candidate boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists transactions_user_external_id_idx on public.transactions(user_id, source_type, external_id) where external_id is not null;

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  month text not null,
  category_id uuid references public.categories (id) on delete set null,
  budget_amount integer not null check (budget_amount > 0),
  alert_threshold_percent integer not null default 80 check (alert_threshold_percent between 1 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.saving_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  target_amount integer not null check (target_amount > 0),
  current_amount integer not null default 0 check (current_amount >= 0),
  deadline date not null,
  monthly_required_amount integer not null default 0,
  priority integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.classification_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  keyword text not null,
  merchant_pattern text,
  category_id uuid references public.categories (id) on delete set null,
  account_id uuid references public.accounts (id) on delete set null,
  priority integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  sync_type text not null,
  status text not null,
  imported_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_message text,
  executed_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  alert_type public.alert_type not null,
  severity public.alert_severity not null,
  title text not null,
  message text not null,
  related_month text,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_notification_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  line_user_id text,
  line_notifications_enabled boolean not null default false,
  daily_report_enabled boolean not null default false,
  daily_report_time text not null default '08:00',
  overspend_alert_enabled boolean not null default true,
  sync_error_alert_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.daily_report_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  report_date date not null,
  status text not null,
  payload_json jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, timezone, currency)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    'Asia/Tokyo',
    'JPY'
  )
  on conflict (id) do nothing;

  insert into public.user_notification_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.accounts (user_id, name, type, institution_name, opening_balance)
  values
    (new.id, '北洋銀行', 'bank', '北洋銀行', 0),
    (new.id, '現金財布', 'cash', null, 0),
    (new.id, 'クレジットカード', 'card', 'メインカード', 0),
    (new.id, 'PayPay', 'emoney', null, 0),
    (new.id, 'Suica', 'emoney', null, 0)
  on conflict do nothing;

  insert into public.categories (user_id, name, type, color, sort_order)
  values
    (new.id, '食費', 'variable', '#f97316', 1),
    (new.id, '日用品', 'variable', '#14b8a6', 2),
    (new.id, '外食', 'variable', '#ef4444', 3),
    (new.id, '住居', 'fixed', '#6366f1', 4),
    (new.id, '水道光熱費', 'fixed', '#0ea5e9', 5),
    (new.id, '通信費', 'fixed', '#8b5cf6', 6),
    (new.id, '交通費', 'variable', '#10b981', 7),
    (new.id, '娯楽', 'variable', '#ec4899', 8),
    (new.id, '医療', 'variable', '#06b6d4', 9),
    (new.id, 'サブスク', 'fixed', '#a855f7', 10),
    (new.id, '特別費', 'variable', '#f59e0b', 11),
    (new.id, 'その他', 'variable', '#64748b', 12),
    (new.id, '給与', 'income', '#2563eb', 13),
    (new.id, '副収入', 'income', '#16a34a', 14),
    (new.id, '臨時収入', 'income', '#f59e0b', 15),
    (new.id, 'その他収入', 'income', '#475569', 16),
    (new.id, '先取り貯金', 'savings', '#1d4ed8', 17),
    (new.id, '防衛資金', 'savings', '#0f766e', 18),
    (new.id, '目標積立', 'savings', '#7c3aed', 19)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at before update on public.accounts for each row execute procedure public.set_updated_at();
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories for each row execute procedure public.set_updated_at();
drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at before update on public.transactions for each row execute procedure public.set_updated_at();
drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at before update on public.budgets for each row execute procedure public.set_updated_at();
drop trigger if exists saving_goals_set_updated_at on public.saving_goals;
create trigger saving_goals_set_updated_at before update on public.saving_goals for each row execute procedure public.set_updated_at();
drop trigger if exists classification_rules_set_updated_at on public.classification_rules;
create trigger classification_rules_set_updated_at before update on public.classification_rules for each row execute procedure public.set_updated_at();
drop trigger if exists user_notification_settings_set_updated_at on public.user_notification_settings;
create trigger user_notification_settings_set_updated_at before update on public.user_notification_settings for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.saving_goals enable row level security;
alter table public.classification_rules enable row level security;
alter table public.sync_logs enable row level security;
alter table public.alerts enable row level security;
alter table public.user_notification_settings enable row level security;
alter table public.daily_report_logs enable row level security;

drop policy if exists "Users can manage own profiles" on public.profiles;
create policy "Users can manage own profiles" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "Users can manage own accounts" on public.accounts;
create policy "Users can manage own accounts" on public.accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage own categories" on public.categories;
create policy "Users can manage own categories" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage own transactions" on public.transactions;
create policy "Users can manage own transactions" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage own budgets" on public.budgets;
create policy "Users can manage own budgets" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage own goals" on public.saving_goals;
create policy "Users can manage own goals" on public.saving_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage own classification rules" on public.classification_rules;
create policy "Users can manage own classification rules" on public.classification_rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage own sync logs" on public.sync_logs;
create policy "Users can manage own sync logs" on public.sync_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage own alerts" on public.alerts;
create policy "Users can manage own alerts" on public.alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage own notification settings" on public.user_notification_settings;
create policy "Users can manage own notification settings" on public.user_notification_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage own daily report logs" on public.daily_report_logs;
create policy "Users can manage own daily report logs" on public.daily_report_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
