import Link from "next/link";
import { getBudgetConsumption } from "@/domain/finance";
import { DeleteBudgetButton } from "@/components/budgets/delete-budget-button";
import { BudgetForm } from "@/components/forms/budget-form";
import { Card } from "@/components/shared/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { getCurrentMonthKey } from "@/lib/constants";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getBudgets, getCategories, getTransactions } from "@/infrastructure/repositories/kakeibo-repository";

export default async function BudgetsPage() {
  const [budgets, categories, transactions] = await Promise.all([
    getBudgets(),
    getCategories(),
    getTransactions(),
  ]);
  const monthKey = getCurrentMonthKey();
  const summaries = getBudgetConsumption(
    budgets.filter((budget) => budget.month === monthKey),
    transactions,
    categories,
    monthKey,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="予算管理"
        description="月予算とカテゴリ別予算の消化状況を確認できます。"
      />
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">今月の予算</h2>
          <div className="space-y-3">
            {summaries.length === 0 ? (
              <p className="text-sm text-slate-500">今月の予算はまだありません。右側のフォームから追加できます。</p>
            ) : null}
            {summaries.map((item) => {
              const remaining = Math.max(item.budget.budget_amount - item.spent, 0);

              return (
                <div key={item.budget.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.categoryName}</p>
                    <StatusBadge
                      tone={
                        item.severity === "danger"
                          ? "danger"
                          : item.severity === "warning"
                            ? "warning"
                            : "info"
                      }
                    >
                      {formatPercent(item.rate)}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    使用額 {formatCurrency(item.spent)} / 予算 {formatCurrency(item.budget.budget_amount)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">残額 {formatCurrency(remaining)}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    警告しきい値 {item.budget.alert_threshold_percent}%
                  </p>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Link href={`/budgets/${item.budget.id}/edit`} className="text-sm text-brand-700">
                      編集
                    </Link>
                    <DeleteBudgetButton id={item.budget.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">予算を追加</h2>
          <p className="text-sm text-slate-500">
            月全体の予算か、カテゴリ別の予算を追加できます。
          </p>
          <BudgetForm categories={categories.filter((category) => category.type !== "income")} />
        </Card>
      </section>
    </div>
  );
}
