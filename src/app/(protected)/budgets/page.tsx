import Link from "next/link";
import { getBudgetConsumption } from "@/domain/finance";
import { DeleteBudgetButton } from "@/components/budgets/delete-budget-button";
import { BudgetForm } from "@/components/forms/budget-form";
import { Card } from "@/components/shared/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { getCurrentMonthKey } from "@/lib/constants";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  getBudgets,
  getCategories,
  getTransactions,
} from "@/infrastructure/repositories/kakeibo-repository";

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${year}年${Number(month)}月`;
}

export default async function BudgetsPage() {
  const [budgets, categories, transactions] = await Promise.all([
    getBudgets(),
    getCategories(),
    getTransactions(),
  ]);

  const currentMonthKey = getCurrentMonthKey();
  const monthKeys = [...new Set(budgets.map((budget) => budget.month))].sort((a, b) =>
    b.localeCompare(a),
  );

  const sections = monthKeys.map((monthKey) => ({
    monthKey,
    items: getBudgetConsumption(
      budgets.filter((budget) => budget.month === monthKey),
      transactions,
      categories,
      monthKey,
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="予算管理"
        description="登録した予算を月ごとに確認できます。今月分だけでなく、過去や先の月の予算もここに表示されます。"
      />

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">登録済みの予算</h2>
              <p className="mt-1 text-sm text-slate-500">
                月ごとに予算一覧を表示しています。追加した予算は対応する月の欄に並びます。
              </p>
            </div>
            <StatusBadge tone="info">{`${budgets.length}件`}</StatusBadge>
          </div>

          {sections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
              まだ予算がありません。右側のフォームから追加してください。
            </div>
          ) : (
            <div className="space-y-5">
              {sections.map((section) => (
                <div key={section.monthKey} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-ink">
                      {formatMonthLabel(section.monthKey)}
                    </h3>
                    {section.monthKey === currentMonthKey ? (
                      <StatusBadge tone="success">今月</StatusBadge>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    {section.items.map((item) => {
                      const remaining = Math.max(item.budget.budget_amount - item.spent, 0);

                      return (
                        <div
                          key={item.budget.id}
                          className="rounded-2xl border border-slate-200 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-ink">{item.categoryName}</p>
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
                          <p className="mt-1 text-sm text-slate-500">
                            残額 {formatCurrency(remaining)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            警告しきい値 {item.budget.alert_threshold_percent}%
                          </p>
                          <div className="mt-3 flex items-center justify-end gap-3">
                            <Link
                              href={`/budgets/${item.budget.id}/edit`}
                              className="theme-button theme-button--secondary inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-medium"
                              style={{
                                borderColor: "rgba(0, 0, 0, 0.7)",
                                background: "var(--button-secondary-background)",
                                color: "var(--button-secondary-text)",
                              }}
                            >
                              編集
                            </Link>
                            <DeleteBudgetButton id={item.budget.id} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">予算を追加</h2>
          <p className="text-sm text-slate-500">
            月全体の予算、またはカテゴリ別の予算を追加できます。
          </p>
          <BudgetForm categories={categories.filter((category) => category.type !== "income")} />
        </Card>
      </section>
    </div>
  );
}
