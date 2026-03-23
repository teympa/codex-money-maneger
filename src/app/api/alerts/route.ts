import { NextResponse } from "next/server";
import { getAlerts } from "@/infrastructure/repositories/kakeibo-repository";

export async function GET() {
  return NextResponse.json(await getAlerts());
}
