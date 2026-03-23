import { NextResponse } from "next/server";
import { generateDailyReportText } from "@/application/services/report-service";

export async function GET() {
  const report = await generateDailyReportText();
  return NextResponse.json({ report });
}
