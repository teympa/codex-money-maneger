import Link from "next/link";
import { DeleteTransactionButton } from "@/components/transactions/delete-transaction-button";
import { Card } from "@/components/shared/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { TRANSACTION_KIND_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getAccounts,
  getCategories,
  getTransactions,
} from "@/infrastructure/repositories/kakeibo-repository";

export default async function TransactionsPage() {
  const [transactions, accounts, categories] = await Promise.all([
    getTransactions(),
    getAccounts(),
    getCategories(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="明細一覧"
        description="収入・支出・振替・調整をまとめて確認できます。"
        action={
          <Link
            href="/transactions/new"
            className="theme-button theme-button--primary inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium"
            style={{
              background: "var(--accent)",
              color: "var(--button-primary-text, #ffffff)",
            }}
          >
            明細を追加
          </Link>
        }
      />
      <Card className="space-y-3">
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-500">
            まだ明細がありません。最初の1件を追加してみましょう。
          </p>
        ) : null}
        {transactions.map((transaction) => {
          const fromAccount =
            accounts.find((account) => account.id === transaction.from_account_id)?.name ?? "-";
          const toAccount =
            accounts.find((account) => account.id === transaction.to_account_id)?.name ?? "-";
          const category =
            categories.find((item) => item.id === transaction.category_id)?.name ?? "-";

          return (
            <div key={transaction.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">
                      {transaction.memo ?? transaction.merchant_name ?? "明細"}
                    </p>
                    <StatusBadge
                      tone={
                        transaction.transaction_kind === "income"
                          ? "success"
                          : transaction.transaction_kind === "transfer"
                            ? "info"
                            : transaction.transaction_kind === "adjustment"
                              ? "warning"
                              : "danger"
                      }
                    >
                      {TRANSACTION_KIND_LABELS[transaction.transaction_kind]}
                    </StatusBadge>
                  </div>
                  <p className="text-sm text-slate-500">
                    {formatDate(transaction.transaction_date)} / {category}
                  </p>
                  <p className="text-sm text-slate-500">
                    {fromAccount} {"->"} {toAccount}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-ink">
                    {formatCurrency(transaction.amount)}
                  </p>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <Link
                      href={`/transactions/${transaction.id}/edit`}
                      className="theme-button theme-button--secondary inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-medium"
                      style={{
                        borderColor: "rgba(0, 0, 0, 0.7)",
                        background: "var(--button-secondary-background)",
                        color: "var(--button-secondary-text)",
                      }}
                    >
                      編集
                    </Link>
                    <DeleteTransactionButton id={transaction.id} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
