import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createAccount, getAccounts } from "@/infrastructure/repositories/kakeibo-repository";
import { normalizeOptionalString } from "@/lib/request";

const schema = z.object({
  name: z.string().min(1, "口座名を入力してください。"),
  type: z.enum(["bank", "cash", "card", "emoney", "wallet", "points"]),
  institution_name: z.string().nullable().optional(),
  opening_balance: z.number().int(),
  is_active: z.boolean().default(true),
  last_synced_at: z.string().nullable().default(null),
});

export async function GET() {
  return NextResponse.json(await getAccounts());
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    await createAccount({
      name: body.name,
      type: body.type,
      institution_name: normalizeOptionalString(body.institution_name),
      opening_balance: body.opening_balance,
      is_active: body.is_active,
      last_synced_at: body.last_synced_at,
    });
    return NextResponse.json({ message: "口座を登録しました。" });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.errors[0]?.message ?? "入力内容が正しくありません。" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "口座の登録に失敗しました。" },
      { status: 500 },
    );
  }
}
