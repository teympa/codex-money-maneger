import {
  calculateProjectedMonthEnd,
  calculateTodayRemainingSpendable,
  getBudgetConsumption,
  getGoalProgress,
  splitExpenseAmountsByToday,
  sumTransactionsByKind,
} from "@/domain/finance";
import { getActiveBudgetAlerts } from "@/application/services/alert-service";
import { getCurrentMonthKey } from "@/lib/constants";
import {
  getAccounts,
  getBalancesByAccount,
  getBudgets,
  getCategories,
  getGoals,
  getTransactions,
} from "@/infrastructure/repositories/kakeibo-repository";
import type { DashboardSummary } from "@/types/domain";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const now = new Date();
  const monthKey = getCurrentMonthKey(now);
  const todayKey = now.toISOString().slice(0, 10);

  const [accounts, balances, budgets, categories, goals, transactions, alerts] = await Promise.all([
    getAccounts(),
    getBalancesByAccount(),
    getBudgets(),
    getCategories(),
    getGoals(),
    getTransactions(),
    getActiveBudgetAlerts(monthKey),
  ]);

  const monthBudgets = budgets.filter((budget) => budget.month === monthKey);
  const monthIncome = sumTransactionsByKind(transactions, "income", monthKey);
  const monthExpense = sumTransactionsByKind(transactions, "expense", monthKey);
  const summaries = getBudgetConsumption(monthBudgets, transactions, categories, monthKey);

  const budgetTotal =
    summaries.find((item) => item.budget.category_id === null)?.budget.budget_amount ?? 0;
  const remainingBudget = Math.max(budgetTotal - monthExpense, 0);
  const overallSpent = splitExpenseAmountsByToday(transactions, monthKey, todayKey);
  const focusCategoryNames = ["食費", "娯楽"];

  const categoryTodaySpendable = focusCategoryNames.map((categoryName) => {
    const summary = summaries.find(
      (item) => item.categoryName === categoryName && item.budget.category_id !== null,
    );
    const categoryRemainingBudget = summary
      ? Math.max(summary.budget.budget_amount - summary.spent, 0)
      : 0;
    const categorySpent = summary
      ? splitExpenseAmountsByToday(transactions, monthKey, todayKey, summary.budget.category_id)
      : { beforeToday: 0, today: 0 };

    return {
      categoryName,
      remainingBudget: categoryRemainingBudget,
      todaySpendable: summary
        ? calculateTodayRemainingSpendable(
            summary.budget.budget_amount,
            categorySpent.beforeToday,
            categorySpent.today,
            now,
          )
        : 0,
      hasBudget: Boolean(summary),
    };
  });

  return {
    monthIncome,
    monthExpense,
    budgetTotal,
    remainingBudget,
    todaySpendable: calculateTodayRemainingSpendable(
      budgetTotal,
      overallSpent.beforeToday,
      overallSpent.today,
      now,
    ),
    categoryTodaySpendable,
    projectedMonthEnd: calculateProjectedMonthEnd(monthExpense, now),
    bankBalance: balances
      .filter((item) => item.account.type === "bank")
      .reduce((sum, item) => sum + item.balance, 0),
    cashBalance: balances
      .filter((item) => item.account.type === "cash" || item.account.type === "wallet")
      .reduce((sum, item) => sum + item.balance, 0),
    emoneyBalance: balances
      .filter((item) => item.account.type === "emoney")
      .reduce((sum, item) => sum + item.balance, 0),
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
        label: "銀行口座",
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
