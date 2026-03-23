import { cn } from "@/lib/utils";

export function StatusBadge({
  tone,
  children,
}: {
  tone: "info" | "warning" | "danger" | "success";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "info" && "bg-slate-100 text-slate-700",
        tone === "warning" && "bg-amber-100 text-amber-800",
        tone === "danger" && "bg-red-100 text-red-700",
        tone === "success" && "bg-emerald-100 text-emerald-700",
      )}
    >
      {children}
    </span>
  );
}
