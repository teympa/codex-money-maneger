import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { parseNaturalLanguageTransaction } from "@/infrastructure/repositories/kakeibo-repository";

const schema = z.object({
  text: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    return NextResponse.json(await parseNaturalLanguageTransaction(body.text));
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.errors[0]?.message ?? "入力内容が正しくありません。" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "解析に失敗しました。" },
      { status: 500 },
    );
  }
}
