"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/shared/button";

export function DeleteTransactionButton({ id }: { id: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("この明細を削除しますか？")) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = (await response.json()) as { message?: string };
        throw new Error(result.message ?? "明細の削除に失敗しました。");
      }
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "明細の削除に失敗しました。");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button
      variant="ghost"
      type="button"
      onClick={handleDelete}
      isLoading={isDeleting}
      loadingText="削除中..."
    >
      削除
    </Button>
  );
}
