export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

export function isDemoModeEnabled() {
  return process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function getAppBaseUrl() {
  return process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function hasConfiguredLineMessagingApi() {
  return Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_SECRET);
}

export function hasStrongCronSecret() {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  if (cronSecret === "change-me") return false;
  return cronSecret.length >= 16;
}

export function getProductionReadiness() {
  const appBaseUrl = getAppBaseUrl();
  const usesHttps = appBaseUrl.startsWith("https://");
  const looksTemporaryUrl =
    appBaseUrl.includes("ngrok") ||
    appBaseUrl.includes("localhost") ||
    appBaseUrl.includes("127.0.0.1");

  return {
    appBaseUrl,
    supabaseConfigured: isSupabaseConfigured(),
    lineConfigured: hasConfiguredLineMessagingApi(),
    cronSecretReady: hasStrongCronSecret(),
    usesHttps,
    looksTemporaryUrl,
    demoModeEnabled: isDemoModeEnabled(),
    productionRuntime: isProductionRuntime(),
  };
}
