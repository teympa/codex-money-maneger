import Link from "next/link";
import { getDashboardSummary } from "@/application/services/dashboard-service";
import { Card } from "@/components/shared/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatPercent } from "@/lib/format";

function getBudgetTone(remainingBudget: number) {
  if (remainingBudget <= 0) return "danger" as const;
  if (remainingBudget <= 10000) return "warning" as const;
  return "success" as const;
}

function getTodaySpendableTone(todaySpendable: number) {
  if (todaySpendable <= 0) return "danger" as const;
  if (todaySpendable <= 1500) return "warning" as const;
  return "success" as const;
}

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  const budgetUsageRate =
    summary.budgetTotal > 0 ? Math.min((summary.monthExpense / summary.budgetTotal) * 100, 999) : 0;
  const projectedGap = summary.budgetTotal - summary.projectedMonthEnd;
  const projectedTone =
    projectedGap < 0 ? "danger" : projectedGap <= 10000 ? "warning" : "success";

  return (
    <div className="space-y-6">
      <PageHeader
        title="ダッシュボード"
        description="今月の支出状況と、今日あといくら使えるかをまとめて確認できます。"
      />

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/chat-input"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          自然文で入力する
        </Link>
        <Link
          href="/transactions/new"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          明細を追加する
        </Link>
      </section>

      <Card className="space-y-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-slate-300">今日あと使える額</p>
            <p className="mt-2 text-4xl font-semibold">{formatCurrency(summary.todaySpendable)}</p>
            <p className="mt-2 text-sm text-slate-300">
              残予算 {formatCurrency(summary.remainingBudget)} を残り日数で割った、今日の目安額です。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={getTodaySpendableTone(summary.todaySpendable)}>
              {summary.todaySpendable <= 0 ? "注意" : summary.todaySpendable <= 1500 ? "やや慎重" : "余裕あり"}
            </StatusBadge>
            <StatusBadge tone={getBudgetTone(summary.remainingBudget)}>
              予算消化率 {formatPercent(budgetUsageRate)}
            </StatusBadge>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-sm text-slate-300">今月の支出</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(summary.monthExpense)}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-sm text-slate-300">今月の収入</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(summary.monthIncome)}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-sm text-slate-300">残予算</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(summary.remainingBudget)}</p>
          </div>
        </div>
      </Card>

      {summary.alerts.length > 0 ? (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">予算アラート</h2>
              <p className="mt-1 text-sm text-slate-500">
                予算のしきい値を超えた項目だけを通知として表示しています。
              </p>
            </div>
            <StatusBadge tone="warning">{summary.alerts.length}件</StatusBadge>
          </div>
          <div className="space-y-3">
            {summary.alerts.map((alert) => (
              <div key={`${alert.alert_type}-${alert.title}`} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-ink">{alert.title}</p>
                  <StatusBadge
                    tone={
                      alert.severity === "danger"
                        ? "danger"
                        : alert.severity === "warning"
                          ? "warning"
                          : "info"
                    }
                  >
                    {alert.severity === "danger" ? "危険" : alert.severity === "warning" ? "注意" : "情報"}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{alert.message}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">月末着地の見込み</h2>
              <p className="mt-1 text-sm text-slate-500">
                今の支出ペースが月末まで続いた場合、最終的にいくら使いそうかを見ています。
              </p>
            </div>
            <StatusBadge tone={projectedTone}>
              {projectedTone === "danger" ? "赤字リスク" : projectedTone === "warning" ? "要注意" : "順調"}
            </StatusBadge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">予測支出</p>
              <p className="mt-1 text-xl font-semibold text-ink">{formatCurrency(summary.projectedMonthEnd)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">今月予算</p>
              <p className="mt-1 text-xl font-semibold text-ink">{formatCurrency(summary.budgetTotal)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-ink">予算との差</p>
              <StatusBadge tone={projectedTone}>{formatCurrency(projectedGap)}</StatusBadge>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {projectedGap < 0
                ? "このままだと今月予算を超える見込みです。"
                : "今のペースなら今月予算内に収まる見込みです。"}
            </p>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">残高サマリー</h2>
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">銀行残高</p>
              <p className="mt-1 font-semibold text-ink">{formatCurrency(summary.bankBalance)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">現金残高</p>
              <p className="mt-1 font-semibold text-ink">{formatCurrency(summary.cashBalance)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">電子マネー残高</p>
              <p className="mt-1 font-semibold text-ink">{formatCurrency(summary.emoneyBalance)}</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">危険カテゴリ</h2>
            <p className="mt-1 text-sm text-slate-500">
              今月のカテゴリ別予算に対して、特に消化率が高いカテゴリを並べています。
            </p>
          </div>
          <div className="space-y-3">
            {summary.riskyCategories.length === 0 ? (
              <p className="text-sm text-slate-500">今のところ注意が必要なカテゴリはありません。</p>
            ) : (
              summary.riskyCategories.map((item) => (
                <div key={item.categoryName} className="rounded-2xl bg-slate-50 p-4">
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
                    {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">支払手段別の支出</h2>
            <p className="mt-1 text-sm text-slate-500">今月分の支出を、支払手段ごとにまとめています。</p>
          </div>
          <div className="space-y-3">
            {summary.paymentBreakdown.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
              >
                <span className="text-sm text-slate-600">{item.label}</span>
                <span className="font-medium text-ink">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">貯金目標</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {summary.goals.length === 0 ? (
            <p className="text-sm text-slate-500">まだ貯金目標がありません。</p>
          ) : (
            summary.goals.map((goal) => (
              <div key={goal.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium text-ink">{goal.title}</p>
                  <StatusBadge tone={goal.isRisky ? "warning" : "success"}>
                    {goal.isRisky ? "要確認" : "順調"}
                  </StatusBadge>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-brand-500"
                    style={{ width: `${Math.min(goal.progressRate, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
