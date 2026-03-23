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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(49,151,255,0.15),_transparent_40%),linear-gradient(180deg,#f8fbff_0%,#f8fafc_65%,#eef2ff_100%)] pb-24">
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-brand-600">Personal Finance</p>
            <h1 className="text-lg font-semibold text-ink">{APP_NAME}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/chat-input"
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              自然文入力
            </Link>
            <Link
              href="/transactions/new"
              className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-medium text-white"
            >
              明細を追加
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-6 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] transition",
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-500",
                )}
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
