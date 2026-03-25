import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="theme-button theme-button--secondary inline-flex items-center gap-1 rounded-2xl border px-3 py-2 text-sm font-medium"
      style={{
        borderColor: "rgba(0, 0, 0, 0.7)",
        background: "var(--button-secondary-background)",
        color: "var(--button-secondary-text)",
      }}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}
