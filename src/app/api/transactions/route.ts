import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createTransaction, getTransactions } from "@/infrastructure/repositories/kakeibo-repository";
import { normalizeOptionalString } from "@/lib/request";
import { validateTransactionPayload } from "@/lib/transaction-validation";

const schema = z.object({
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で入力してください。"),
  amount: z.number().int().positive("金額は1円以上で入力してください。"),
  transaction_kind: z.enum(["income", "expense", "transfer", "adjustment"]),
  from_account_id: z.string().nullable().optional(),
  to_account_id: z.string().nullable().optional(),
  merchant_name: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  source_type: z.enum(["manual", "chat", "csv", "api_sync"]).default("manual"),
  external_id: z.string().nullable().default(null),
  raw_text: z.string().nullable().default(null),
  confidence: z.number().nullable().default(null),
  is_duplicate_candidate: z.boolean().default(false),
});

export async function GET() {
  return NextResponse.json(await getTransactions());
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const payload = {
      ...body,
      from_account_id: normalizeOptionalString(body.from_account_id),
      to_account_id: normalizeOptionalString(body.to_account_id),
      merchant_name: normalizeOptionalString(body.merchant_name),
      category_id: normalizeOptionalString(body.category_id),
      memo: normalizeOptionalString(body.memo),
      external_id: normalizeOptionalString(body.external_id),
      raw_text: normalizeOptionalString(body.raw_text),
    };

    const validationMessage = validateTransactionPayload(payload);

    if (validationMessage) {
      return NextResponse.json({ message: validationMessage }, { status: 400 });
    }

    await createTransaction(payload);

    return NextResponse.json({ message: "明細を登録しました。" });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.errors[0]?.message ?? "入力内容が正しくありません。" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "明細の登録に失敗しました。" },
      { status: 500 },
    );
  }
}
