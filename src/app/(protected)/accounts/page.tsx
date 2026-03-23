import Link from "next/link";
import { DeleteAccountButton } from "@/components/accounts/delete-account-button";
import { AccountForm } from "@/components/forms/account-form";
import { Card } from "@/components/shared/card";
import { PageHeader } from "@/components/shared/page-header";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { getBalancesByAccount } from "@/infrastructure/repositories/kakeibo-repository";

export default async function AccountsPage() {
  const balances = await getBalancesByAccount();

  return (
    <div className="space-y-6">
      <PageHeader
        title="口座管理"
        description="銀行、現金、カード、電子マネーを口座として分けて管理します。"
      />
      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">口座一覧</h2>
          <div className="space-y-3">
            {balances.map(({ account, balance }) => (
              <div key={account.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink">{account.name}</p>
                    <p className="text-sm text-slate-500">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                    {account.institution_name ? (
                      <p className="text-xs text-slate-400">{account.institution_name}</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">{formatCurrency(balance)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Link href={`/accounts/${account.id}/edit`} className="text-sm text-brand-700">
                    編集
                  </Link>
                  <DeleteAccountButton id={account.id} name={account.name} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">新しい口座</h2>
          <AccountForm />
        </Card>
      </section>
    </div>
  );
}
