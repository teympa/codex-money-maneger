import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import {
  deleteClassificationRule,
  updateClassificationRule,
} from "@/infrastructure/repositories/kakeibo-repository";
import { normalizeRuleKeywords } from "@/lib/classification-rules";
import { normalizeOptionalString } from "@/lib/request";

const schema = z.object({
  keyword: z.string().min(1, "キーワードを入力してください。"),
  merchant_pattern: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  account_id: z.string().nullable().optional(),
  priority: z.coerce.number().int().min(1).max(99),
});

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteClassificationRule(id);
    return NextResponse.json({ message: "自動分類ルールを削除しました。" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "自動分類ルールの削除に失敗しました。" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = schema.parse(await request.json());
    const keyword = normalizeRuleKeywords(body.keyword);

    if (!keyword) {
      return NextResponse.json({ message: "キーワードを入力してください。" }, { status: 400 });
    }

    await updateClassificationRule(id, {
      keyword,
      merchant_pattern: normalizeOptionalString(body.merchant_pattern),
      category_id: normalizeOptionalString(body.category_id),
      account_id: normalizeOptionalString(body.account_id),
      priority: body.priority,
    });

    return NextResponse.json({ message: "自動分類ルールを更新しました。" });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.errors[0]?.message ?? "入力内容を確認してください。" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "自動分類ルールの更新に失敗しました。" },
      { status: 500 },
    );
  }
}
