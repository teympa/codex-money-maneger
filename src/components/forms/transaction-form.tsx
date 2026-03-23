"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/shared/button";
import { normalizeOptionalString } from "@/lib/request";
import type { Account, Category, CategoryType, Transaction } from "@/types/domain";

const schema = z.object({
  transaction_date: z.string().min(1, "日付を入力してください。"),
  amount: z.coerce.number().int().positive("金額は1円以上で入力してください。"),
  transaction_kind: z.enum(["income", "expense", "transfer", "adjustment"]),
  from_account_id: z.string().nullable().optional(),
  to_account_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  fixed: "固定費",
  variable: "変動費",
  savings: "貯金",
  income: "収入",
};

export function TransactionForm({
  accounts,
  categories,
  initialValue,
}: {
  accounts: Account[];
  categories: Category[];
  initialValue?: Transaction | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const isEdit = Boolean(initialValue);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      transaction_date: initialValue?.transaction_date ?? new Date().toISOString().slice(0, 10),
      amount: initialValue?.amount ?? 0,
      transaction_kind: initialValue?.transaction_kind ?? "expense",
      from_account_id: initialValue?.from_account_id ?? null,
      to_account_id: initialValue?.to_account_id ?? null,
      category_id: initialValue?.category_id ?? null,
      memo: initialValue?.memo ?? initialValue?.merchant_name ?? "",
    },
  });

  const transactionKind = watch("transaction_kind");

  const groupedCategories = useMemo(() => {
    const groups: Record<CategoryType, Category[]> = {
      fixed: [],
      variable: [],
      savings: [],
      income: [],
    };

    for (const category of categories) {
      groups[category.type].push(category);
    }

    return groups;
  }, [categories]);

  async function onSubmit(values: FormValues) {
    const endpoint = isEdit ? `/api/transactions/${initialValue?.id}` : "/api/transactions";
    const method = isEdit ? "PATCH" : "POST";

    try {
      setMessage("");
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          from_account_id: normalizeOptionalString(values.from_account_id),
          to_account_id: normalizeOptionalString(values.to_account_id),
          merchant_name: null,
          category_id: normalizeOptionalString(values.category_id),
          memo: normalizeOptionalString(values.memo),
          source_type: initialValue?.source_type === "chat" ? "chat" : "manual",
        }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "明細の保存に失敗しました。");
      }

      setMessage(result.message ?? "保存しました。");
      router.push("/transactions");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "明細の保存に失敗しました。");
    }
  }

  const showFromAccount = transactionKind !== "income";
  const showToAccount = transactionKind === "income" || transactionKind === "transfer";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">日付</label>
        <input
          type="date"
          {...register("transaction_date")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
        />
        {errors.transaction_date ? <p className="mt-1 text-xs text-red-600">{errors.transaction_date.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">金額</label>
        <input
          type="number"
          {...register("amount")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="例: 620"
        />
        {errors.amount ? <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">種別</label>
        <select {...register("transaction_kind")} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
          <option value="income">収入</option>
          <option value="expense">支出</option>
          <option value="transfer">振替</option>
          <option value="adjustment">調整</option>
        </select>
      </div>

      {showFromAccount ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {transactionKind === "adjustment" ? "調整対象口座" : "出金元口座"}
          </label>
          <select {...register("from_account_id")} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
            <option value="">選択してください</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showToAccount ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">入金先口座</label>
          <select {...register("to_account_id")} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
            <option value="">選択してください</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">カテゴリ</label>
        <select {...register("category_id")} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
          <option value="">選択してください</option>
          {(Object.keys(groupedCategories) as CategoryType[]).map((type) =>
            groupedCategories[type].length > 0 ? (
              <optgroup key={type} label={CATEGORY_TYPE_LABELS[type]}>
                {groupedCategories[type].map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </optgroup>
            ) : null,
          )}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-700">内容・メモ</label>
        <textarea
          {...register("memo")}
          className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="例: セイコーマートで昼ごはん"
        />
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : isEdit ? "更新する" : "保存する"}
        </Button>
        {message ? <p className="text-sm text-slate-500">{message}</p> : null}
      </div>
    </form>
  );
}
