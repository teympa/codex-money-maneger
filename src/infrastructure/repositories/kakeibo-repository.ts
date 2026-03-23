import { cache } from "react";
import { calculateAccountBalance } from "@/domain/finance";
import { DEMO_USER_ID } from "@/lib/constants";
import { splitRuleKeywords } from "@/lib/classification-rules";
import { isDemoModeEnabled, isSupabaseConfigured } from "@/lib/env";
import { parseNaturalLanguageTransactionText } from "@/lib/natural-language";
import {
  mockAccounts,
  mockAlerts,
  mockBudgets,
  mockCategories,
  mockClassificationRules,
  mockGoals,
  mockNotificationSetting,
  mockProfile,
  mockTransactions,
} from "@/lib/mock-data";
import { createAdminSupabaseClient } from "@/infrastructure/supabase/admin";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import type {
  Account,
  Alert,
  Budget,
  ClassificationRule,
  Category,
  DailyReportLog,
  NotificationSetting,
  ParsedTransactionCandidate,
  Profile,
  SavingGoal,
  Transaction,
} from "@/types/domain";

type QueryClient =
  | Awaited<ReturnType<typeof createServerSupabaseClient>>
  | ReturnType<typeof createAdminSupabaseClient>;

interface RepositoryContext {
  userId: string;
  queryClient: QueryClient | null;
  writeClient: QueryClient | null;
  isMock: boolean;
  isDemoMode: boolean;
  isAuthenticated: boolean;
}

