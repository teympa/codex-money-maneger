function withProtocol(value: string) {
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.includes("vercel.app") || value.includes("ngrok") || value.includes(".")) {
    return `https://${value}`;
  }
  return value;
}

function normalizeAppUrl(value: string) {
  const candidate = withProtocol(value.trim());

  try {
    const url = new URL(candidate);
    return url.origin;
  } catch {
    return candidate.replace(/\/+$/, "");
  }
}

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

export function isDemoModeRequested() {
  return process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function isDemoModeEnabled() {
  const requested = isDemoModeRequested();
  const allowInProduction = process.env.ALLOW_DEMO_MODE_IN_PRODUCTION === "true";

  if (isProductionRuntime() && !allowInProduction) {
    return false;
  }

  return requested;
}

export function getAppBaseUrl() {
  const rawValue = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return normalizeAppUrl(rawValue);
}

export function getDashboardUrl() {
  return `${getAppBaseUrl().replace(/\/$/, "")}/dashboard`;
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
    demoModeRequested: isDemoModeRequested(),
    demoModeEnabled: isDemoModeEnabled(),
    productionRuntime: isProductionRuntime(),
  };
}
