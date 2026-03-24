import { LineNotificationSettingsForm } from "@/components/settings/line-notification-settings-form";
import { ClassificationRulesManager } from "@/components/settings/classification-rules-manager";
import { CategoriesManager } from "@/components/settings/categories-manager";
import { ProductionReadinessCard } from "@/components/settings/production-readiness-card";
import { SettingsSection } from "@/components/settings/settings-section";
import { Card } from "@/components/shared/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  getAccounts,
  getCategories,
  getClassificationRules,
  getDailyReportLogs,
  getNotificationSetting,
} from "@/infrastructure/repositories/kakeibo-repository";

function SummaryTile({
  label,
  value,
  tone = "info",
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "info";
}) {
  return (
    <Card className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-semibold text-ink">{value}</p>
        <StatusBadge tone={tone}>{value}</StatusBadge>
      </div>
    </Card>
  );
}

export default async function SettingsPage() {
  const [notification, categories, accounts, rules, reportLogs] = await Promise.all([
    getNotificationSetting(),
    getCategories(),
    getAccounts(),
    getClassificationRules(),
    getDailyReportLogs(5),
  ]);

  const latestLog = reportLogs[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="設定"
        description="よく使う設定を上に、運用まわりの設定は必要なときだけ開ける形に整理しています。"
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label="カテゴリ数"
          value={`${categories.length}件`}
          tone="info"
        />
        <SummaryTile
          label="分類ルール"
          value={`${rules.length}件`}
          tone="info"
        />
        <SummaryTile
          label="LINE通知"
          value={notification.line_notifications_enabled ? "有効" : "無効"}
          tone={notification.line_notifications_enabled ? "success" : "warning"}
        />
        <SummaryTile
          label="毎日レポート"
          value={notification.daily_report_enabled ? notification.daily_report_time : "停止中"}
          tone={notification.daily_report_enabled ? "success" : "info"}
        />
      </section>

      <SettingsSection
        title="カテゴリ設定"
        description="固定費、変動費、貯金、収入ごとにカテゴリを整理して、表示順や色も調整できます。"
        defaultOpen
      >
        <CategoriesManager categories={categories} />
      </SettingsSection>

      <SettingsSection
        title="自動分類ルール"
        description="キーワードや加盟店のパターンに応じて、カテゴリや口座候補を自動で補完できます。"
        defaultOpen
        action={<StatusBadge tone="info">{rules.length}件</StatusBadge>}
      >
        <ClassificationRulesManager rules={rules} categories={categories} accounts={accounts} />
      </SettingsSection>

      <SettingsSection
        title="本番運用チェック"
        description="本番URL、Supabase、LINE、Cron、デモモードの状態を確認できます。"
        defaultOpen={false}
      >
        <ProductionReadinessCard />
      </SettingsSection>

      <SettingsSection
        title="LINE通知と日次レポート"
        description="LINE 連携、毎朝のレポート、テスト送信、Webhook 確認をここでまとめて行えます。"
        defaultOpen={false}
        action={
          <StatusBadge tone={notification.line_notifications_enabled ? "success" : "info"}>
            {notification.line_notifications_enabled ? "通知ON" : "通知OFF"}
          </StatusBadge>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <LineNotificationSettingsForm initialValue={notification} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-ink">最近の送信ログ</h3>
                <p className="mt-1 text-sm text-slate-500">
                  日次レポートの送信結果を新しい順で確認できます。
                </p>
              </div>
              <StatusBadge
                tone={
                  latestLog?.status === "sent"
                    ? "success"
                    : latestLog?.status === "failed"
                      ? "danger"
                      : latestLog?.status === "mock"
                        ? "info"
                        : "warning"
                }
              >
                {latestLog?.status ?? "ログなし"}
              </StatusBadge>
            </div>

            <div className="space-y-3">
              {reportLogs.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  まだ送信ログはありません。テスト送信か日次レポート実行後にここへ表示されます。
                </div>
              ) : (
                reportLogs.map((log) => (
                  <div key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-ink">{log.report_date}</p>
                        <p className="mt-1 text-xs text-slate-400">{log.created_at}</p>
                      </div>
                      <StatusBadge
                        tone={
                          log.status === "sent"
                            ? "success"
                            : log.status === "failed"
                              ? "danger"
                              : log.status === "mock"
                                ? "info"
                                : "warning"
                        }
                      >
                        {log.status}
                      </StatusBadge>
                    </div>
                    {log.error_message ? (
                      <p className="mt-3 text-sm text-red-600">{log.error_message}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
