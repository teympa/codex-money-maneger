import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { deleteCategory, updateCategory } from "@/infrastructure/repositories/kakeibo-repository";

const schema = z.object({
  name: z.string().min(1, "カテゴリ名を入力してください。"),
  type: z.enum(["fixed", "variable", "savings", "income"]),
  color: z
    .string()
    .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "色は #RRGGBB 形式で入力してください。"),
  sort_order: z.coerce.number().int().min(0, "並び順は0以上で入力してください。"),
});

function getCategoryDeleteErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "カテゴリの削除に失敗しました。";
  }

  const message = error.message.toLowerCase();
  if (message.includes("violates row-level security")) {
    return "カテゴリの削除権限がありません。";
  }

  return error.message || "カテゴリの削除に失敗しました。";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = schema.parse(await request.json());

    await updateCategory(id, {
      name: body.name.trim(),
      type: body.type,
      color: body.color,
      sort_order: body.sort_order,
    });

    return NextResponse.json({ message: "カテゴリを更新しました。" });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.errors[0]?.message ?? "入力内容を確認してください。" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "カテゴリの更新に失敗しました。" },
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
    await deleteCategory(id);
    return NextResponse.json({ message: "カテゴリを削除しました。" });
  } catch (error) {
    return NextResponse.json(
      { message: getCategoryDeleteErrorMessage(error) },
      { status: 500 },
    );
  }
}