const ensureDemoUserId = cache(async function ensureDemoUserId() {
  const admin = createAdminSupabaseClient();
  const { data: usersData, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw listError;

  let existingUser = usersData.users.find((user) => user.email === mockProfile.email);
  let userId = existingUser?.id;

  if (!userId) {
    const { data: createdUserData, error: createUserError } = await admin.auth.admin.createUser({
      email: mockProfile.email,
      password: "password123",
      email_confirm: true,
      user_metadata: { name: mockProfile.name },
    });

    if (createUserError) {
      const normalizedMessage = createUserError.message.toLowerCase();
      const duplicateDetected =
        normalizedMessage.includes("already") ||
        normalizedMessage.includes("duplicate") ||
        normalizedMessage.includes("23505");

      if (!duplicateDetected) {
        throw createUserError;
      }

      const { data: retriedUsersData, error: retryListError } = await admin.auth.admin.listUsers();
      if (retryListError) throw retryListError;

      existingUser = retriedUsersData.users.find((user) => user.email === mockProfile.email);
      userId = existingUser?.id;
    } else {
      userId = createdUserData.user?.id;
    }
  }

  if (!userId) {
    throw new Error("デモユーザーの作成に失敗しました。");
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      name: mockProfile.name,
      email: mockProfile.email,
      timezone: mockProfile.timezone,
      currency: mockProfile.currency,
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const { error: notificationError } = await admin.from("user_notification_settings").upsert(
    {
      user_id: userId,
      line_user_id: null,
      line_notifications_enabled: false,
      daily_report_enabled: false,
      daily_report_time: "08:00",
      overspend_alert_enabled: true,
      sync_error_alert_enabled: true,
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  if (notificationError) throw notificationError;

  const { data: existingAccounts } = await admin.from("accounts").select("id").eq("user_id", userId);
  if ((existingAccounts ?? []).length === 0) {
    const accountsToInsert = mockAccounts.map(
      ({ id: _id, user_id: _userId, created_at: _createdAt, updated_at: _updatedAt, ...account }) => ({
        ...account,
        user_id: userId,
      }),
    );

    const { error } = await admin.from("accounts").insert(accountsToInsert);
    if (error) throw error;
  }

  const { data: existingCategories } = await admin.from("categories").select("id").eq("user_id", userId);
  if ((existingCategories ?? []).length === 0) {
    const categoriesToInsert = mockCategories.map(
      ({ id: _id, user_id: _userId, created_at: _createdAt, updated_at: _updatedAt, ...category }) => ({
        ...category,
        user_id: userId,
      }),
    );

    const { error } = await admin.from("categories").insert(categoriesToInsert);
    if (error) throw error;
  }

  const { data: accounts } = await admin.from("accounts").select("id,name").eq("user_id", userId);
  const { data: categories } = await admin.from("categories").select("id,name").eq("user_id", userId);
  const accountMap = new Map((accounts ?? []).map((account) => [account.name, account.id]));
  const categoryMap = new Map((categories ?? []).map((category) => [category.name, category.id]));

  const { data: existingBudgets } = await admin.from("budgets").select("month,category_id").eq("user_id", userId);
  const existingBudgetKeys = new Set(
    (existingBudgets ?? []).map((budget) => `${budget.month}:${budget.category_id ?? "all"}`),
  );
  const budgetsToInsert = mockBudgets
    .map(({ id: _id, user_id: _userId, created_at: _createdAt, updated_at: _updatedAt, category_id, ...budget }) => ({
      ...budget,
      user_id: userId,
      category_id:
        category_id === null
          ? null
          : categoryMap.get(mockCategories.find((category) => category.id === category_id)?.name ?? "") ?? null,
    }))
    .filter((budget) => !existingBudgetKeys.has(`${budget.month}:${budget.category_id ?? "all"}`));
  if (budgetsToInsert.length > 0) {
    const { error } = await admin.from("budgets").insert(budgetsToInsert);
    if (error) throw error;
  }

  const { data: existingGoals } = await admin.from("saving_goals").select("id").eq("user_id", userId);
  if ((existingGoals ?? []).length === 0) {
    const goalsToInsert = mockGoals.map(
      ({ id: _id, user_id: _userId, created_at: _createdAt, updated_at: _updatedAt, ...goal }) => ({
        ...goal,
        user_id: userId,
      }),
    );
    const { error } = await admin.from("saving_goals").insert(goalsToInsert);
    if (error) throw error;
  }

  const transactionsPayload = mockTransactions.map(
    ({
      id: _id,
      user_id: _userId,
      created_at: _createdAt,
      updated_at: _updatedAt,
      from_account_id,
      to_account_id,
      category_id,
      ...transaction
    }) => ({
      ...transaction,
      user_id: userId,
      from_account_id:
        from_account_id === null
          ? null
          : accountMap.get(mockAccounts.find((account) => account.id === from_account_id)?.name ?? "") ?? null,
      to_account_id:
        to_account_id === null
          ? null
          : accountMap.get(mockAccounts.find((account) => account.id === to_account_id)?.name ?? "") ?? null,
      category_id:
        category_id === null
          ? null
          : categoryMap.get(mockCategories.find((category) => category.id === category_id)?.name ?? "") ?? null,
    }),
  );
  const { data: existingTransactions } = await admin
    .from("transactions")
    .select("transaction_date,amount,merchant_name,external_id")
    .eq("user_id", userId);
  const existingTransactionKeys = new Set(
    (existingTransactions ?? []).map(
      (transaction) =>
        `${transaction.transaction_date}:${transaction.amount}:${transaction.merchant_name ?? ""}:${transaction.external_id ?? ""}`,
    ),
  );
  const transactionsToInsert = transactionsPayload.filter(
    (transaction) =>
      !existingTransactionKeys.has(
        `${transaction.transaction_date}:${transaction.amount}:${transaction.merchant_name ?? ""}:${transaction.external_id ?? ""}`,
      ),
  );
  if (transactionsToInsert.length > 0) {
    const { error } = await admin.from("transactions").insert(transactionsToInsert);
    if (error) throw error;
  }

  const { data: existingAlerts } = await admin.from("alerts").select("title").eq("user_id", userId);
  const existingAlertTitles = new Set((existingAlerts ?? []).map((alert) => alert.title));
  const alertsToInsert = mockAlerts
    .filter((alert) => !existingAlertTitles.has(alert.title))
    .map(({ id: _id, user_id: _userId, ...alert }) => ({
      ...alert,
      user_id: userId,
    }));
  if (alertsToInsert.length > 0) {
    const { error } = await admin.from("alerts").insert(alertsToInsert);
    if (error) throw error;
  }

  return userId;
});

async function getRepositoryContext(): Promise<RepositoryContext> {
  if (!isSupabaseConfigured()) {
    return {
      userId: DEMO_USER_ID,
      queryClient: null,
      writeClient: null,
      isMock: true,
      isDemoMode: true,
      isAuthenticated: false,
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    return {
      userId: user.id,
      queryClient: supabase,
      writeClient: supabase,
      isMock: false,
      isDemoMode: false,
      isAuthenticated: true,
    };
  }

  if (isDemoModeEnabled()) {
    const demoUserId = await ensureDemoUserId();
    const admin = createAdminSupabaseClient();
    return {
      userId: demoUserId,
      queryClient: admin,
      writeClient: admin,
      isMock: false,
      isDemoMode: true,
      isAuthenticated: false,
    };
  }

  return {
    userId: "",
    queryClient: null,
    writeClient: null,
    isMock: false,
    isDemoMode: false,
    isAuthenticated: false,
  };
}

function assertReadableContext(context: RepositoryContext) {
  if (!context.isMock && !context.queryClient) {
    throw new Error("認証が必要です。");
  }
}

function assertWritableContext(context: RepositoryContext) {
  if (!context.isMock && !context.writeClient) {
    throw new Error("保存するにはログインが必要です。");
  }
}

function getReadableClient(context: RepositoryContext): QueryClient {
  assertReadableContext(context);
  if (!context.queryClient) {
    throw new Error("読み取りクライアントがありません。");
  }
  return context.queryClient;
}

function getWritableClient(context: RepositoryContext): QueryClient {
  assertWritableContext(context);
  if (!context.writeClient) {
    throw new Error("書き込みクライアントがありません。");
  }
  return context.writeClient;
}

export const getProfile = cache(async (): Promise<Profile> => {
  const context = await getRepositoryContext();
  if (context.isMock) return mockProfile;
  const client = getReadableClient(context);

  const { data, error } = await client.from("profiles").select("*").eq("id", context.userId).single();
  if (error) throw error;
  return (data as Profile) ?? mockProfile;
});

export async function getAccounts(): Promise<Account[]> {
  const context = await getRepositoryContext();
  if (context.isMock) return mockAccounts;
  const client = getReadableClient(context);

  const { data, error } = await client
    .from("accounts")
    .select("*")
    .eq("user_id", context.userId)
    .order("created_at");
  if (error) throw error;
  return (data as Account[]) ?? [];
}

export async function getAccountById(id: string) {
  const context = await getRepositoryContext();
  if (context.isMock) {
    return mockAccounts.find((account) => account.id === id) ?? null;
  }
  const client = getReadableClient(context);

  const { data, error } = await client
    .from("accounts")
    .select("*")
    .eq("id", id)
    .eq("user_id", context.userId)
    .single();
  if (error) throw error;
  return (data as Account) ?? null;
}

export async function getCategories(): Promise<Category[]> {
  const context = await getRepositoryContext();
  if (context.isMock) return mockCategories;
  const client = getReadableClient(context);

  const { data, error } = await client
    .from("categories")
    .select("*")
    .eq("user_id", context.userId)
    .order("sort_order");
  if (error) throw error;
  return (data as Category[]) ?? [];
}

export async function updateCategory(
  id: string,
  input: Partial<Omit<Category, "id" | "user_id" | "created_at" | "updated_at">>,
) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client.from("categories").update(input).eq("id", id).eq("user_id", context.userId);
  if (error) throw error;
  return { ok: true };
}

export async function deleteCategory(id: string) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client.from("categories").delete().eq("id", id).eq("user_id", context.userId);
  if (error) throw error;
  return { ok: true };
}

export async function getClassificationRules(): Promise<ClassificationRule[]> {
  const context = await getRepositoryContext();
  if (context.isMock) return mockClassificationRules;
  const client = getReadableClient(context);

  const { data, error } = await client
    .from("classification_rules")
    .select("*")
    .eq("user_id", context.userId)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ClassificationRule[]) ?? [];
}

export async function getTransactions(): Promise<Transaction[]> {
  const context = await getRepositoryContext();
  if (context.isMock) {
    return [...mockTransactions].sort((a, b) => {
      const byDate = b.transaction_date.localeCompare(a.transaction_date);
      if (byDate !== 0) return byDate;

      const byCreatedAt = b.created_at.localeCompare(a.created_at);
      if (byCreatedAt !== 0) return byCreatedAt;

      return b.id.localeCompare(a.id);
    });
  }
  const client = getReadableClient(context);

  const { data, error } = await client
    .from("transactions")
    .select("*")
    .eq("user_id", context.userId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;
  return (data as Transaction[]) ?? [];
}

export async function getTransactionById(id: string) {
  const context = await getRepositoryContext();
  if (context.isMock) {
    return mockTransactions.find((transaction) => transaction.id === id) ?? null;
  }
  const client = getReadableClient(context);

  const { data, error } = await client
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", context.userId)
    .single();
  if (error) throw error;
  return (data as Transaction) ?? null;
}

export async function getBudgets(): Promise<Budget[]> {
  const context = await getRepositoryContext();
  if (context.isMock) return mockBudgets;
  const client = getReadableClient(context);

  const { data, error } = await client
    .from("budgets")
    .select("*")
    .eq("user_id", context.userId)
    .order("month", { ascending: false });
  if (error) throw error;
  return (data as Budget[]) ?? [];
}

export async function getBudgetById(id: string) {
  const context = await getRepositoryContext();
  if (context.isMock) {
    return mockBudgets.find((budget) => budget.id === id) ?? null;
  }
  const client = getReadableClient(context);

  const { data, error } = await client
    .from("budgets")
    .select("*")
    .eq("id", id)
    .eq("user_id", context.userId)
    .single();
  if (error) throw error;
  return (data as Budget) ?? null;
}

export async function getGoals(): Promise<SavingGoal[]> {
  const context = await getRepositoryContext();
  if (context.isMock) return mockGoals;
  const client = getReadableClient(context);

  const { data, error } = await client
    .from("saving_goals")
    .select("*")
    .eq("user_id", context.userId)
    .order("priority");
  if (error) throw error;
  return (data as SavingGoal[]) ?? [];
}

export async function getGoalById(id: string) {
  const context = await getRepositoryContext();
  if (context.isMock) {
    return mockGoals.find((goal) => goal.id === id) ?? null;
  }
  const client = getReadableClient(context);

  const { data, error } = await client
    .from("saving_goals")
    .select("*")
    .eq("id", id)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return (data as SavingGoal) ?? null;
}

export async function getAlerts(): Promise<Alert[]> {
  const context = await getRepositoryContext();
  if (context.isMock) return mockAlerts;
  const client = getReadableClient(context);

  const { data, error } = await client
    .from("alerts")
    .select("*")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Alert[]) ?? [];
}

export async function getNotificationSetting(): Promise<NotificationSetting> {
  const context = await getRepositoryContext();
  if (context.isMock) return mockNotificationSetting;
  const client = getReadableClient(context);

  const { data, error } = await client
    .from("user_notification_settings")
    .select("*")
    .eq("user_id", context.userId)
    .single();
  if (error) throw error;
  return (data as NotificationSetting) ?? mockNotificationSetting;
}

export async function updateNotificationSetting(
  input: Partial<
    Omit<NotificationSetting, "id" | "user_id" | "created_at" | "updated_at">
  >,
) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client.from("user_notification_settings").upsert(
    {
      user_id: context.userId,
      ...input,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
  return { ok: true };
}

export async function getDailyReportLogs(limit = 5): Promise<DailyReportLog[]> {
  const context = await getRepositoryContext();
  if (context.isMock) return [];
  const client = getReadableClient(context);

  const { data, error } = await client
    .from("daily_report_logs")
    .select("*")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as DailyReportLog[]) ?? [];
}

export async function createDailyReportLog(
  input: Omit<DailyReportLog, "id" | "user_id" | "created_at">,
) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client.from("daily_report_logs").insert({
    ...input,
    user_id: context.userId,
  });
  if (error) throw error;
  return { ok: true };
}

export async function createAccount(input: Omit<Account, "id" | "user_id" | "created_at" | "updated_at">) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client.from("accounts").insert({
    ...input,
    user_id: context.userId,
  });
  if (error) throw error;
  return { ok: true };
}

