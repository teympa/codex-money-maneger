import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { calculateMonthlyRequiredAmount } from "@/domain/finance";
import { createGoal, getGoals } from "@/infrastructure/repositories/kakeibo-repository";

const schema = z.object({
  title: z.string().min(1, "目標名を入力してください。"),
  target_amount: z.number().int().positive("目標金額は1円以上で入力してください。"),
  current_amount: z.number().int().min(0, "現在額は0円以上で入力してください。"),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "期限は YYYY-MM-DD 形式で入力してください。"),
  priority: z.number().int().min(1, "優先度は1以上で入力してください。").max(5, "優先度は5以下で入力してください。"),
});

export async function GET() {
  return NextResponse.json(await getGoals());
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    await createGoal({
      ...body,
      title: body.title.trim(),
      monthly_required_amount: calculateMonthlyRequiredAmount(body.target_amount, body.current_amount, body.deadline),
      is_active: true,
    });

    return NextResponse.json({ message: "目標を追加しました。" });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.errors[0]?.message ?? "入力内容を確認してください。" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "目標の追加に失敗しました。" },
      { status: 500 },
    );
  }
}
