import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { isDemoModeEnabled, isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }
  }

  return <AppShell>{children}</AppShell>;
}