export async function updateAccount(
  id: string,
  input: Partial<Omit<Account, "id" | "user_id" | "created_at" | "updated_at">>,
) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client.from("accounts").update(input).eq("id", id).eq("user_id", context.userId);
  if (error) throw error;
  return { ok: true };
}

export async function deleteAccount(id: string) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client.from("accounts").delete().eq("id", id).eq("user_id", context.userId);
  if (error) throw error;
  return { ok: true };
}

export async function createTransaction(input: Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at">) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client.from("transactions").insert({
    ...input,
    user_id: context.userId,
  });
  if (error) throw error;
  return { ok: true };
}

export async function updateTransaction(
  id: string,
  input: Partial<Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at">>,
) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client
    .from("transactions")
    .update(input)
    .eq("id", id)
    .eq("user_id", context.userId);
  if (error) throw error;
  return { ok: true };
}

export async function deleteTransaction(id: string) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", context.userId);
  if (error) throw error;
  return { ok: true };
}

export async function createBudget(input: Omit<Budget, "id" | "user_id" | "created_at" | "updated_at">) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client.from("budgets").insert({
    ...input,
    user_id: context.userId,
  });
  if (error) throw error;
  return { ok: true };
}

export async function updateBudget(
  id: string,
  input: Partial<Omit<Budget, "id" | "user_id" | "created_at" | "updated_at">>,
) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client.from("budgets").update(input).eq("id", id).eq("user_id", context.userId);
  if (error) throw error;
  return { ok: true };
}

