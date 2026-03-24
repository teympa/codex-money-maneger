import {
  calculateAccountBalance,
  calculateProjectedMonthEnd,
  calculateTodaySpendable,
  getBudgetConsumption,
  getGoalProgress,
  sumTransactionsByKind,
} from "@/domain/finance";
import { createAdminSupabaseClient } from "@/infrastructure/supabase/admin";
import { getCurrentMonthKey } from "@/lib/constants";
import { getDashboardUrl } from "@/lib/env";
import { formatCurrency } from "@/lib/format";
import {
  getAccounts,
  getAlerts,
  getBudgets,
  getCategories,
  getGoals,
  getTransactions,
} from "@/infrastructure/repositories/kakeibo-repository";
import type {
  Account,
  Alert,
  Budget,
  Category,
  DashboardSummary,
  SavingGoal,
  Transaction,
} from "@/types/domain";

function buildDailyReportText(summary: DashboardSummary) {
  const appUrl = getDashboardUrl();
  const riskyLines = summary.riskyCategories.length
    ? summary.riskyCategories
        .slice(0, 3)
        .map((item) => `・${item.categoryName} ${Math.round(item.rate)}%消化`)
        .join("\n")
    : "・いまのところ注意が必要なカテゴリはありません";

  return `【今日の家計レポート】
今日あと使える額: ${formatCurrency(summary.todaySpendable)}
今月支出: ${formatCurrency(summary.monthExpense)}
残予算: ${formatCurrency(summary.remainingBudget)}
月末着地予測: ${formatCurrency(summary.projectedMonthEnd)}

注意:
${riskyLines}

家計簿を開く:
${appUrl}`;
}

function buildSummaryFromData(params: {
  accounts: Account[];
  budgets: Budget[];
  categories: Category[];
  goals: SavingGoal[];
  transactions: Transaction[];
  alerts: Alert[];
  now?: Date;
}): DashboardSummary {
  const { accounts, budgets, categories, goals, transactions, alerts, now = new Date() } = params;
  const monthKey = getCurrentMonthKey(now);

  const balances = accounts.map((account) => ({
    account,
    balance: calculateAccountBalance(account, transactions),
  }));

  const monthIncome = sumTransactionsByKind(transactions, "income", monthKey);
  const monthExpense = sumTransactionsByKind(transactions, "expense", monthKey);
  const summaries = getBudgetConsumption(
    budgets.filter((budget) => budget.month === monthKey),
    transactions,
    categories,
    monthKey,
  );

  const budgetTotal = summaries.find((item) => item.budget.category_id === null)?.budget.budget_amount ?? 0;
  const remainingBudget = Math.max(budgetTotal - monthExpense, 0);

  return {
    monthIncome,
    monthExpense,
    budgetTotal,
    remainingBudget,
    todaySpendable: calculateTodaySpendable(remainingBudget, now),
    projectedMonthEnd: calculateProjectedMonthEnd(monthExpense, now),
    bankBalance: balances.filter((item) => item.account.type === "bank").reduce((sum, item) => sum + item.balance, 0),
    cashBalance: balances
      .filter((item) => item.account.type === "cash" || item.account.type === "wallet")
      .reduce((sum, item) => sum + item.balance, 0),
    emoneyBalance: balances.filter((item) => item.account.type === "emoney").reduce((sum, item) => sum + item.balance, 0),
    paymentBreakdown: [
      {
        label: "現金",
        amount: transactions
          .filter(
            (transaction) =>
              transaction.transaction_kind === "expense" &&
              accounts.find((account) => account.id === transaction.from_account_id)?.type === "cash",
          )
          .reduce((sum, transaction) => sum + transaction.amount, 0),
      },
      {
        label: "カード",
        amount: transactions
          .filter(
            (transaction) =>
              transaction.transaction_kind === "expense" &&
              accounts.find((account) => account.id === transaction.from_account_id)?.type === "card",
          )
          .reduce((sum, transaction) => sum + transaction.amount, 0),
      },
      {
        label: "電子マネー",
        amount: transactions
          .filter(
            (transaction) =>
              transaction.transaction_kind === "expense" &&
              accounts.find((account) => account.id === transaction.from_account_id)?.type === "emoney",
          )
          .reduce((sum, transaction) => sum + transaction.amount, 0),
      },
      {
        label: "銀行引落",
        amount: transactions
          .filter(
            (transaction) =>
              transaction.transaction_kind === "expense" &&
              accounts.find((account) => account.id === transaction.from_account_id)?.type === "bank",
          )
          .reduce((sum, transaction) => sum + transaction.amount, 0),
      },
    ],
    riskyCategories: summaries
      .filter((item) => item.budget.category_id !== null && item.rate >= 60)
      .map((item) => ({
        categoryName: item.categoryName,
        spent: item.spent,
        budget: item.budget.budget_amount,
        rate: item.rate,
        severity: item.severity,
      })),
    goals: getGoalProgress(goals),
    alerts,
  };
}

export async function generateDailyReportText() {
  const [accounts, budgets, categories, goals, transactions, alerts] = await Promise.all([
    getAccounts(),
    getBudgets(),
    getCategories(),
    getGoals(),
    getTransactions(),
    getAlerts(),
  ]);

  return buildDailyReportText(
    buildSummaryFromData({
      accounts,
      budgets,
      categories,
      goals,
      transactions,
      alerts,
    }),
  );
}

export async function generateDailyReportTextForUser(userId: string) {
  const admin = createAdminSupabaseClient();
  const now = new Date();
  const monthKey = getCurrentMonthKey(now);

  const [
    accountsResult,
    budgetsResult,
    categoriesResult,
    goalsResult,
    transactionsResult,
    alertsResult,
  ] = await Promise.all([
    admin.from("accounts").select("*").eq("user_id", userId).order("created_at"),
    admin.from("budgets").select("*").eq("user_id", userId).order("month", { ascending: false }),
    admin.from("categories").select("*").eq("user_id", userId).order("sort_order"),
    admin.from("saving_goals").select("*").eq("user_id", userId).order("priority"),
    admin
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    admin
      .from("alerts")
      .select("*")
      .eq("user_id", userId)
      .eq("related_month", monthKey)
      .order("created_at", { ascending: false }),
  ]);

  for (const result of [
    accountsResult,
    budgetsResult,
    categoriesResult,
    goalsResult,
    transactionsResult,
    alertsResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const summary = buildSummaryFromData({
    accounts: (accountsResult.data as Account[]) ?? [],
    budgets: (budgetsResult.data as Budget[]) ?? [],
    categories: (categoriesResult.data as Category[]) ?? [],
    goals: (goalsResult.data as SavingGoal[]) ?? [],
    transactions: (transactionsResult.data as Transaction[]) ?? [],
    alerts: (alertsResult.data as Alert[]) ?? [],
    now,
  });

  return buildDailyReportText(summary);
}
