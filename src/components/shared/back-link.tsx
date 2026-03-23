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
      className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
    >
      <ChevronLeft className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}