export async function deleteBudget(id: string) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client.from("budgets").delete().eq("id", id).eq("user_id", context.userId);
  if (error) throw error;
  return { ok: true };
}

export async function createGoal(input: Omit<SavingGoal, "id" | "user_id" | "created_at" | "updated_at">) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client.from("saving_goals").insert({
    ...input,
    user_id: context.userId,
  });
  if (error) throw error;
  return { ok: true };
}

export async function updateGoal(
  id: string,
  input: Partial<Omit<SavingGoal, "id" | "user_id" | "created_at" | "updated_at">>,
) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client.from("saving_goals").update(input).eq("id", id).eq("user_id", context.userId);
  if (error) throw error;
  return { ok: true };
}

export async function deleteGoal(id: string) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client.from("saving_goals").delete().eq("id", id).eq("user_id", context.userId);
  if (error) throw error;
  return { ok: true };
}

export async function createClassificationRule(
  input: Omit<ClassificationRule, "id" | "user_id" | "created_at" | "updated_at">,
) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client.from("classification_rules").insert({
    ...input,
    user_id: context.userId,
  });
  if (error) throw error;
  return { ok: true };
}

export async function updateClassificationRule(
  id: string,
  input: Partial<Omit<ClassificationRule, "id" | "user_id" | "created_at" | "updated_at">>,
) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client
    .from("classification_rules")
    .update(input)
    .eq("id", id)
    .eq("user_id", context.userId);
  if (error) throw error;
  return { ok: true };
}

