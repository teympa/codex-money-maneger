"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/shared/button";
import type { SavingGoal } from "@/types/domain";

const schema = z.object({
  title: z.string().min(1, "目標名を入力してください。"),
  target_amount: z.coerce.number().int().positive("目標金額は1円以上で入力してください。"),
  current_amount: z.coerce.number().int().min(0, "現在額は0円以上で入力してください。"),
  deadline: z.string().min(1, "期限を入力してください。"),
  priority: z
    .coerce
    .number()
    .int()
    .min(1, "優先度は1以上で入力してください。")
    .max(5, "優先度は5以下で入力してください。"),
});

type FormValues = z.infer<typeof schema>;

function toFormValues(goal?: SavingGoal | null): FormValues {
  return {
    title: goal?.title ?? "",
    target_amount: goal?.target_amount ?? 100000,
    current_amount: goal?.current_amount ?? 0,
    deadline: goal?.deadline ?? "",
    priority: goal?.priority ?? 1,
  };
}

async function readResponseMessage(response: Response) {
  const text = await response.text();
  if (!text) return "";

  try {
    const parsed = JSON.parse(text) as { message?: string };
    return parsed.message ?? "";
  } catch {
    return text;
  }
}

export function GoalForm({ initialValue }: { initialValue?: SavingGoal | null }) {
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
    defaultValues: toFormValues(initialValue),
  });

  useEffect(() => {
    reset(toFormValues(initialValue));
  }, [initialValue, reset]);

  async function onSubmit(values: FormValues) {
    try {
      setMessage("");

      const endpoint = isEdit ? `/api/goals/${initialValue?.id}` : "/api/goals";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const responseMessage = await readResponseMessage(response);

      if (!response.ok) {
        throw new Error(responseMessage || (isEdit ? "目標の更新に失敗しました。" : "目標の追加に失敗しました。"));
      }

      const successMessage = responseMessage || (isEdit ? "目標を更新しました。" : "目標を追加しました。");
      setMessage(successMessage);

      if (isEdit) {
        window.location.assign("/goals");
        return;
      }

      reset(toFormValues(null));
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : isEdit
            ? "目標の更新に失敗しました。"
            : "目標の追加に失敗しました。",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-700">目標名</label>
        <input
          {...register("title")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="例: 旅行積立"
        />
        {errors.title ? <p className="mt-1 text-xs text-red-600">{errors.title.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">目標金額</label>
        <input
          type="number"
          {...register("target_amount")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="例: 100000"
        />
        {errors.target_amount ? <p className="mt-1 text-xs text-red-600">{errors.target_amount.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">現在額</label>
        <input
          type="number"
          {...register("current_amount")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="例: 30000"
        />
        {errors.current_amount ? <p className="mt-1 text-xs text-red-600">{errors.current_amount.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">期限</label>
        <input type="date" {...register("deadline")} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
        {errors.deadline ? <p className="mt-1 text-xs text-red-600">{errors.deadline.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">優先度</label>
        <input
          type="number"
          {...register("priority")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="1"
        />
        <p className="mt-1 text-xs text-slate-400">1が最優先です。数字が大きいほど後回しになります。</p>
        {errors.priority ? <p className="mt-1 text-xs text-red-600">{errors.priority.message}</p> : null}
      </div>

      <div className="sm:col-span-2 flex flex-col gap-2">
        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingText={isEdit ? "更新中..." : "追加中..."}
        >
          {isEdit ? "更新する" : "目標を追加"}
        </Button>
        {message ? <p className="text-sm text-slate-500">{message}</p> : null}
      </div>
    </form>
  );
}
