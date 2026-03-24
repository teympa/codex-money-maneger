import Link from "next/link";
import { DeleteGoalButton } from "@/components/goals/delete-goal-button";
import { GoalContributionForm } from "@/components/goals/goal-contribution-form";
import { GoalForm } from "@/components/forms/goal-form";
import { Card } from "@/components/shared/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/format";
import { getGoals } from "@/infrastructure/repositories/kakeibo-repository";

export default async function GoalsPage() {
  const goals = await getGoals();

  return (
    <div className="space-y-6">
      <PageHeader
        title="貯金計画"
        description="旅行や防衛資金などの目標を管理できます。追加した積立額は一覧からそのまま反映できます。"
      />

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">登録中の目標</h2>
          <div className="space-y-4">
            {goals.length === 0 ? (
              <p className="text-sm text-slate-500">
                まだ目標がありません。右側のフォームから追加できます。
              </p>
            ) : null}

            {goals.map((goal) => {
              const progressRate = Math.round((goal.current_amount / goal.target_amount) * 100);

              return (
                <div key={goal.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-ink">{goal.title}</p>
                    <StatusBadge tone={progressRate >= 50 ? "success" : "warning"}>
                      {progressRate}%
                    </StatusBadge>
                  </div>

                  <div className="mt-3 h-3 rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-brand-500"
                      style={{ width: `${Math.min(progressRate, 100)}%` }}
                    />
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                  </p>
                  <p className="text-sm text-slate-500">
                    毎月必要額 {formatCurrency(goal.monthly_required_amount)} / 期限: {goal.deadline}
                  </p>

                  <GoalContributionForm goal={goal} />

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/goals/${goal.id}/edit`}
                      className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-200"
                    >
                      編集
                    </Link>
                    <DeleteGoalButton id={goal.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">目標を追加</h2>
          <p className="text-sm text-slate-500">
            目標名、目標金額、現在額、期限を入れると毎月必要額を自動で計算します。
          </p>
          <GoalForm />
        </Card>
      </section>
    </div>
  );
}
