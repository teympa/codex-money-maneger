import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <section className={cn("rounded-3xl border border-slate-200 bg-white p-5 shadow-soft", className)}>{children}</section>;
}
