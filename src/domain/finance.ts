import { differenceInCalendarDays, differenceInCalendarMonths, endOfMonth, parseISO, startOfMonth } from "date-fns";
import type { Account, Alert, AlertSeverity, Budget, Category, SavingGoal, Transaction } from "@/types/domain";

export function isTransactionInMonth(transactionDate: string, monthKey: string) {
  return transactionDate.startsWith(monthKey);
}

export function calculateAccountBalance(account: Account, transactions: Transaction[]) {
  return transactions.reduce((balance, transaction) => {
    if (transaction.from_account_id === account.id) return balance - transaction.amount;
    if (transaction.to_account_id === account.id) return balance + transaction.amount;
    return balance;
  }, account.opening_balance);
}

export function sumTransactionsByKind(
  transactions: Transaction[],
  kind: Transaction["transaction_kind"],
  monthKey: string,
) {
  return transactions
    .filter(
      (transaction) =>
        transaction.transaction_kind === kind &&
        isTransactionInMonth(transaction.transaction_date, monthKey),
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

export function calculateRemainingDays(referenceDate: Date) {
  return Math.max(differenceInCalendarDays(endOfMonth(referenceDate), referenceDate) + 1, 1);
}

export function calculateTodaySpendable(remainingBudget: number, referenceDate: Date) {
  return Math.floor(remainingBudget / calculateRemainingDays(referenceDate));
}

export function calculateProjectedMonthEnd(monthExpense: number, referenceDate: Date) {
  const started = differenceInCalendarDays(referenceDate, startOfMonth(referenceDate)) + 1;
  const totalDays =
    differenceInCalendarDays(endOfMonth(referenceDate), startOfMonth(referenceDate)) + 1;
  if (started <= 0) return monthExpense;
  return Math.round((monthExpense / started) * totalDays);
}

export function getSeverityFromRate(rate: number, threshold: number): AlertSeverity {
  if (rate >= 100) return "danger";
  if (rate >= threshold) return "warning";
  return "info";
}

export function getBudgetConsumption(
  budgets: Budget[],
  transactions: Transaction[],
  categories: Category[],
  monthKey: string,
) {
  return budgets.map((budget) => {
    const spent = transactions
      .filter((transaction) => {
        if (transaction.transaction_kind !== "expense") return false;
        if (!isTransactionInMonth(transaction.transaction_date, monthKey)) return false;
        return budget.category_id ? transaction.category_id === budget.category_id : true;
      })
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const rate = budget.budget_amount === 0 ? 0 : (spent / budget.budget_amount) * 100;
    const categoryName =
      categories.find((category) => category.id === budget.category_id)?.name ?? "月全体";

    return {
      budget,
      categoryName,
      spent,
      rate,
      severity: getSeverityFromRate(rate, budget.alert_threshold_percent),
    };
  });
}

export function calculateMonthlyRequiredAmount(
  targetAmount: number,
  currentAmount: number,
  deadline: string,
  now = new Date(),
) {
  const remaining = Math.max(targetAmount - currentAmount, 0);
  const months = Math.max(differenceInCalendarMonths(parseISO(deadline), now) + 1, 1);
  return Math.ceil(remaining / months);
}

export function getGoalProgress(goals: SavingGoal[]) {
  return goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    progressRate: goal.target_amount === 0 ? 0 : (goal.current_amount / goal.target_amount) * 100,
    currentAmount: goal.current_amount,
    targetAmount: goal.target_amount,
    isRisky: goal.current_amount < goal.monthly_required_amount * goal.priority,
  }));
}

export function getBudgetAlertCandidates(
  budgets: Budget[],
  transactions: Transaction[],
  categories: Category[],
  monthKey: string,
): Array<Omit<Alert, "id" | "user_id" | "created_at" | "is_read">> {
  return getBudgetConsumption(budgets, transactions, categories, monthKey)
    .filter((item) => item.rate >= item.budget.alert_threshold_percent)
    .map((item) => {
      const isOverall = item.budget.category_id === null;
      const isExceeded = item.rate >= 100;
      const alertType = isExceeded ? "budget_exceeded" : "budget_threshold";
      const severity = isExceeded ? "danger" : "warning";

      if (isOverall) {
        return {
          alert_type: alertType,
          severity,
          title: isExceeded ? "月予算を超過しています" : "月予算がしきい値に近づいています",
          message: isExceeded
            ? `今月の支出が ${Math.round(item.rate)}% に達しています。残予算を見直してください。`
            : `今月の支出が ${Math.round(item.rate)}% です。使いすぎに注意してください。`,
          related_month: monthKey,
        } satisfies Omit<Alert, "id" | "user_id" | "created_at" | "is_read">;
      }

      return {
        alert_type: alertType,
        severity,
        title: isExceeded
          ? `${item.categoryName} が予算超過です`
          : `${item.categoryName} が予算のしきい値に近づいています`,
        message: `${item.categoryName} は ${formatRate(item.rate)} 消化しています。${formatAmount(item.spent)} / ${formatAmount(item.budget.budget_amount)}`,
        related_month: monthKey,
      } satisfies Omit<Alert, "id" | "user_id" | "created_at" | "is_read">;
    });
}

function formatRate(rate: number) {
  return `${Math.round(rate)}%`;
}

function formatAmount(amount: number) {
  return `${amount.toLocaleString("ja-JP")}円`;
}
