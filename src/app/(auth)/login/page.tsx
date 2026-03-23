import { LoginForm } from "@/components/forms/login-form";
import { Card } from "@/components/shared/card";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_65%,#fff7ed_100%)] px-4 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-brand-600">Smart Kakeibo</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink">家計を、毎日判断できる形に。</h1>
          <p className="mt-2 text-sm text-slate-500">
            MVP ではメールログイン中心です。Supabase 未接続やデモモードでも画面確認できるようにしています。
          </p>
        </div>
        <Card className="p-6">
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
