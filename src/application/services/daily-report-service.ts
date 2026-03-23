import { createAdminSupabaseClient } from "@/infrastructure/supabase/admin";
import { sendLineMessage } from "@/application/services/notifier-service";
import { generateDailyReportText, generateDailyReportTextForUser } from "@/application/services/report-service";
import {
  createDailyReportLog,
  getNotificationSetting,
} from "@/infrastructure/repositories/kakeibo-repository";

type NotificationRow = {
  user_id: string;
  line_user_id: string | null;
  line_notifications_enabled: boolean;
  daily_report_enabled: boolean;
  daily_report_time: string;
  overspend_alert_enabled: boolean;
  sync_error_alert_enabled: boolean;
};

function tokyoNow(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(now);
  const valueOf = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  const date = `${valueOf("year")}-${valueOf("month")}-${valueOf("day")}`;
  const time = `${valueOf("hour")}:${valueOf("minute")}`;
  const totalMinutes = Number(valueOf("hour")) * 60 + Number(valueOf("minute"));

  return { date, time, totalMinutes };
}

function parseMinutes(value: string) {
  const [hour, minute] = value.split(":").map((part) => Number(part));
  return hour * 60 + minute;
}

function isWithinWindow(targetTime: string, currentMinutes: number, windowMinutes: number) {
  const targetMinutes = parseMinutes(targetTime);
  return currentMinutes >= targetMinutes && currentMinutes < targetMinutes + windowMinutes;
}

function normalizeLineError(result: Awaited<ReturnType<typeof sendLineMessage>>) {
  if ("reason" in result && result.reason) {
    return result.reason;
  }

  if ("status" in result && result.status) {
    return `LINE push failed (${result.status})`;
  }

  return "LINE送信に失敗しました。";
}

function todayDateString() {
  return tokyoNow().date;
}

export async function runDailyReportForCurrentUser() {
  const setting = await getNotificationSetting();
  const report = await generateDailyReportText();
  const reportDate = todayDateString();

  if (!setting.daily_report_enabled) {
    await createDailyReportLog({
      report_date: reportDate,
      status: "skipped",
      payload_json: { reason: "daily_report_disabled", report },
      sent_at: null,
      error_message: null,
    });

    return {
      status: "skipped" as const,
      reason: "daily_report_disabled",
      report,
    };
  }

  if (!setting.line_notifications_enabled || !setting.line_user_id) {
    await createDailyReportLog({
      report_date: reportDate,
      status: "skipped",
      payload_json: { reason: "line_not_ready", report },
      sent_at: null,
      error_message: null,
    });

    return {
      status: "skipped" as const,
      reason: "line_not_ready",
      report,
    };
  }

  const result = await sendLineMessage({
    lineUserId: setting.line_user_id,
    message: report,
  });

  if (result.ok) {
    await createDailyReportLog({
      report_date: reportDate,
      status: "sent",
      payload_json: { mode: result.mode, report },
      sent_at: new Date().toISOString(),
      error_message: null,
    });

    return {
      status: "sent" as const,
      report,
      mode: result.mode,
    };
  }

  const errorMessage = normalizeLineError(result);
  await createDailyReportLog({
    report_date: reportDate,
    status: result.mode === "mock" ? "mock" : "failed",
    payload_json: { mode: result.mode, report },
    sent_at: result.mode === "mock" ? new Date().toISOString() : null,
    error_message: errorMessage,
  });

  return {
    status: result.mode === "mock" ? ("mock" as const) : ("failed" as const),
    report,
    mode: result.mode,
    reason: errorMessage,
  };
}

export async function runDailyReportsForDueUsers(options?: {
  force?: boolean;
  windowMinutes?: number;
}) {
  const admin = createAdminSupabaseClient();
  const force = options?.force ?? false;
  const windowMinutes = options?.windowMinutes ?? 10;
  const now = tokyoNow();

  const { data: settings, error: settingsError } = await admin
    .from("user_notification_settings")
    .select(
      "user_id,line_user_id,line_notifications_enabled,daily_report_enabled,daily_report_time,overspend_alert_enabled,sync_error_alert_enabled",
    )
    .eq("daily_report_enabled", true)
    .eq("line_notifications_enabled", true)
    .not("line_user_id", "is", null);

  if (settingsError) {
    throw new Error(settingsError.message);
  }

  const rows = ((settings ?? []) as NotificationRow[]).filter((row) =>
    force ? true : isWithinWindow(row.daily_report_time, now.totalMinutes, windowMinutes),
  );

  const results: Array<{
    userId: string;
    status: "sent" | "skipped" | "failed" | "mock";
    reason?: string;
  }> = [];

  for (const row of rows) {
    const { data: existingLog, error: existingLogError } = await admin
      .from("daily_report_logs")
      .select("id,status")
      .eq("user_id", row.user_id)
      .eq("report_date", now.date)
      .in("status", ["sent", "mock"])
      .maybeSingle();

    if (existingLogError) {
      results.push({
        userId: row.user_id,
        status: "failed",
        reason: existingLogError.message,
      });
      continue;
    }

    if (existingLog) {
      results.push({
        userId: row.user_id,
        status: "skipped",
        reason: "already_sent_today",
      });
      continue;
    }

    try {
      const report = await generateDailyReportTextForUser(row.user_id);
      const sendResult = await sendLineMessage({
        lineUserId: row.line_user_id!,
        message: report,
      });

      if (sendResult.ok) {
        const { error } = await admin.from("daily_report_logs").insert({
          user_id: row.user_id,
          report_date: now.date,
          status: "sent",
          payload_json: { mode: sendResult.mode, report, time: now.time },
          sent_at: new Date().toISOString(),
          error_message: null,
        });

        if (error) {
          throw new Error(error.message);
        }

        results.push({ userId: row.user_id, status: "sent" });
        continue;
      }

      const errorMessage = normalizeLineError(sendResult);
      const { error } = await admin.from("daily_report_logs").insert({
        user_id: row.user_id,
        report_date: now.date,
        status: sendResult.mode === "mock" ? "mock" : "failed",
        payload_json: { mode: sendResult.mode, report, time: now.time },
        sent_at: sendResult.mode === "mock" ? new Date().toISOString() : null,
        error_message: errorMessage,
      });

      if (error) {
        throw new Error(error.message);
      }

      results.push({
        userId: row.user_id,
        status: sendResult.mode === "mock" ? "mock" : "failed",
        reason: errorMessage,
      });
    } catch (error) {
      results.push({
        userId: row.user_id,
        status: "failed",
        reason: error instanceof Error ? error.message : "daily_report_failed",
      });
    }
  }

  return {
    date: now.date,
    time: now.time,
    force,
    windowMinutes,
    dueCount: rows.length,
    results,
  };
}
