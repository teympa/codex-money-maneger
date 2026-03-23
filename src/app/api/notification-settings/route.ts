import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { updateNotificationSetting } from "@/infrastructure/repositories/kakeibo-repository";
import { normalizeOptionalString } from "@/lib/request";

const schema = z.object({
  line_user_id: z.string().nullable().optional(),
  line_notifications_enabled: z.boolean(),
  daily_report_enabled: z.boolean(),
  daily_report_time: z.string().regex(/^\d{2}:\d{2}$/, "通知時刻は HH:MM 形式で入力してください。"),
  overspend_alert_enabled: z.boolean(),
  sync_error_alert_enabled: z.boolean(),
});

export async function PATCH(request: Request) {
  try {
    const body = schema.parse(await request.json());

    await updateNotificationSetting({
      line_user_id: normalizeOptionalString(body.line_user_id),
      line_notifications_enabled: body.line_notifications_enabled,
      daily_report_enabled: body.daily_report_enabled,
      daily_report_time: body.daily_report_time,
      overspend_alert_enabled: body.overspend_alert_enabled,
      sync_error_alert_enabled: body.sync_error_alert_enabled,
    });

    return NextResponse.json({ message: "通知設定を更新しました。" });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.errors[0]?.message ?? "入力内容を確認してください。" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "通知設定の更新に失敗しました。" },
      { status: 500 },
    );
  }
}
