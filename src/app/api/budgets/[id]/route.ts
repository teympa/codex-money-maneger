import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { deleteBudget, updateBudget } from "@/infrastructure/repositories/kakeibo-repository";
import { normalizeOptionalString } from "@/lib/request";

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "YYYY-MM 形式で入力してください。"),
  category_id: z.string().nullable().optional(),
  budget_amount: z.number().int().positive("予算額は1円以上で入力してください。"),
  alert_threshold_percent: z.number().int().min(1).max(100),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = schema.parse(await request.json());

    await updateBudget(id, {
      month: body.month,
      category_id: normalizeOptionalString(body.category_id),
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
