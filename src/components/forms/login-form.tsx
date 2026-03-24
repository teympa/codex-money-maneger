"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/shared/button";

const schema = z.object({
  email: z.string().email("メールアドレスを正しく入力してください。"),
});

type FormValues = z.infer<typeof schema>;

const demoModeEnabled =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
  process.env.NODE_ENV !== "production";

export function LoginForm() {
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "demo@smart-kakeibo.local" },
  });

  async function onSubmit(values: FormValues) {
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const result = (await response.json()) as { message?: string; redirectTo?: string };

    if (!response.ok) {
      setMessage(result.message ?? "ログインに失敗しました。");
      return;
    }

    if (result.redirectTo) {
      window.location.href = result.redirectTo;
      return;
    }

    setMessage(result.message ?? "ログインリンクを送信しました。");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">メールアドレス</label>
        <input
          {...register("email")}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-200 transition focus:ring"
          placeholder="name@example.com"
        />
        {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
      </div>
      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? "送信中..." : "ログインリンクを送る"}
      </Button>
      {demoModeEnabled ? (
        <Link
          href="/dashboard"
          className="block rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:text-brand-700"
        >
          デモモードでダッシュボードへ進む
        </Link>
      ) : null}
      {message ? <p className="text-sm text-slate-500">{message}</p> : null}
    </form>
  );
}
