import { NextResponse } from "next/server";
import { runDailyReportsForDueUsers } from "@/application/services/daily-report-service";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ message: "CRON_SECRET is not configured" }, { status: 401 });
  }

  if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let force = false;
  let windowMinutes = 10;

  try {
    const body = (await request.json()) as { force?: boolean; windowMinutes?: number };
    force = body.force ?? false;
    windowMinutes = body.windowMinutes ?? 10;
  } catch {
    // empty body is allowed
  }

  const result = await runDailyReportsForDueUsers({ force, windowMinutes });
  return NextResponse.json({
    message: "daily reports processed",
    result,
  });
}
