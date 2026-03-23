import { LineNotificationSettingsForm } from "@/components/settings/line-notification-settings-form";
import { ClassificationRulesManager } from "@/components/settings/classification-rules-manager";
import { CategoriesManager } from "@/components/settings/categories-manager";
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

const placeholderSections = ["口座設定", "先取り貯金設定"];

export default async function SettingsPage() {
  const [notification, categories, accounts, rules, reportLogs] = await Promise.all([
    getNotificationSetting(),
    getCategories(),
    getAccounts(),
    getClassificationRules(),
    getDailyReportLogs(5),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="設定"
        description="通知、カテゴリ、自動分類ルールなど、毎日の運用に関わる設定をまとめています。"
      />

      <Card className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">LINE通知と日次レポート</h2>
            <p className="mt-1 text-sm text-slate-500">
              通知のON/OFF、日次レポートの時刻、LINEユーザーIDをここで管理します。
            </p>
          </div>
          <StatusBadge tone={notification.line_notifications_enabled ? "success" : "info"}>
            {notification.line_notifications_enabled ? "LINE通知 ON" : "LINE通知 OFF"}
          </StatusBadge>
        </div>

        <LineNotificationSettingsForm initialValue={notification} />

        <div className="rounded-2xl bg-slate-50 p-4">
          <h3 className="text-sm font-medium text-ink">最近の日次レポートログ</h3>
          <div className="mt-3 space-y-3">
            {reportLogs.length === 0 ? (
              <p className="text-sm text-slate-500">まだ送信ログはありません。</p>
            ) : (
              reportLogs.map((log) => (
                <div key={log.id} className="rounded-2xl bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-ink">{log.report_date}</p>
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
                    <p className="mt-2 text-sm text-slate-500">{log.error_message}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">カテゴリ設定</h2>
          <p className="mt-1 text-sm text-slate-500">
            表示順や色、カテゴリ種別をここで見直せます。不要なカテゴリの編集や削除もここから行えます。
          </p>
        </div>

        <CategoriesManager categories={categories} />
      </Card>

      <Card className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">自動分類ルール</h2>
          <p className="mt-1 text-sm text-slate-500">
            入力文に含まれるキーワードや店名パターンに応じて、カテゴリや口座候補を自動補正します。
          </p>
        </div>

        <ClassificationRulesManager rules={rules} categories={categories} accounts={accounts} />
      </Card>

      <section className="grid gap-4 sm:grid-cols-2">
        {placeholderSections.map((section) => (
          <Card key={section}>
            <p className="font-medium text-ink">{section}</p>
            <p className="mt-2 text-sm text-slate-500">
              この設定は次の段階で画面から調整できるようにする予定です。
            </p>
          </Card>
        ))}
      </section>
    </div>
  );
}
