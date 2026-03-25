import { LoaderCircle } from "lucide-react";
import { Card } from "@/components/shared/card";
import { cn } from "@/lib/utils";

export function LoadingScreen({
  title = "読み込み中",
  description = "家計データを読み込んでいます…",
  compact = false,
  className,
}: {
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center",
        compact ? "min-h-[40vh]" : "min-h-[70vh]",
        className,
      )}
    >
      <Card className="w-full max-w-xl p-6 sm:p-7">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent)",
            }}
          >
            <LoaderCircle className="h-6 w-6 animate-spin" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-ink">{title}</p>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <LoadingRow width="92%" />
          <LoadingRow width="76%" />
          <LoadingRow width="100%" />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <LoadingPanel />
          <LoadingPanel />
        </div>
      </Card>
    </div>
  );
}

function LoadingRow({ width }: { width: string }) {
  return (
    <div
      className="h-3 rounded-full"
      style={{
        width,
        background: "linear-gradient(90deg, rgba(148, 163, 184, 0.18), rgba(148, 163, 184, 0.34), rgba(148, 163, 184, 0.18))",
      }}
    />
  );
}

function LoadingPanel() {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: "var(--card-border)",
        background: "rgba(148, 163, 184, 0.12)",
      }}
    >
      <div className="h-3 w-24 rounded-full bg-slate-300/40" />
      <div className="mt-4 h-8 w-32 rounded-full bg-slate-300/40" />
      <div className="mt-3 h-3 w-full rounded-full bg-slate-300/40" />
    </div>
  );
}