export async function deleteClassificationRule(id: string) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client
    .from("classification_rules")
    .delete()
    .eq("id", id)
    .eq("user_id", context.userId);
  if (error) throw error;
  return { ok: true };
}

export async function deleteClassificationRules(ids: string[]) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client
    .from("classification_rules")
    .delete()
    .in("id", ids)
    .eq("user_id", context.userId);
  if (error) throw error;
  return { ok: true };
}

export async function markAlertAsRead(id: string) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error } = await client
    .from("alerts")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", context.userId);
  if (error) throw error;
  return { ok: true };
}

export async function replaceBudgetAlerts(
  monthKey: string,
  alerts: Array<Omit<Alert, "id" | "user_id" | "created_at" | "is_read">>,
) {
  const context = await getRepositoryContext();
  if (context.isMock) return { ok: true, mode: "mock" as const };
  const client = getWritableClient(context);

  const { error: deleteError } = await client
    .from("alerts")
    .delete()
    .eq("user_id", context.userId)
    .eq("related_month", monthKey)
    .in("alert_type", ["budget_threshold", "budget_exceeded"]);
  if (deleteError) throw deleteError;

  if (alerts.length === 0) {
    return { ok: true };
  }

  const { error: insertError } = await client.from("alerts").insert(
    alerts.map((alert) => ({
      ...alert,
      user_id: context.userId,
      is_read: false,
    })),
  );
  if (insertError) throw insertError;
  return { ok: true };
}

