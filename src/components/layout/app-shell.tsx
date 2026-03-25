"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Flag, LayoutDashboard, List, Settings, Wallet } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/transactions", label: "明細", icon: List },
  { href: "/accounts", label: "口座", icon: Wallet },
  { href: "/budgets", label: "予算", icon: CreditCard },
  { href: "/goals", label: "目標", icon: Flag },
  { href: "/settings", label: "設定", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      className="min-h-screen pb-24"
      style={{
        backgroundImage: "var(--app-background)",
        color: "var(--text-main)",
      }}
    >
      <header
        className="theme-shell-header sticky top-0 z-20 border-b backdrop-blur"
        style={{
          background: "var(--topbar-background)",
          borderColor: "var(--topbar-border)",
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em]" style={{ color: "var(--accent)" }}>
              Personal Finance
            </p>
            <h1 className="text-lg font-semibold" style={{ color: "var(--text-main)" }}>
              {APP_NAME}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/chat-input"
              className="theme-button theme-button--secondary rounded-full border px-3 py-2 text-sm font-medium"
              style={{
                borderColor: "rgba(0, 0, 0, 0.7)",
                background: "var(--button-secondary-background)",
                color: "var(--button-secondary-text)",
              }}
            >
              自然文で入力
            </Link>
            <Link
              href="/transactions/new"
              className="theme-button theme-button--primary rounded-full px-4 py-2 text-sm font-medium"
              style={{
                background: "var(--accent)",
                color: "var(--button-primary-text, #ffffff)",
              }}
            >
              明細を追加
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <nav
        className="theme-shell-nav fixed inset-x-0 bottom-0 z-20 border-t px-2 py-2 backdrop-blur"
        style={{
          background: "var(--nav-background)",
          borderColor: "var(--nav-border)",
        }}
      >
        <div className="mx-auto grid max-w-3xl grid-cols-6 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={isActive}
                className={cn(
                  "theme-nav-item flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] transition",
                )}
                style={{
                  background: isActive
                    ? "var(--nav-item-active-background)"
                    : "var(--nav-item-background)",
                  color: isActive ? "var(--nav-item-active-text)" : "var(--nav-item-text)",
                }}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
