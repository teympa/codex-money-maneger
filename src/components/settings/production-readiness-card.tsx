import { Card } from "@/components/shared/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getProductionReadiness } from "@/lib/env";

function ReadinessRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <p className="font-medium text-ink">{label}</p>
        <p className="mt-1 text-sm text-slate-500">{detail}</p>
      </div>
      <StatusBadge tone={ok ? "success" : "warning"}>{ok ? "OK" : "要確認"}</StatusBadge>
    </div>
  );
}

export function ProductionReadinessCard() {
  const readiness = getProductionReadiness();

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">本番運用チェック</h2>
          <p className="mt-1 text-sm text-slate-500">
            本番URL、Cron、LINE 通知まわりの設定が揃っているかを確認できます。
          </p>
        </div>
        <StatusBadge
          tone={
            readiness.supabaseConfigured &&
            readiness.lineConfigured &&
            readiness.cronSecretReady &&
            readiness.usesHttps &&
            !readiness.looksTemporaryUrl
              ? "success"
              : "warning"
          }
        >
          {readiness.supabaseConfigured &&
          readiness.lineConfigured &&
          readiness.cronSecretReady &&
          readiness.usesHttps &&
          !readiness.looksTemporaryUrl
            ? "本番向け"
            : "準備中"}
        </StatusBadge>
      </div>

      <div className="space-y-3">
        <ReadinessRow
          label="APP_BASE_URL"
          ok={readiness.usesHttps && !readiness.looksTemporaryUrl}
          detail={`現在のURL: ${readiness.appBaseUrl}`}
        />
        <ReadinessRow
          label="Supabase 接続"
          ok={readiness.supabaseConfigured}
          detail={readiness.supabaseConfigured ? "Supabase の URL / Key が設定されています。" : "Supabase の接続情報を確認してください。"}
        />
        <ReadinessRow
          label="LINE Messaging API"
          ok={readiness.lineConfigured}
          detail={readiness.lineConfigured ? "LINE のチャネル設定が入っています。" : "LINE_CHANNEL_ACCESS_TOKEN と LINE_CHANNEL_SECRET を設定してください。"}
        />
        <ReadinessRow
          label="CRON_SECRET"
          ok={readiness.cronSecretReady}
          detail={readiness.cronSecretReady ? "十分な長さのシークレットが設定されています。" : "change-me のままにせず、16文字以上のランダム文字列に変更してください。"}
        />
        <ReadinessRow
          label="デモモード"
          ok={!readiness.demoModeEnabled}
          detail={readiness.demoModeEnabled ? "現在は DEMO_MODE が有効です。本番では OFF を推奨します。" : "デモモードは無効です。"}
        />
      </div>
    </Card>
  );
}
