import { NextResponse } from "next/server";
import { markAlertAsRead } from "@/infrastructure/repositories/kakeibo-repository";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await markAlertAsRead(id);
  return NextResponse.json({ message: "アラートを既読にしました。" });
}
