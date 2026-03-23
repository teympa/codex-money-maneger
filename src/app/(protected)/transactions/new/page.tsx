import { TransactionForm } from "@/components/forms/transaction-form";
import { Card } from "@/components/shared/card";
import { BackLink } from "@/components/shared/back-link";
import { PageHeader } from "@/components/shared/page-header";
import { getAccounts, getCategories } from "@/infrastructure/repositories/kakeibo-repository";

export default async function NewTransactionPage() {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);

  return (
    <div className="space-y-6">
      <BackLink href="/transactions" label="明細一覧に戻る" />
      <PageHeader title="明細を追加" description="支出・収入・振替・調整を登録します。" />
      <Card>
        <TransactionForm accounts={accounts} categories={categories} />
      </Card>
    </div>
  );
}
