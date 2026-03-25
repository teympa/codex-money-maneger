"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/shared/button";

export function DeleteAccountButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`「${name}」を削除しますか？`)) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "口座の削除に失敗しました。");
      }

      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "口座の削除に失敗しました。");
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
