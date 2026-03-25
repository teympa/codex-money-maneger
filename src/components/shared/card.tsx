import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={cn(
        "theme-card rounded-3xl border p-5",
        "border-[var(--card-border)] bg-[var(--card-background)] shadow-[var(--card-shadow)]",
        className,
      )}
    >
      {children}
    </section>
  );
}
