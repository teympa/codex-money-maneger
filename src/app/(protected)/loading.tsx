import { LoadingScreen } from "@/components/shared/loading-screen";

export default function Loading() {
  return (
    <LoadingScreen
      title="画面を読み込み中"
      description="家計の最新情報を読み込んでいます…"
    />
  );
}
