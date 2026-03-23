import {
  calculateProjectedMonthEnd,
  calculateTodaySpendable,
  getBudgetConsumption,
  getGoalProgress,
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

  const [accounts, balances, budgets, categories, goals, transactions, alerts] = await Promise.all([
    getAccounts(),
    getBalancesByAccount(),
    getBudgets(),
    getCategories(),
    getGoals(),
    getTransactions(),
    getActiveBudgetAlerts(monthKey),
  ]);

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
    cashBalance: balances.filter((item) => item.account.type === "cash" || item.account.type === "wallet").reduce((sum, item) => sum + item.balance, 0),
    emoneyBalance: balances.filter((item) => item.account.type === "emoney").reduce((sum, item) => sum + item.balance, 0),
    paymentBreakdown: [
      {
        label: "現金",
        amount: transactions.filter((transaction) => transaction.transaction_kind === "expense" && accounts.find((account) => account.id === transaction.from_account_id)?.type === "cash").reduce((sum, transaction) => sum + transaction.amount, 0),
      },
      {
        label: "カード",
        amount: transactions.filter((transaction) => transaction.transaction_kind === "expense" && accounts.find((account) => account.id === transaction.from_account_id)?.type === "card").reduce((sum, transaction) => sum + transaction.amount, 0),
      },
      {
        label: "電子マネー",
        amount: transactions.filter((transaction) => transaction.transaction_kind === "expense" && accounts.find((account) => account.id === transaction.from_account_id)?.type === "emoney").reduce((sum, transaction) => sum + transaction.amount, 0),
      },
      {
        label: "銀行引落",
        amount: transactions.filter((transaction) => transaction.transaction_kind === "expense" && accounts.find((account) => account.id === transaction.from_account_id)?.type === "bank").reduce((sum, transaction) => sum + transaction.amount, 0),
      },
    ],
    riskyCategories: summaries.filter((item) => item.budget.category_id !== null && item.rate >= 60).map((item) => ({
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
