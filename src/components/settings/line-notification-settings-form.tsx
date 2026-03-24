"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import type { NotificationSetting } from "@/types/domain";

export function LineNotificationSettingsForm({
  initialValue,
}: {
  initialValue: NotificationSetting;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isCheckingWebhook, setIsCheckingWebhook] = useState(false);
  const [latestWebhookUserId, setLatestWebhookUserId] = useState("");
  const [latestWebhookReceivedAt, setLatestWebhookReceivedAt] = useState("");
  const [form, setForm] = useState({
    line_user_id: initialValue.line_user_id ?? "",
    line_notifications_enabled: initialValue.line_notifications_enabled,
    daily_report_enabled: initialValue.daily_report_enabled,
    daily_report_time: initialValue.daily_report_time,
    overspend_alert_enabled: initialValue.overspend_alert_enabled,
    sync_error_alert_enabled: initialValue.sync_error_alert_enabled,
  });

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/notification-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message ?? "通知設定の保存に失敗しました。");
      }

      setMessage(result.message ?? "通知設定を保存しました。");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "通知設定の保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  }

  async function previewReport() {
    setIsPreviewing(true);
    setMessage("");

    try {
      const response = await fetch("/api/daily-report/preview");
      const result = (await response.json()) as { report?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "日次レポートのプレビュー取得に失敗しました。");
      }

      setPreview(result.report ?? "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "日次レポートのプレビュー取得に失敗しました。");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function sendTestMessage() {
    setIsSendingTest(true);
    setMessage("");

    try {
      const response = await fetch("/api/line/test", { method: "POST" });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "LINEへのテスト送信に失敗しました。");
      }

      setMessage(result.message ?? "LINE にテストメッセージを送信しました。");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "LINEへのテスト送信に失敗しました。");
    } finally {
      setIsSendingTest(false);
    }
  }

  async function checkLatestWebhook() {
    setIsCheckingWebhook(true);
    setMessage("");

    try {
      const response = await fetch("/api/line/webhook");
      const result = (await response.json()) as {
        latest?: {
          receivedAt?: string;
          events?: Array<{ sourceUserId?: string | null }>;
        } | null;
      };

      if (!response.ok) {
        throw new Error("Webhook の確認に失敗しました。");
      }

      const firstUserId =
        result.latest?.events?.find((event) => event.sourceUserId)?.sourceUserId ?? "";

      setLatestWebhookUserId(firstUserId);
      setLatestWebhookReceivedAt(result.latest?.receivedAt ?? "");

      if (firstUserId) {
        setForm((current) => ({ ...current, line_user_id: firstUserId }));
        setMessage("最新の Webhook から LINE ユーザーID を反映しました。必要ならそのまま保存してください。");
      } else if (result.latest) {
        setMessage("Webhook は届いていますが、userId を含むイベントは見つかりませんでした。");
      } else {
        setMessage("まだ Webhook を受信していません。LINE からメッセージを送ってから再度確認してください。");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Webhook の確認に失敗しました。");
    } finally {
      setIsCheckingWebhook(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="block text-sm font-medium text-slate-700">LINE ユーザーID</span>
          <input
            value={form.line_user_id}
            onChange={(event) => updateField("line_user_id", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            placeholder="Uxxxxxxxxxxxx"
          />
          <span className="block text-xs text-slate-400">
            Webhook から取得した userId を入れます。分からないときは下の「最新Webhookを確認」を使えます。
          </span>
        </label>

        <label className="space-y-1">
          <span className="block text-sm font-medium text-slate-700">日次レポート送信時刻</span>
          <input
            type="time"
            value={form.daily_report_time}
            onChange={(event) => updateField("daily_report_time", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          />
          <span className="block text-xs text-slate-400">
            毎日レポートを送る基準時刻です。
          </span>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={form.line_notifications_enabled}
            onChange={(event) => updateField("line_notifications_enabled", event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <div>
            <p className="font-medium text-ink">LINE通知を有効にする</p>
            <p className="text-sm text-slate-500">LINE Messaging API の push 通知を使います。</p>
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={form.daily_report_enabled}
            onChange={(event) => updateField("daily_report_enabled", event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <div>
            <p className="font-medium text-ink">毎日レポートを送る</p>
            <p className="text-sm text-slate-500">毎朝の家計レポートを自動送信します。</p>
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={form.overspend_alert_enabled}
            onChange={(event) => updateField("overspend_alert_enabled", event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <div>
            <p className="font-medium text-ink">使いすぎ通知を送る</p>
            <p className="text-sm text-slate-500">予算超過やしきい値超過の通知に使います。</p>
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={form.sync_error_alert_enabled}
            onChange={(event) => updateField("sync_error_alert_enabled", event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <div>
            <p className="font-medium text-ink">連携エラー通知を送る</p>
            <p className="text-sm text-slate-500">今後の外部連携や同期失敗の通知に使います。</p>
          </div>
        </label>
      </div>

      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-ink">接続手順の目安</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>環境変数に `LINE_CHANNEL_ACCESS_TOKEN` と `LINE_CHANNEL_SECRET` を設定する</li>
          <li>LINE Developers で Webhook URL に `/api/line/webhook` を設定する</li>
          <li>公式アカウントへ 1 通メッセージを送り、Webhook を受ける</li>
          <li>「最新Webhookを確認」で userId を反映し、通知設定を保存する</li>
          <li>「LINEにテスト送信」で実際に届くか確認する</li>
        </ol>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={saveSettings} disabled={isSaving}>
          {isSaving ? "保存中..." : "通知設定を保存"}
        </Button>
        <Button type="button" variant="secondary" onClick={checkLatestWebhook} disabled={isCheckingWebhook}>
          {isCheckingWebhook ? "確認中..." : "最新Webhookを確認"}
        </Button>
        <Button type="button" variant="secondary" onClick={sendTestMessage} disabled={isSendingTest}>
          {isSendingTest ? "送信中..." : "LINEにテスト送信"}
        </Button>
        <Button type="button" variant="secondary" onClick={previewReport} disabled={isPreviewing}>
          {isPreviewing ? "取得中..." : "今日のレポートをプレビュー"}
        </Button>
      </div>

      {latestWebhookUserId ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-medium text-ink">最新Webhookで見つかった userId</p>
          <p className="mt-2 break-all font-mono text-xs text-slate-700">{latestWebhookUserId}</p>
          {latestWebhookReceivedAt ? (
            <p className="mt-2 text-xs text-slate-500">受信日時: {latestWebhookReceivedAt}</p>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{message}</div>
      ) : null}

      {preview ? (
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-ink">プレビュー</p>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{preview}</pre>
        </div>
      ) : null}
    </div>
  );
}
