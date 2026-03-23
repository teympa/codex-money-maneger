insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'demo@smart-kakeibo.local',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"デモユーザー"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into public.transactions (
  user_id,
  transaction_date,
  amount,
  transaction_kind,
  from_account_id,
  to_account_id,
  merchant_name,
  category_id,
  memo,
  source_type,
  external_id,
  raw_text,
  confidence,
  is_duplicate_candidate
)
select
  '11111111-1111-1111-1111-111111111111',
  x.transaction_date::date,
  x.amount,
  x.transaction_kind::public.transaction_kind,
  fa.id,
  ta.id,
  x.merchant_name,
  c.id,
  x.memo,
  x.source_type::public.source_type,
  x.external_id,
  x.raw_text,
  x.confidence,
  x.is_duplicate_candidate
from (
  values
    ('2026-03-01', 230000, 'income', null, '北洋銀行', '勤務先', '給与', '給与振込', 'manual', null, null, null, false),
    ('2026-03-05', 68000, 'expense', '北洋銀行', null, '家賃', '住居', '毎月家賃', 'csv', 'hokuyo-rent-20260305', null, null, false),
    ('2026-03-19', 620, 'expense', 'PayPay', null, 'セイコーマート', '食費', '昼ごはん', 'chat', null, '今日セコマで620円、昼ごはん', 0.92, false),
    ('2026-03-18', 20000, 'transfer', '北洋銀行', '現金財布', 'ATM', null, '現金引き出し', 'manual', null, null, null, false),
    ('2026-03-20', 280, 'expense', 'Suica', null, 'JR', '交通費', '電車', 'manual', null, null, null, false)
) as x(
  transaction_date,
  amount,
  transaction_kind,
  from_name,
  to_name,
  merchant_name,
  category_name,
  memo,
  source_type,
  external_id,
  raw_text,
  confidence,
  is_duplicate_candidate
)
left join public.accounts fa on fa.user_id = '11111111-1111-1111-1111-111111111111' and fa.name = x.from_name
left join public.accounts ta on ta.user_id = '11111111-1111-1111-1111-111111111111' and ta.name = x.to_name
left join public.categories c on c.user_id = '11111111-1111-1111-1111-111111111111' and c.name = x.category_name
where not exists (
  select 1
  from public.transactions t
  where t.user_id = '11111111-1111-1111-1111-111111111111'
    and t.external_id is not distinct from x.external_id
    and t.transaction_date = x.transaction_date::date
    and t.amount = x.amount
);

insert into public.budgets (user_id, month, category_id, budget_amount, alert_threshold_percent)
select
  '11111111-1111-1111-1111-111111111111',
  '2026-03',
  c.id,
  x.budget_amount,
  x.alert_threshold_percent
from (
  values
    (null, 128000, 80),
    ('食費', 18000, 80),
    ('サブスク', 1600, 80)
) as x(category_name, budget_amount, alert_threshold_percent)
left join public.categories c on c.user_id = '11111111-1111-1111-1111-111111111111' and c.name = x.category_name;

insert into public.saving_goals (
  user_id,
  title,
  target_amount,
  current_amount,
  deadline,
  monthly_required_amount,
  priority,
  is_active
)
values
  ('11111111-1111-1111-1111-111111111111', '旅行積立', 100000, 35000, '2026-09-17', 10834, 1, true),
  ('11111111-1111-1111-1111-111111111111', '防衛資金', 300000, 180000, '2027-03-21', 10000, 2, true)
on conflict do nothing;
