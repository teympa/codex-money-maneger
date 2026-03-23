"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/shared/button";
import { normalizeOptionalString } from "@/lib/request";
import type { Account, Category, ClassificationRule } from "@/types/domain";

const schema = z.object({
  keyword: z.string().min(1, "キーワードを入力してください。"),
  merchant_pattern: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  account_id: z.string().nullable().optional(),
  priority: z.coerce.number().int().min(1).max(99),
});

type FormValues = z.infer<typeof schema>;

function toFormValues(rule?: ClassificationRule | null): FormValues {
  return {
    keyword: rule?.keyword ?? "",
    merchant_pattern: rule?.merchant_pattern ?? null,
    category_id: rule?.category_id ?? null,
    account_id: rule?.account_id ?? null,
    priority: rule?.priority ?? 1,
  };
}

export function ClassificationRuleForm({
  categories,
  accounts,
  rule,
  submitLabel = "ルールを追加",
  successMessage = "自動分類ルールを追加しました。",
  onSaved,
  onCancel,
}: {
  categories: Category[];
  accounts: Account[];
  rule?: ClassificationRule | null;
  submitLabel?: string;
  successMessage?: string;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(rule),
  });

  useEffect(() => {
    reset(toFormValues(rule));
  }, [reset, rule]);

  async function onSubmit(values: FormValues) {
    try {
      setMessage("");

      const endpoint = rule ? `/api/classification-rules/${rule.id}` : "/api/classification-rules";
      const method = rule ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: values.keyword.trim(),
          merchant_pattern: normalizeOptionalString(values.merchant_pattern),
          category_id: normalizeOptionalString(values.category_id),
          account_id: normalizeOptionalString(values.account_id),
          priority: values.priority,
        }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(
          result.message ?? (rule ? "自動分類ルールの更新に失敗しました。" : "自動分類ルールの追加に失敗しました。"),
        );
      }

      setMessage(result.message ?? successMessage);
      if (!rule) {
        reset(toFormValues(null));
      }
      onSaved?.();
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : rule
            ? "自動分類ルールの更新に失敗しました。"
            : "自動分類ルールの追加に失敗しました。",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">キーワード</label>
        <input
          {...register("keyword")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="例: セコマ, セイコーマート"
        />
        <p className="mt-1 text-xs text-slate-400">カンマ区切りで複数入れられます。どれか1つに一致すれば適用します。</p>
        {errors.keyword ? <p className="mt-1 text-xs text-red-600">{errors.keyword.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">加盟店名パターン</label>
        <input
          {...register("merchant_pattern")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="例: セイコーマート"
        />
        <p className="mt-1 text-xs text-slate-400">解析された加盟店名に一致したときも適用します。</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">カテゴリ</label>
        <select {...register("category_id")} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
          <option value="">指定しない</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">優先する口座</label>
        <select {...register("account_id")} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
          <option value="">指定しない</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">優先順位</label>
        <input
          type="number"
          {...register("priority")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="1"
        />
        <p className="mt-1 text-xs text-slate-400">数字が小さいルールほど先に適用します。</p>
      </div>

      <div className="sm:col-span-2 flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            キャンセル
          </Button>
        ) : null}
      </div>

      {message ? <p className="sm:col-span-2 text-sm text-slate-500">{message}</p> : null}
    </form>
  );
}