async function parseNaturalLanguageTransactionLegacy(text: string): Promise<ParsedTransactionCandidate> {
  const accounts = await getAccounts();
  const today = new Date().toISOString().slice(0, 10);
  const normalized = text
    .replaceAll("，", ",")
    .replaceAll("．", ".")
    .replaceAll("　", " ")
    .trim();

  let amount = Number(normalized.match(/(\d[\d,]*)円/)?.[1]?.replaceAll(",", "") ?? 0);
  const manUnit = normalized.match(/(\d[\d,]*)万円/);
  if (manUnit) {
    amount = Number(manUnit[1].replaceAll(",", "")) * 10000;
  }

  const bankAccount = accounts.find((account) => account.type === "bank")?.name ?? null;
  const cashAccount =
    accounts.find((account) => account.type === "cash")?.name ??
    accounts.find((account) => account.type === "wallet")?.name ??
    null;

  const aliasMap = new Map<string, string>();
  for (const account of accounts) {
    aliasMap.set(account.name, account.name);
  }
  if (cashAccount) {
    aliasMap.set("現金", cashAccount);
    aliasMap.set("財布", cashAccount);
  }
  for (const alias of ["PayPay", "Suica", "nanaco", "WAON", "楽天Edy"]) {
    const matched = accounts.find((account) => account.name.includes(alias));
    if (matched) {
      aliasMap.set(alias, matched.name);
    }
  }

  const detectAccountNames = (input: string) => {
    const names = [...aliasMap.entries()]
      .filter(([alias]) => input.includes(alias))
      .map(([, accountName]) => accountName);
    return [...new Set(names)];
  };

  const matchedAccounts = detectAccountNames(normalized);

  const transactionKind =
    normalized.includes("調整") || normalized.includes("残高") || normalized.includes("ズレ")
      ? "adjustment"
      : normalized.includes("給料") || normalized.includes("入った") || normalized.includes("入金された")
        ? "income"
        : normalized.includes("下ろした") ||
            normalized.includes("引き出し") ||
            normalized.includes("ATM") ||
            normalized.includes("チャージ") ||
            normalized.includes("入金")
          ? "transfer"
          : "expense";

  let fromAccountName: string | null = null;
  let toAccountName: string | null = null;

  if (transactionKind === "income") {
    toAccountName = matchedAccounts[0] ?? bankAccount;
  } else if (transactionKind === "expense" || transactionKind === "adjustment") {
    fromAccountName = matchedAccounts[0] ?? cashAccount;
  } else if (transactionKind === "transfer") {
    if (normalized.includes("下ろした") || normalized.includes("引き出し") || normalized.includes("ATM")) {
      fromAccountName = matchedAccounts[0] ?? bankAccount;
      toAccountName = cashAccount;
    } else if (normalized.includes("チャージ")) {
      const toCandidate =
        matchedAccounts.find((accountName) => accountName !== cashAccount && accountName !== bankAccount) ?? null;
      fromAccountName =
        matchedAccounts.find((accountName) => accountName !== toCandidate) ??
        (normalized.includes("現金") ? cashAccount : bankAccount);
      toAccountName = toCandidate;
    } else {
      fromAccountName = matchedAccounts[0] ?? bankAccount;
      toAccountName = matchedAccounts[1] ?? null;
    }
  }

  const merchantName = normalized.includes("セコマ")
    ? "セイコーマート"
    : normalized.includes("コンビニ")
      ? "コンビニ"
      : normalized.includes("ランチ")
        ? "ランチ"
        : normalized.includes("家賃")
          ? "家賃"
          : normalized.includes("給料")
            ? "給与"
            : null;

  const category =
    normalized.includes("昼ごはん") || normalized.includes("ランチ") || normalized.includes("コンビニ")
      ? "食費"
      : normalized.includes("家賃")
        ? "住居"
        : normalized.includes("電車")
          ? "交通費"
          : normalized.includes("給料")
            ? "給与"
            : null;

  const memo = normalized.includes("昼ごはん")
    ? "昼ごはん"
    : normalized.includes("ランチ")
      ? "ランチ"
      : null;

  let confidence = 0.45;
  if (amount > 0) confidence += 0.2;
  if (fromAccountName || toAccountName) confidence += 0.15;
  if (merchantName) confidence += 0.08;
  if (category) confidence += 0.07;
  if (transactionKind !== "expense") confidence += 0.05;

  return {
    transaction_date: today,
    amount,
    transaction_kind: transactionKind,
    from_account_name: fromAccountName,
    to_account_name: toAccountName,
    merchant_name: merchantName,
    category,
    memo,
    confidence: Math.min(Number(confidence.toFixed(2)), 0.98),
  };
}

