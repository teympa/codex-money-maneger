"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/shared/button";
import { normalizeOptionalString } from "@/lib/request";
import type { Account } from "@/types/domain";

const schema = z.object({
  name: z.string().min(1, "口座名を入力してください。"),
  type: z.enum(["bank", "cash", "card", "emoney", "wallet", "points"]),
  institution_name: z.string().optional(),
  current_balance: z.coerce.number().int("残高は整数で入力してください。"),
});

type FormValues = z.infer<typeof schema>;

export function AccountForm({
  initialValue,
  initialCurrentBalance,
}: {
  initialValue?: Account | null;
  initialCurrentBalance?: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const isEdit = Boolean(initialValue);
  const currentBalanceOffset = initialValue
    ? (initialCurrentBalance ?? initialValue.opening_balance) - initialValue.opening_balance
    : 0;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValue?.name ?? "",
      type: initialValue?.type ?? "bank",
      institution_name: initialValue?.institution_name ?? "",
      current_balance: initialCurrentBalance ?? initialValue?.opening_balance ?? 0,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      setMessage("");
      const endpoint = isEdit ? `/api/accounts/${initialValue?.id}` : "/api/accounts";
      const method = isEdit ? "PATCH" : "POST";
      const openingBalance = values.current_balance - currentBalanceOffset;

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          type: values.type,
          institution_name: normalizeOptionalString(values.institution_name),
          opening_balance: openingBalance,
        }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "口座の保存に失敗しました。");
      }

      setMessage(result.message ?? "保存しました。");
      if (!isEdit) {
        reset({
          name: "",
          type: "bank",
          institution_name: "",
          current_balance: 0,
        });
      }
      router.push("/accounts");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "口座の保存に失敗しました。");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">口座名</label>
        <input
          {...register("name")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="例: 北洋銀行"
        />
        {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">種別</label>
        <select {...register("type")} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
          <option value="bank">銀行口座</option>
          <option value="cash">現金</option>
          <option value="card">クレジットカード</option>
          <option value="emoney">電子マネー</option>
          <option value="wallet">財布</option>
          <option value="points">ポイント</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">金融機関名</label>
        <input
          {...register("institution_name")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="例: 北洋銀行"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">現在残高</label>
        <input
          type="number"
          {...register("current_balance")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="例: 0"
        />
        <p className="mt-1 text-xs text-slate-400">
          既存の明細はそのままに、現在の残高に合うよう開始残高を内部で調整します。
        </p>
        {errors.current_balance ? (
          <p className="mt-1 text-xs text-red-600">{errors.current_balance.message}</p>
        ) : null}
      </div>

      <div className="sm:col-span-2 flex flex-col gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : isEdit ? "更新する" : "口座を追加"}
        </Button>
        {message ? <p className="text-sm text-slate-500">{message}</p> : null}
      </div>
    </form>
  );
}
