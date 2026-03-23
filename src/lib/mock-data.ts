import { addDays } from "date-fns";
import { DEMO_USER_ID, getCurrentMonthKey } from "@/lib/constants";
import type {
  Account,
  Alert,
  Budget,
  ClassificationRule,
  Category,
  NotificationSetting,
  Profile,
  SavingGoal,
  Transaction,
} from "@/types/domain";

const now = new Date("2026-03-21T09:00:00+09:00");
const month = getCurrentMonthKey(now);

export const mockProfile: Profile = {
  id: DEMO_USER_ID,
  name: "デモユーザー",
  email: "demo@smart-kakeibo.local",
  timezone: "Asia/Tokyo",
  currency: "JPY",
};

export const mockAccounts: Account[] = [
  { id: "acc-bank", user_id: DEMO_USER_ID, name: "北洋銀行", type: "bank", institution_name: "北洋銀行", opening_balance: 180000, is_active: true, last_synced_at: null, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "acc-cash", user_id: DEMO_USER_ID, name: "現金財布", type: "cash", institution_name: null, opening_balance: 12000, is_active: true, last_synced_at: null, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "acc-card", user_id: DEMO_USER_ID, name: "クレジットカード", type: "card", institution_name: "メインカード", opening_balance: 0, is_active: true, last_synced_at: null, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "acc-paypay", user_id: DEMO_USER_ID, name: "PayPay", type: "emoney", institution_name: null, opening_balance: 8000, is_active: true, last_synced_at: null, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "acc-suica", user_id: DEMO_USER_ID, name: "Suica", type: "emoney", institution_name: null, opening_balance: 5000, is_active: true, last_synced_at: null, created_at: now.toISOString(), updated_at: now.toISOString() },
];

const categorySeed: Array<[string, string, Category["type"], string, number]> = [
  ["cat-food", "食費", "variable", "#f97316", 1],
  ["cat-daily", "日用品", "variable", "#14b8a6", 2],
  ["cat-dining", "外食", "variable", "#ef4444", 3],
  ["cat-rent", "住居", "fixed", "#6366f1", 4],
  ["cat-utility", "水道光熱費", "fixed", "#0ea5e9", 5],
  ["cat-phone", "通信費", "fixed", "#8b5cf6", 6],
  ["cat-transport", "交通費", "variable", "#10b981", 7],
  ["cat-fun", "娯楽", "variable", "#ec4899", 8],
  ["cat-health", "医療", "variable", "#06b6d4", 9],
  ["cat-subscription", "サブスク", "fixed", "#a855f7", 10],
  ["cat-special", "特別費", "variable", "#f59e0b", 11],
  ["cat-other-expense", "その他", "variable", "#64748b", 12],
  ["cat-salary", "給与", "income", "#2563eb", 13],
  ["cat-side", "副収入", "income", "#16a34a", 14],
  ["cat-bonus", "臨時収入", "income", "#f59e0b", 15],
  ["cat-other-income", "その他収入", "income", "#475569", 16],
  ["cat-save", "先取り貯金", "savings", "#1d4ed8", 17],
  ["cat-defense", "防衛資金", "savings", "#0f766e", 18],
  ["cat-goal", "目標積立", "savings", "#7c3aed", 19],
];

export const mockCategories: Category[] = categorySeed.map(([id, name, type, color, sortOrder]) => ({
  id,
  user_id: DEMO_USER_ID,
  name,
  type,
  color,
  sort_order: sortOrder,
  created_at: now.toISOString(),
  updated_at: now.toISOString(),
}));

