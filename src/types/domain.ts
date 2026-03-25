export type AccountType = "bank" | "cash" | "card" | "emoney" | "wallet" | "points";

export type TransactionKind = "income" | "expense" | "transfer" | "adjustment";

export type CategoryType = "fixed" | "variable" | "savings" | "income";

export type SourceType = "manual" | "chat" | "csv" | "api_sync";

export type AlertSeverity = "info" | "warning" | "danger";

export type AlertType =
  | "budget_threshold"
  | "budget_exceeded"
  | "monthly_balance_risk"
  | "goal_risk"
  | "sync_error";

export interface Profile {
  id: string;
  name: string;
  email: string;
  timezone: string;
  currency: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  institution_name: string | null;
  opening_balance: number;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  transaction_date: string;
  amount: number;
  transaction_kind: TransactionKind;
  from_account_id: string | null;
  to_account_id: string | null;
  merchant_name: string | null;
  category_id: string | null;
  memo: string | null;
  source_type: SourceType;
  external_id: string | null;
  raw_text: string | null;
  confidence: number | null;
  is_duplicate_candidate: boolean;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  month: string;
  category_id: string | null;
  budget_amount: number;
  alert_threshold_percent: number;
  created_at: string;
  updated_at: string;
}

export interface SavingGoal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  monthly_required_amount: number;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassificationRule {
  id: string;
  user_id: string;
  keyword: string;
  merchant_pattern: string | null;
  category_id: string | null;
  account_id: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  related_month: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationSetting {
  id: string;
  user_id: string;
  line_user_id: string | null;
  line_notifications_enabled: boolean;
  daily_report_enabled: boolean;
  daily_report_time: string;
  overspend_alert_enabled: boolean;
  sync_error_alert_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyReportLog {
  id: string;
  user_id: string;
  report_date: string;
  status: string;
  payload_json: Record<string, unknown>;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface DashboardSummary {
  monthIncome: number;
  monthExpense: number;
  budgetTotal: number;
  remainingBudget: number;
  todaySpendable: number;
  categoryTodaySpendable: Array<{
    categoryName: string;
    remainingBudget: number;
    todaySpendable: number;
    hasBudget: boolean;
  }>;
  projectedMonthEnd: number;
  bankBalance: number;
  cashBalance: number;
  emoneyBalance: number;
  paymentBreakdown: Array<{
    label: string;
    amount: number;
  }>;
  riskyCategories: Array<{
    categoryName: string;
    spent: number;
    budget: number;
    rate: number;
    severity: AlertSeverity;
  }>;
  goals: Array<{
    id: string;
    title: string;
    progressRate: number;
    currentAmount: number;
    targetAmount: number;
    isRisky: boolean;
  }>;
  alerts: Alert[];
}

export interface ParsedTransactionCandidate {
  transaction_date: string;
  amount: number;
  transaction_kind: TransactionKind;
  from_account_name: string | null;
  to_account_name: string | null;
  merchant_name: string | null;
  category: string | null;
  memo: string | null;
  confidence: number;
}
