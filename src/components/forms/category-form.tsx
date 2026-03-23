"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/shared/button";
import type { Category, CategoryType } from "@/types/domain";

const schema = z.object({
  name: z.string().min(1, "カテゴリ名を入力してください。"),
  type: z.enum(["fixed", "variable", "savings", "income"]),
  color: z
    .string()
    .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "色は #RRGGBB 形式で入力してください。"),
  sort_order: z.coerce.number().int().min(0, "並び順は0以上で入力してください。"),
});

type FormValues = z.infer<typeof schema>;

const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  fixed: "固定費",
  variable: "変動費",
  savings: "貯金",
  income: "収入",
};

function toFormValues(category: Category): FormValues {
  return {
    name: category.name,
    type: category.type,
    color: category.color,
    sort_order: category.sort_order,
  };
}

export function CategoryForm({
  category,
  onSaved,
  onCancel,
}: {
  category: Category;
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
    defaultValues: toFormValues(category),
  });

  useEffect(() => {
    reset(toFormValues(category));
  }, [category, reset]);

  async function onSubmit(values: FormValues) {
    try {
      setMessage("");

      const response = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          type: values.type,
          color: values.color,
          sort_order: values.sort_order,
        }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message ?? "カテゴリの更新に失敗しました。");
      }

      setMessage(result.message ?? "カテゴリを更新しました。");
      onSaved?.();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "カテゴリの更新に失敗しました。");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">カテゴリ名</label>
        <input
          {...register("name")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="例: 食費"
        />
        {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">カテゴリ種別</label>
        <select {...register("type")} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
          {Object.entries(CATEGORY_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">色</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            {...register("color")}
            className="h-12 w-16 rounded-xl border border-slate-200 bg-white p-1"
          />
          <input
            {...register("color")}
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3"
            placeholder="#f97316"
          />
        </div>
        {errors.color ? <p className="mt-1 text-xs text-red-600">{errors.color.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">並び順</label>
        <input
          type="number"
          {...register("sort_order")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="1"
        />
        <p className="mt-1 text-xs text-slate-400">小さい数字ほど上に表示されます。</p>
        {errors.sort_order ? <p className="mt-1 text-xs text-red-600">{errors.sort_order.message}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "更新中..." : "カテゴリを更新"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            キャンセル
          </Button>
        ) : null}
      </div>

      {message ? <p className="text-sm text-slate-500 sm:col-span-2">{message}</p> : null}
    </form>
  );
}
