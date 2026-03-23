import { notFound } from "next/navigation";
import { AccountForm } from "@/components/forms/account-form";
import { BackLink } from "@/components/shared/back-link";
import { Card } from "@/components/shared/card";
import { PageHeader } from "@/components/shared/page-header";
import {
  getAccountById,
  getBalancesByAccount,
} from "@/infrastructure/repositories/kakeibo-repository";

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [account, balances] = await Promise.all([getAccountById(id), getBalancesByAccount()]);

  if (!account) notFound();

  const currentBalance =
    balances.find((item) => item.account.id === id)?.balance ?? account.opening_balance;

  return (
    <div className="space-y-6">
      <BackLink href="/accounts" label="口座一覧に戻る" />
      <PageHeader
        title="口座を編集"
        description="口座名や種別、現在残高を更新できます。"
      />
      <Card>
        <AccountForm initialValue={account} initialCurrentBalance={currentBalance} />
      </Card>
    </div>
  );
}
