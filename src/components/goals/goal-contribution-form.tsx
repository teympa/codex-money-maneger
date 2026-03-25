"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import type { SavingGoal } from "@/types/domain";

const QUICK_AMOUNTS = [1000, 5000, 10000];

export function GoalContributionForm({ goal }: { goal: SavingGoal }) {
  const router = useRouter();
  const [amountText, setAmountText] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedAmount = useMemo(() => {
    const normalized = amountText.replaceAll(",", "").trim();
    if (!normalized) return 0;
    return Number(normalized);
  }, [amountText]);

  async function submitContribution(amount: number) {
    if (!Number.isInteger(amount) || amount <= 0) {
      setMessage("追加する金額を1円以上で入力してください。");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: goal.title,
          target_amount: goal.target_amount,
          current_amount: goal.current_amount + amount,
          deadline: goal.deadline,
          priority: goal.priority,
        }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "積立額の追加に失敗しました。");
      }

      setAmountText("");
      setMessage(`${amount.toLocaleString("ja-JP")}円を現在額に追加しました。`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "積立額の追加に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-medium text-ink">積立額を追加</p>
      <p className="mt-1 text-xs text-slate-500">現在額に今回の積立分を足し込みます。</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => submitContribution(amount)}
          >
            +{amount.toLocaleString("ja-JP")}円
          </Button>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={amountText}
          onChange={(event) => setAmountText(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          placeholder="追加する積立額を入力"
        />
        <Button
          type="button"
          disabled={isSubmitting || parsedAmount <= 0}
          isLoading={isSubmitting}
          loadingText="積立中..."
          onClick={() => submitContribution(parsedAmount)}
        >
          積立する
        </Button>
      </div>

      {message ? <p className="mt-2 text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
