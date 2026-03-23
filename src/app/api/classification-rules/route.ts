import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import {
  createClassificationRule,
  deleteClassificationRules,
  getClassificationRules,
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

const deleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "削除するルールを選択してください。"),
});

export async function GET() {
  return NextResponse.json(await getClassificationRules());
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const keyword = normalizeRuleKeywords(body.keyword);

    if (!keyword) {
      return NextResponse.json({ message: "キーワードを入力してください。" }, { status: 400 });
    }

    await createClassificationRule({
      keyword,
      merchant_pattern: normalizeOptionalString(body.merchant_pattern),
      category_id: normalizeOptionalString(body.category_id),
      account_id: normalizeOptionalString(body.account_id),
      priority: body.priority,
    });

    return NextResponse.json({ message: "自動分類ルールを追加しました。" });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.errors[0]?.message ?? "入力内容を確認してください。" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "自動分類ルールの追加に失敗しました。" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = deleteSchema.parse(await request.json());
    await deleteClassificationRules(body.ids);
    return NextResponse.json({ message: "選択した自動分類ルールを削除しました。" });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.errors[0]?.message ?? "入力内容を確認してください。" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "自動分類ルールの削除に失敗しました。" },
      { status: 500 },
    );
  }
}
