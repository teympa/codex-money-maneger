import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppBaseUrl, isDemoModeEnabled, isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const body = schema.parse(await request.json());

  if (isDemoModeEnabled() || !isSupabaseConfigured()) {
    return NextResponse.json({
      message: `デモモードで利用します。入力メール: ${body.email}`,
      redirectTo: "/dashboard",
    });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: body.email,
    options: {
      emailRedirectTo: `${getAppBaseUrl()}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({
    message: "ログインリンクを送信しました。メールを確認してください。",
  });
}
