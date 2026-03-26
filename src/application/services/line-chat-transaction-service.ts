import { splitRuleKeywords } from "@/lib/classification-rules";
import { parseNaturalLanguageTransactionText } from "@/lib/natural-language";
import { validateTransactionPayload } from "@/lib/transaction-validation";
import { createAdminSupabaseClient } from "@/infrastructure/supabase/admin";
import type { Account, Category, ClassificationRule, ParsedTransactionCandidate } from "@/types/domain";

type UserNotificationRow = {
  user_id: string;
  line_user_id: string | null;
};

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

    nextCandidate.confidence = Math.min(Number((nextCandidate.confidence + 0.05).toFixed(2)), 0.99);
    break;
  }

  return nextCandidate;
}

function buildMemo(candidate: ParsedTransactionCandidate) {
  const parts = [candidate.merchant_name, candidate.memo]
    .map((value) => value?.trim())
    .filter((value, index, array): value is string => Boolean(value) && array.indexOf(value!) === index);

  return parts.join(" ").trim() || null;
}

function formatTransactionSummary(candidate: ParsedTransactionCandidate) {
  const memo = buildMemo(candidate) ?? "内容なし";
  const account =
    candidate.transaction_kind === "income"
      ? candidate.to_account_name
      : candidate.transaction_kind === "transfer"
        ? `${candidate.from_account_name ?? "未設定"} → ${candidate.to_account_name ?? "未設定"}`
        : candidate.from_account_name;

  const kindLabel = {
    income: "収入",
    expense: "支出",
    transfer: "振替",
    adjustment: "調整",
  }[candidate.transaction_kind];

  return `${kindLabel} ${candidate.amount.toLocaleString("ja-JP")}円\n${memo}\n口座: ${account ?? "未設定"}`;
}

export async function saveLineTextAsTransaction(lineUserId: string, text: string) {
  const admin = createAdminSupabaseClient();

  const { data: setting, error: settingError } = await admin
    .from("user_notification_settings")
    .select("user_id,line_user_id")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (settingError) {
    throw new Error(settingError.message);
  }

  if (!setting) {
    return {
      ok: false as const,
      message:
        "このLINEアカウントはまだ家計簿と連携されていません。設定画面で「最新Webhookを確認」して保存してください。",
    };
  }

  const userId = (setting as UserNotificationRow).user_id;

  const [{ data: accounts }, { data: categories }, { data: rules }] = await Promise.all([
    admin.from("accounts").select("*").eq("user_id", userId).order("created_at"),
    admin.from("categories").select("*").eq("user_id", userId).order("sort_order"),
    admin
      .from("classification_rules")
      .select("*")
      .eq("user_id", userId)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  const accountRows = (accounts ?? []) as Account[];
  const categoryRows = (categories ?? []) as Category[];
  const ruleRows = (rules ?? []) as ClassificationRule[];

  const parsed = parseNaturalLanguageTransactionText(text, accountRows);
  const candidate = applyClassificationRules({
    candidate: parsed,
    rawText: text,
    rules: ruleRows,
    categories: categoryRows,
    accounts: accountRows,
  });

  const fromAccountId =
    accountRows.find((account) => account.name === candidate.from_account_name)?.id ?? null;
  const toAccountId =
    accountRows.find((account) => account.name === candidate.to_account_name)?.id ?? null;
  const categoryId =
    categoryRows.find((category) => category.name === candidate.category)?.id ?? null;

  if (!candidate.amount || candidate.amount <= 0) {
    return {
      ok: false as const,
      message:
        "金額を読み取れませんでした。例: 今日 PayPayでセコマ620円 昼ごはん のように送ってください。",
    };
  }

  const validationMessage = validateTransactionPayload({
    transaction_kind: candidate.transaction_kind,
    from_account_id: fromAccountId,
    to_account_id: toAccountId,
  });

  if (validationMessage) {
    return {
      ok: false as const,
      message: `${validationMessage}\n例: 今日 PayPayでセコマ620円 昼ごはん`,
    };
  }

  const payload = {
    user_id: userId,
    transaction_date: candidate.transaction_date,
    amount: candidate.amount,
    transaction_kind: candidate.transaction_kind,
    from_account_id: fromAccountId,
    to_account_id: toAccountId,
    merchant_name: null,
    category_id: categoryId,
    memo: buildMemo(candidate),
    source_type: "chat" as const,
    external_id: null,
    raw_text: text,
    confidence: candidate.confidence,
    is_duplicate_candidate: false,
  };

  const { error: insertError } = await admin.from("transactions").insert(payload);
  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    ok: true as const,
    message: `家計簿に登録しました。\n${formatTransactionSummary(candidate)}`,
  };
}
