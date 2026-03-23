import { Card } from "@/components/shared/card";

export function StatCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: string;
  helper?: string;
}) {
  return (
    <Card className="space-y-1">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-semibold text-ink">{value}</p>
      {helper ? <p className="text-xs text-slate-400">{helper}</p> : null}
    </Card>
  );
}
