import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createBudget, getBudgets } from "@/infrastructure/repositories/kakeibo-repository";
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
  excludeId?: string,
) {
  return budgets.some((budget) => {
    if (excludeId && budget.id === excludeId) {
      return false;
    }

    return budget.month === input.month && (budget.category_id ?? null) === input.category_id;
  });
}

export async function GET() {
  return NextResponse.json(await getBudgets());
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const categoryId = body.category_id ?? null;
    const budgets = await getBudgets();

    if (hasDuplicateBudget(budgets, { month: body.month, category_id: categoryId })) {
      return NextResponse.json(
        {
          message:
            categoryId === null
              ? "この月の全体予算はすでに登録されています。編集から変更してください。"
              : "この月・このカテゴリの予算はすでに登録されています。編集から変更してください。",
        },
        { status: 400 },
      );
    }

    await createBudget({
      month: body.month,
      category_id: categoryId,
      budget_amount: body.budget_amount,
      alert_threshold_percent: body.alert_threshold_percent,
    });

    return NextResponse.json({ message: "予算を追加しました。" });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.errors[0]?.message ?? "入力内容を確認してください。" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "予算の追加に失敗しました。" },
      { status: 500 },
    );
  }
}
