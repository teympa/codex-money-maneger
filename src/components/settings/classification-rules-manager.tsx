"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClassificationRuleForm } from "@/components/forms/classification-rule-form";
import { Button } from "@/components/shared/button";
import type { Account, Category, ClassificationRule } from "@/types/domain";

export function ClassificationRulesManager({
  rules,
  categories,
  accounts,
}: {
  rules: ClassificationRule[];
  categories: Category[];
  accounts: Account[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );

  const editingRule = rules.find((rule) => rule.id === editingRuleId) ?? null;

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleAll() {
    if (selectedIds.length === rules.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(rules.map((rule) => rule.id));
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(`選択した ${selectedIds.length} 件のルールを削除しますか？`);
    if (!confirmed) return;

    setMessage("");
    setIsDeleting(true);
    try {
      const response = await fetch("/api/classification-rules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(result.message ?? "自動分類ルールの削除に失敗しました。");
        return;
      }

      setSelectedIds([]);
      setEditingRuleId(null);
      setMessage(result.message ?? "選択した自動分類ルールを削除しました。");
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rules.length > 0 && selectedIds.length === rules.length}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-slate-300"
              />
              すべて選択
            </label>
            <span className="text-sm text-slate-500">{selectedIds.length} 件選択中</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={deleteSelected}
            disabled={selectedIds.length === 0 || isDeleting}
          >
            {isDeleting ? "削除中..." : "選択したルールを削除"}
          </Button>
        </div>

        {rules.length > 0 ? (
          rules.map((rule) => (
            <div key={rule.id} className="rounded-2xl border border-slate-200 px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(rule.id)}
                    onChange={() => toggleSelected(rule.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <div className="space-y-1">
                    <p className="font-medium text-ink">{rule.keyword}</p>
                    <p className="text-sm text-slate-500">
                      カテゴリ: {rule.category_id ? categoryMap.get(rule.category_id) ?? "未設定" : "未設定"}
                      {" / "}
                      口座: {rule.account_id ? accountMap.get(rule.account_id) ?? "未設定" : "未設定"}
                    </p>
                    <p className="text-sm text-slate-500">
                      加盟店パターン: {rule.merchant_pattern?.trim() ? rule.merchant_pattern : "未設定"}
                      {" / "}
                      優先順位: {rule.priority}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingRuleId(editingRuleId === rule.id ? null : rule.id)}
                >
                  {editingRuleId === rule.id ? "閉じる" : "編集"}
                </Button>
              </div>

              {editingRuleId === rule.id ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <ClassificationRuleForm
                    rule={rule}
                    categories={categories}
                    accounts={accounts}
                    submitLabel="ルールを更新"
                    successMessage="自動分類ルールを更新しました。"
                    onSaved={() => setEditingRuleId(null)}
                    onCancel={() => setEditingRuleId(null)}
                  />
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
            まだ自動分類ルールはありません。よく使うキーワードから少しずつ追加できます。
          </div>
        )}

        {message ? <p className="text-sm text-slate-500">{message}</p> : null}
      </div>

      <div className="rounded-3xl bg-slate-50 p-4">
        <h3 className="text-base font-semibold text-ink">新しいルールを追加</h3>
        <p className="mt-1 text-sm text-slate-500">
          例: 「セコマ, セイコーマート」で食費、「家賃, 管理費」で住居のように設定できます。
        </p>
        <div className="mt-4">
          <ClassificationRuleForm categories={categories} accounts={accounts} />
        </div>
      </div>
    </div>
  );
}