export const mockTransactions: Transaction[] = [
  { id: "tx-salary", user_id: DEMO_USER_ID, transaction_date: `${month}-01`, amount: 230000, transaction_kind: "income", from_account_id: null, to_account_id: "acc-bank", merchant_name: "勤務先", category_id: "cat-salary", memo: "給与振込", source_type: "manual", external_id: null, raw_text: null, confidence: null, is_duplicate_candidate: false, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "tx-rent", user_id: DEMO_USER_ID, transaction_date: `${month}-05`, amount: 68000, transaction_kind: "expense", from_account_id: "acc-bank", to_account_id: null, merchant_name: "家賃", category_id: "cat-rent", memo: "毎月家賃", source_type: "csv", external_id: "hokuyo-rent-20260305", raw_text: null, confidence: null, is_duplicate_candidate: false, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "tx-food", user_id: DEMO_USER_ID, transaction_date: `${month}-19`, amount: 620, transaction_kind: "expense", from_account_id: "acc-paypay", to_account_id: null, merchant_name: "セイコーマート", category_id: "cat-food", memo: "昼ごはん", source_type: "chat", external_id: null, raw_text: "今日セコマで620円、昼ごはん", confidence: 0.92, is_duplicate_candidate: false, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "tx-withdraw", user_id: DEMO_USER_ID, transaction_date: `${month}-18`, amount: 20000, transaction_kind: "transfer", from_account_id: "acc-bank", to_account_id: "acc-cash", merchant_name: "ATM", category_id: null, memo: "現金引き出し", source_type: "manual", external_id: null, raw_text: null, confidence: null, is_duplicate_candidate: false, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "tx-suica", user_id: DEMO_USER_ID, transaction_date: `${month}-20`, amount: 280, transaction_kind: "expense", from_account_id: "acc-suica", to_account_id: null, merchant_name: "JR", category_id: "cat-transport", memo: "電車", source_type: "manual", external_id: null, raw_text: null, confidence: null, is_duplicate_candidate: false, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "tx-subscription", user_id: DEMO_USER_ID, transaction_date: `${month}-12`, amount: 1480, transaction_kind: "expense", from_account_id: "acc-card", to_account_id: null, merchant_name: "動画配信サービス", category_id: "cat-subscription", memo: null, source_type: "csv", external_id: "card-sub-20260312", raw_text: null, confidence: null, is_duplicate_candidate: false, created_at: now.toISOString(), updated_at: now.toISOString() },
];

export const mockBudgets: Budget[] = [
  { id: "budget-monthly", user_id: DEMO_USER_ID, month, category_id: null, budget_amount: 128000, alert_threshold_percent: 80, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "budget-food", user_id: DEMO_USER_ID, month, category_id: "cat-food", budget_amount: 18000, alert_threshold_percent: 80, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "budget-sub", user_id: DEMO_USER_ID, month, category_id: "cat-subscription", budget_amount: 1600, alert_threshold_percent: 80, created_at: now.toISOString(), updated_at: now.toISOString() },
];

export const mockGoals: SavingGoal[] = [
  { id: "goal-trip", user_id: DEMO_USER_ID, title: "旅行積立", target_amount: 100000, current_amount: 35000, deadline: addDays(now, 180).toISOString().slice(0, 10), monthly_required_amount: 10834, priority: 1, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "goal-emergency", user_id: DEMO_USER_ID, title: "防衛資金", target_amount: 300000, current_amount: 180000, deadline: addDays(now, 365).toISOString().slice(0, 10), monthly_required_amount: 10000, priority: 2, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
];

export const mockClassificationRules: ClassificationRule[] = [
  {
    id: "rule-secoma",
    user_id: DEMO_USER_ID,
    keyword: "セコマ",
    merchant_pattern: "セイコーマート",
    category_id: "cat-food",
    account_id: "acc-paypay",
    priority: 1,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: "rule-rent",
    user_id: DEMO_USER_ID,
    keyword: "家賃",
    merchant_pattern: null,
    category_id: "cat-rent",
    account_id: "acc-bank",
    priority: 1,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: "rule-jr",
    user_id: DEMO_USER_ID,
    keyword: "JR",
    merchant_pattern: null,
    category_id: "cat-transport",
    account_id: "acc-suica",
    priority: 2,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
];

export const mockAlerts: Alert[] = [
  { id: "alert-food", user_id: DEMO_USER_ID, alert_type: "budget_threshold", severity: "warning", title: "食費が予算の80%に近づいています", message: "食費の消化率が 78% です。残り日数に対してやや高めです。", related_month: month, is_read: false, created_at: now.toISOString() },
];

export const mockNotificationSetting: NotificationSetting = {
  id: "notify-1",
  user_id: DEMO_USER_ID,
  line_user_id: null,
  line_notifications_enabled: false,
  daily_report_enabled: false,
  daily_report_time: "08:00",
  overspend_alert_enabled: true,
  sync_error_alert_enabled: true,
  created_at: now.toISOString(),
  updated_at: now.toISOString(),
};
