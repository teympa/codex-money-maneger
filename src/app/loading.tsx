import { LoadingScreen } from "@/components/shared/loading-screen";

export default function Loading() {
  return (
    <LoadingScreen
      title="起動しています"
      description="Smart Kakeibo を準備しています…"
      compact
    />
  );
}
