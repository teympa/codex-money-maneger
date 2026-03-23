import { getBudgetAlertCandidates } from "@/domain/finance";
import { getCurrentMonthKey } from "@/lib/constants";
import {
  getAlerts,
  getBudgets,
  getCategories,
  getTransactions,
  replaceBudgetAlerts,
} from "@/infrastructure/repositories/kakeibo-repository";

export async function syncMonthlyBudgetAlerts(monthKey = getCurrentMonthKey()) {
  const [budgets, categories, transactions] = await Promise.all([
    getBudgets(),
    getCategories(),
    getTransactions(),
  ]);

  const targetBudgets = budgets.filter((budget) => budget.month === monthKey);
  const candidates = getBudgetAlertCandidates(targetBudgets, transactions, categories, monthKey);

  await replaceBudgetAlerts(monthKey, candidates);
  return candidates;
}

export async function getActiveBudgetAlerts(monthKey = getCurrentMonthKey()) {
  await syncMonthlyBudgetAlerts(monthKey);
  const alerts = await getAlerts();
  return alerts.filter(
    (alert) =>
      alert.related_month === monthKey &&
      (alert.alert_type === "budget_threshold" || alert.alert_type === "budget_exceeded"),
  );
}
