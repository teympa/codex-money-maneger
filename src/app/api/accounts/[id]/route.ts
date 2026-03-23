import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { deleteAccount, updateAccount } from "@/infrastructure/repositories/kakeibo-repository";
import { normalizeOptionalString } from "@/lib/request";

const schema = z.object({
  name: z.string().min(1, "口座名を入力してください。").optional(),
  type: z.enum(["bank", "cash", "card", "emoney", "wallet", "points"]).optional(),
  institution_name: z.string().nullable().optional(),
  opening_balance: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = schema.parse(await request.json());
    const { id } = await params;

    await updateAccount(id, {
      ...body,
      institution_name:
        body.institution_name === undefined ? undefined : normalizeOptionalString(body.institution_name),
    });

    return NextResponse.json({ message: "口座を更新しました。" });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.errors[0]?.message ?? "入力内容が正しくありません。" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "口座の更新に失敗しました。" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteAccount(id);
    return NextResponse.json({ message: "口座を削除しました。" });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "口座の削除に失敗しました。利用中の口座は削除できない可能性があります。",
      },
      { status: 500 },
    );
  }
}
