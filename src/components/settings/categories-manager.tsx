"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { CategoryForm } from "@/components/forms/category-form";
import { Button } from "@/components/shared/button";
import type { Category, CategoryType } from "@/types/domain";

const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  fixed: "固定費",
  variable: "変動費",
  savings: "貯金",
  income: "収入",
};

const DEFAULT_OPEN_GROUPS: Record<CategoryType, boolean> = {
  fixed: true,
  variable: true,
  savings: false,
  income: false,
};

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<CategoryType, boolean>>(DEFAULT_OPEN_GROUPS);

  const categoryGroups = useMemo(() => {
    const initial: Record<CategoryType, Category[]> = {
      fixed: [],
      variable: [],
      savings: [],
      income: [],
    };

    for (const category of categories) {
      initial[category.type].push(category);
    }

    return initial;
  }, [categories]);

  function toggleGroup(type: CategoryType) {
    setOpenGroups((current) => ({
      ...current,
      [type]: !current[type],
    }));
  }

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(`「${category.name}」を削除しますか？`);
    if (!confirmed) return;

    setDeletingCategoryId(category.id);
    setMessage("");

    try {
      const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "カテゴリの削除に失敗しました。");
      }

      setEditingCategoryId((current) => (current === category.id ? null : current));
      setMessage(result.message ?? "カテゴリを削除しました。");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "カテゴリの削除に失敗しました。");
    } finally {
      setDeletingCategoryId(null);
    }
  }

  return (
    <div className="space-y-5">
      {(Object.keys(categoryGroups) as CategoryType[]).map((type) => {
        const items = categoryGroups[type];
        const isOpen = openGroups[type];

        return (
          <div key={type} className="rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => toggleGroup(type)}
              className="flex w-full items-center justify-between px-4 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-ink">{CATEGORY_TYPE_LABELS[type]}</h3>
                <span className="text-xs text-slate-400">{items.length}件</span>
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
            </button>

            {isOpen ? (
              <div className="border-t border-slate-200 px-4 py-4">
                {items.length > 0 ? (
                  <div className="space-y-3">
                    {items.map((category) => (
                      <div key={category.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span
                                className="h-4 w-4 rounded-full border border-slate-200"
                                style={{ backgroundColor: category.color }}
                                aria-hidden
                              />
                              <p className="font-medium text-ink">{category.name}</p>
                            </div>
                            <p className="text-sm text-slate-500">
                              種別: {CATEGORY_TYPE_LABELS[category.type]} / 並び順: {category.sort_order}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                setEditingCategoryId((current) => (current === category.id ? null : category.id))
                              }
                            >
                              {editingCategoryId === category.id ? "閉じる" : "編集"}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => handleDelete(category)}
                              disabled={deletingCategoryId === category.id}
                            >
                              {deletingCategoryId === category.id ? "削除中..." : "削除"}
                            </Button>
                          </div>
                        </div>

                        {editingCategoryId === category.id ? (
                          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                            <CategoryForm
                              category={category}
                              onSaved={() => setEditingCategoryId(null)}
                              onCancel={() => setEditingCategoryId(null)}
                            />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    この種別のカテゴリはまだありません。
                  </div>
                )}
              </div>
            ) : null}
          </div>
        );
      })}

      {message ? <p className="text-sm text-slate-500">{message}</p> : null}
    </div>
  );
}
