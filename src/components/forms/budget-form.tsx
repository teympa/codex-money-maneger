"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/shared/button";
import { getCurrentMonthKey } from "@/lib/constants";
import { normalizeOptionalString } from "@/lib/request";
import type { Budget, Category } from "@/types/domain";

const schema = z.object({
  month: z.string().min(1),
  category_id: z.string().nullable().optional(),
  budget_amount: z.coerce.number().int().positive("予算額は1円以上で入力してください。"),
  alert_threshold_percent: z.coerce.number().int().min(1).max(100),
});

type FormValues = z.infer<typeof schema>;

export function BudgetForm({
  categories,
  initialValue,
}: {
  categories: Category[];
  initialValue?: Budget | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const isEdit = Boolean(initialValue);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      month: initialValue?.month ?? getCurrentMonthKey(),
      category_id: initialValue?.category_id ?? null,
      budget_amount: initialValue?.budget_amount ?? 0,
      alert_threshold_percent: initialValue?.alert_threshold_percent ?? 80,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      setMessage("");
      const endpoint = isEdit ? `/api/budgets/${initialValue?.id}` : "/api/budgets";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          category_id: normalizeOptionalString(values.category_id),
        }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message ?? `予算の${isEdit ? "更新" : "追加"}に失敗しました。`);
      }

      setMessage(result.message ?? `予算を${isEdit ? "更新" : "追加"}しました。`);
      if (!isEdit) {
        reset({
          month: getCurrentMonthKey(),
          category_id: null,
          budget_amount: 0,
          alert_threshold_percent: 80,
        });
      }
      router.refresh();
      if (isEdit) {
        router.push("/budgets");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `予算の${isEdit ? "更新" : "追加"}に失敗しました。`);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">対象月</label>
        <input type="month" {...register("month")} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">カテゴリ</label>
        <select {...register("category_id")} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
          <option value="">月全体の予算</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">空欄なら月全体の予算になります。</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">予算額</label>
        <input
          type="number"
          {...register("budget_amount")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="例: 30000"
        />
        {errors.budget_amount ? <p className="mt-1 text-xs text-red-600">{errors.budget_amount.message}</p> : null}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">警告しきい値 (%)</label>
        <input
          type="number"
          {...register("alert_threshold_percent")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="例: 80"
        />
        <p className="mt-1 text-xs text-slate-400">80 なら予算の 80% 消化で warning になります。</p>
      </div>
      <div className="sm:col-span-2 flex flex-col gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : isEdit ? "更新する" : "予算を追加"}
        </Button>
        {message ? <p className="text-sm text-slate-500">{message}</p> : null}
      </div>
    </form>
  );
}