function ruleMatchesText(
  rule: ClassificationRule,
  rawText: string,
  merchantName: string | null,
) {
  const keywords = splitRuleKeywords(rule.keyword);
  if (keywords.some((keyword) => rawText.includes(keyword))) {
    return true;
  }

  if (!rule.merchant_pattern) {
    return false;
  }

  if (merchantName?.includes(rule.merchant_pattern)) {
    return true;
  }

  return rawText.includes(rule.merchant_pattern);
}

function applyClassificationRules(params: {
  candidate: ParsedTransactionCandidate;
  rawText: string;
  rules: ClassificationRule[];
  categories: Category[];
  accounts: Account[];
}) {
  const { candidate, rawText, rules, categories, accounts } = params;
  const nextCandidate = { ...candidate };

  const sortedRules = [...rules].sort((a, b) => {
    const byPriority = a.priority - b.priority;
    if (byPriority !== 0) return byPriority;
    return a.created_at.localeCompare(b.created_at);
  });

  for (const rule of sortedRules) {
    if (!ruleMatchesText(rule, rawText, nextCandidate.merchant_name)) {
      continue;
    }

    if (rule.category_id) {
      const categoryName = categories.find((category) => category.id === rule.category_id)?.name ?? null;
      if (categoryName) {
        nextCandidate.category = categoryName;
      }
    }

    if (rule.account_id) {
      const accountName = accounts.find((account) => account.id === rule.account_id)?.name ?? null;
      if (accountName) {
        if (nextCandidate.transaction_kind === "income") {
          nextCandidate.to_account_name = accountName;
        } else if (nextCandidate.transaction_kind === "transfer") {
          if (!nextCandidate.from_account_name) {
            nextCandidate.from_account_name = accountName;
          }
        } else {
          nextCandidate.from_account_name = accountName;
        }
      }
    }

    nextCandidate.confidence = Math.min(
      Number((nextCandidate.confidence + 0.05).toFixed(2)),
      0.99,
    );
    break;
  }

  return nextCandidate;
}

export async function parseNaturalLanguageTransaction(text: string): Promise<ParsedTransactionCandidate> {
  const [accounts, categories, rules] = await Promise.all([
    getAccounts(),
    getCategories(),
    getClassificationRules(),
  ]);
  const parsed = parseNaturalLanguageTransactionText(text, accounts);

  return applyClassificationRules({
    candidate: parsed,
    rawText: text,
    rules,
    categories,
    accounts,
  });
}

export async function getBalancesByAccount() {
  const [accounts, transactions] = await Promise.all([getAccounts(), getTransactions()]);
  return accounts.map((account) => ({
    account,
    balance: calculateAccountBalance(account, transactions),
  }));
}
