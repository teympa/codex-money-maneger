import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { deleteTransaction, updateTransaction } from "@/infrastructure/repositories/kakeibo-repository";
import { normalizeOptionalString } from "@/lib/request";
import { validateTransactionPayload } from "@/lib/transaction-validation";

const schema = z.object({
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で入力してください。").optional(),
  amount: z.number().int().positive("金額は1円以上で入力してください。").optional(),
  transaction_kind: z.enum(["income", "expense", "transfer", "adjustment"]).optional(),
  from_account_id: z.string().nullable().optional(),
  to_account_id: z.string().nullable().optional(),
  merchant_name: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  source_type: z.enum(["manual", "chat", "csv", "api_sync"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = schema.parse(await request.json());
    const { id } = await params;

    const payload = {
      ...body,
      from_account_id:
        body.from_account_id === undefined ? undefined : normalizeOptionalString(body.from_account_id),
      to_account_id: body.to_account_id === undefined ? undefined : normalizeOptionalString(body.to_account_id),
      merchant_name:
        body.merchant_name === undefined ? undefined : normalizeOptionalString(body.merchant_name),
      category_id: body.category_id === undefined ? undefined : normalizeOptionalString(body.category_id),
      memo: body.memo === undefined ? undefined : normalizeOptionalString(body.memo),
    };

    const kindForValidation = payload.transaction_kind;
    if (kindForValidation) {
      const validationMessage = validateTransactionPayload({
        transaction_kind: kindForValidation,
        from_account_id: payload.from_account_id,
        to_account_id: payload.to_account_id,
      });

      if (validationMessage) {
        return NextResponse.json({ message: validationMessage }, { status: 400 });
      }
    }

    await updateTransaction(id, payload);
    return NextResponse.json({ message: "明細を更新しました。" });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.errors[0]?.message ?? "入力内容が正しくありません。" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "明細の更新に失敗しました。" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteTransaction(id);
    return NextResponse.json({ message: "明細を削除しました。" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "明細の削除に失敗しました。" },
      { status: 500 },
    );
  }
}
