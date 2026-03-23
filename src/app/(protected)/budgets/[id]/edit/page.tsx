import { notFound } from "next/navigation";
import { BudgetForm } from "@/components/forms/budget-form";
import { BackLink } from "@/components/shared/back-link";
import { Card } from "@/components/shared/card";
import { PageHeader } from "@/components/shared/page-header";
import { getBudgetById, getCategories } from "@/infrastructure/repositories/kakeibo-repository";

export default async function EditBudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [budget, categories] = await Promise.all([getBudgetById(id), getCategories()]);

  if (!budget) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <BackLink href="/budgets" label="予算一覧に戻る" />
      <PageHeader title="予算を編集" description="予算額や警告しきい値を更新できます。" />
      <Card>
        <BudgetForm
          initialValue={budget}
          categories={categories.filter((category) => category.type !== "income")}
        />
      </Card>
    </div>
  );
}
