import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createBudget, getBudgets } from "@/infrastructure/repositories/kakeibo-repository";

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "YYYY-MM 形式で入力してください"),
  category_id: z.string().nullable().optional(),
  budget_amount: z.number().int().positive(),
  alert_threshold_percent: z.number().int().min(1).max(100),
});

export async function GET() {
  return NextResponse.json(await getBudgets());
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    await createBudget({
      month: body.month,
      category_id: body.category_id ?? null,
      budget_amount: body.budget_amount,
      alert_threshold_percent: body.alert_threshold_percent,
    });
    return NextResponse.json({ message: "予算を追加しました。" });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? "入力値が不正です。" }, { status: 400 });
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "予算の登録に失敗しました。" },
      { status: 500 },
    );
  }
}
