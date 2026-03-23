import { notFound } from "next/navigation";
import { GoalForm } from "@/components/forms/goal-form";
import { BackLink } from "@/components/shared/back-link";
import { Card } from "@/components/shared/card";
import { PageHeader } from "@/components/shared/page-header";
import { getGoalById } from "@/infrastructure/repositories/kakeibo-repository";

export default async function EditGoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const goal = await getGoalById(id);

  if (!goal) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <BackLink href="/goals" label="目標一覧に戻る" />
      <PageHeader title="目標を編集" description="現在額や期限を見直して、進捗計画を更新できます。" />
      <Card>
        <GoalForm initialValue={goal} />
      </Card>
    </div>
  );
}
