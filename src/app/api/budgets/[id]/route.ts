import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { deleteBudget, getBudgets, updateBudget } from "@/infrastructure/repositories/kakeibo-repository";
import { normalizeOptionalString } from "@/lib/request";
import type { Budget } from "@/types/domain";

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "月は YYYY-MM 形式で入力してください。"),
  category_id: z.string().nullable().optional(),
  budget_amount: z.coerce.number().int().positive("予算額は1円以上で入力してください。"),
  alert_threshold_percent: z.coerce.number().int().min(1).max(100),
});

function hasDuplicateBudget(
  budgets: Budget[],
  input: { month: string; category_id: string | null },
  excludeId: string,
) {
  return budgets.some((budget) => {
    if (budget.id === excludeId) {
      return false;
    }

    return budget.month === input.month && (budget.category_id ?? null) === input.category_id;
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = schema.parse(await request.json());
    const categoryId = normalizeOptionalString(body.category_id);
    const budgets = await getBudgets();

    if (hasDuplicateBudget(budgets, { month: body.month, category_id: categoryId }, id)) {
      return NextResponse.json(
        {
          message:
            categoryId === null
              ? "この月の全体予算はすでに登録されています。別の月を選ぶか、既存の予算を編集してください。"
              : "この月・このカテゴリの予算はすでに登録されています。既存の予算を編集してください。",
        },
        { status: 400 },
      );
    }

    await updateBudget(id, {
      month: body.month,
      category_id: categoryId,
      budget_amount: body.budget_amount,
      alert_threshold_percent: body.alert_threshold_percent,
    });

    return NextResponse.json({ message: "予算を更新しました。" });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.errors[0]?.message ?? "入力内容を確認してください。" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "予算の更新に失敗しました。" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteBudget(id);
    return NextResponse.json({ message: "予算を削除しました。" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "予算の削除に失敗しました。" },
      { status: 500 },
    );
  }
}
