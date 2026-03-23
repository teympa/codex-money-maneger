import { notFound } from "next/navigation";
import { TransactionForm } from "@/components/forms/transaction-form";
import { Card } from "@/components/shared/card";
import { BackLink } from "@/components/shared/back-link";
import { PageHeader } from "@/components/shared/page-header";
import {
  getAccounts,
  getCategories,
  getTransactionById,
} from "@/infrastructure/repositories/kakeibo-repository";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [transaction, accounts, categories] = await Promise.all([
    getTransactionById(id),
    getAccounts(),
    getCategories(),
  ]);

  if (!transaction) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <BackLink href="/transactions" label="明細一覧に戻る" />
      <PageHeader
        title="明細を編集"
        description="内容を修正して、家計データを最新の状態に保ちます。"
      />
      <Card>
        <TransactionForm
          accounts={accounts}
          categories={categories}
          initialValue={transaction}
        />
      </Card>
    </div>
  );
}
