"use client";

import { Gamepad2, Sparkles } from "lucide-react";
import { Card } from "@/components/shared/card";
import { useTheme, type AppTheme } from "@/components/theme/theme-provider";

const THEMES: Array<{
  id: AppTheme;
  label: string;
  description: string;
  icon: typeof Sparkles;
}> = [
  {
    id: "default",
    label: "標準テーマ",
    description: "今の見やすさをそのまま使う通常表示です。",
    icon: Sparkles,
  },
  {
    id: "game",
    label: "ゲームUI",
    description: "配置はそのままで、近未来HUD風の見た目に切り替えます。",
    icon: Gamepad2,
  },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">表示テーマ</h2>
        <p className="mt-1 text-sm text-slate-500">
          アプリ内で見た目をすぐ切り替えられます。サイズや配置はそのままです。
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {THEMES.map((item) => {
          const Icon = item.icon;
          const isActive = theme === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTheme(item.id)}
              className="rounded-2xl border p-4 text-left transition"
              style={
                isActive
                  ? {
                      borderColor: "var(--accent)",
                      background: "var(--button-secondary-background)",
                      boxShadow:
                        "0 0 0 1px color-mix(in srgb, var(--accent) 26%, transparent), 0 0 22px color-mix(in srgb, var(--accent) 14%, transparent)",
                    }
                  : {
                      borderColor: "var(--card-border)",
                      background: "var(--card-background)",
                    }
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" style={{ color: "var(--accent)" }} />
                  <p className="font-medium" style={{ color: "var(--text-main)" }}>
                    {item.label}
                  </p>
                </div>
                <span
                  className="inline-flex rounded-2xl px-3 py-2 text-sm font-medium"
                  style={
                    isActive
                      ? {
                          background: "var(--accent)",
                          color: "var(--button-primary-text, #ffffff)",
                        }
                      : {
                          background: "var(--button-secondary-background)",
                          color: "var(--button-secondary-text)",
                        }
                  }
                >
                  {isActive ? "使用中" : "切り替え"}
                </span>
              </div>
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                {item.description}
              </p>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
