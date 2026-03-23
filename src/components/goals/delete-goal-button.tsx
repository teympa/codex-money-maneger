"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/shared/button";

export function DeleteGoalButton({ id }: { id: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm("この目標を削除しますか？");
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "目標の削除に失敗しました。");
      }

      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "目標の削除に失敗しました。");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={handleDelete} disabled={isDeleting}>
      {isDeleting ? "削除中..." : "削除"}
    </Button>
  );
}
