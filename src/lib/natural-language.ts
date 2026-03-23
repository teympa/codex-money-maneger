import type { Account, ParsedTransactionCandidate } from "@/types/domain";

type MerchantRule = {
  aliases: string[];
  merchantName: string;
  category: string | null;
  memo?: string | null;
};

type CategoryHint = {
  keywords: string[];
  category: string;
  merchantName?: string | null;
};

const MERCHANT_RULES: MerchantRule[] = [
  { aliases: ["セコマ", "セイコーマート"], merchantName: "セイコーマート", category: "食費" },
  { aliases: ["コンビニ", "セブン", "ローソン", "ファミマ"], merchantName: "コンビニ", category: "食費" },
  { aliases: ["ランチ", "昼ごはん", "昼食"], merchantName: "ランチ", category: "外食", memo: "昼ごはん" },
  { aliases: ["家賃"], merchantName: "家賃", category: "住居" },
  { aliases: ["電気代", "ガス代", "水道代"], merchantName: "水道光熱費", category: "水道光熱費" },
  { aliases: ["電車", "JR", "地下鉄", "バス"], merchantName: "交通", category: "交通費" },
  { aliases: ["給料", "給与"], merchantName: "給与", category: "給与" },
];

const CATEGORY_HINTS: CategoryHint[] = [
  { keywords: ["セコマ", "セイコーマート", "コンビニ"], category: "食費" },
  { keywords: ["ランチ", "昼ごはん", "夕食", "朝ごはん", "カフェ"], category: "外食" },
  { keywords: ["家賃", "管理費"], category: "住居" },
  { keywords: ["電気代", "ガス代", "水道代"], category: "水道光熱費" },
  { keywords: ["スマホ", "携帯", "通信"], category: "通信費" },
  { keywords: ["電車", "JR", "地下鉄", "バス", "Suica"], category: "交通費" },
  { keywords: ["病院", "薬", "歯医者"], category: "医療" },
  { keywords: ["Netflix", "Spotify", "サブスク"], category: "サブスク" },
  { keywords: ["給与", "給料"], category: "給与" },
];

const INCOME_KEYWORDS = ["給料", "給与", "入った", "入金された", "振り込まれた"];
const ADJUSTMENT_KEYWORDS = ["調整", "ズレ", "残高が合わ", "残高修正"];
const TRANSFER_KEYWORDS = ["下ろした", "引き出し", "ATM", "チャージ", "移した", "振替"];
const EXPENSE_KEYWORDS = ["買った", "支払った", "払った", "使った", "引き落とし"];
const ACCOUNT_ALIASES = ["現金", "財布", "PayPay", "Suica", "nanaco", "WAON", "楽天Edy"];

function formatTokyoDate(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function normalizeText(text: string) {
  return text.replaceAll("、", ",").replaceAll("　", " ").trim();
}

function parseDate(text: string) {
  const today = new Date();

  if (text.includes("今日")) return formatTokyoDate(today);
  if (text.includes("昨日")) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return formatTokyoDate(yesterday);
  }

  const absolute = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (absolute) {
    return `${absolute[1]}-${absolute[2].padStart(2, "0")}-${absolute[3].padStart(2, "0")}`;
  }

  const monthDay = text.match(/(\d{1,2})[\/月](\d{1,2})日?/);
  if (monthDay) {
    return `${today.getFullYear()}-${monthDay[1].padStart(2, "0")}-${monthDay[2].padStart(2, "0")}`;
  }

  return formatTokyoDate(today);
}

function parseAmount(text: string) {
  const manMatch = text.match(/(\d[\d,]*)\s*万/);
  if (manMatch) {
    return Number(manMatch[1].replaceAll(",", "")) * 10000;
  }

  const yenMatch = text.match(/(\d[\d,]*)\s*円/);
  if (yenMatch) {
    return Number(yenMatch[1].replaceAll(",", ""));
  }

  const plainNumber = text.match(/(\d[\d,]*)/);
  return plainNumber ? Number(plainNumber[1].replaceAll(",", "")) : 0;
}

function buildAliasMap(accounts: Account[]) {
  const aliasMap = new Map<string, string>();

  for (const account of accounts) {
    aliasMap.set(account.name, account.name);
  }

  const cashAccount =
    accounts.find((account) => account.type === "cash")?.name ??
    accounts.find((account) => account.type === "wallet")?.name ??
    null;

  if (cashAccount) {
    aliasMap.set("現金", cashAccount);
    aliasMap.set("財布", cashAccount);
  }

  for (const alias of ACCOUNT_ALIASES) {
    const matched = accounts.find((account) => account.name.includes(alias));
    if (matched) {
      aliasMap.set(alias, matched.name);
    }
  }

  return aliasMap;
}

function detectAccountNames(text: string, accounts: Account[]) {
  const aliasMap = buildAliasMap(accounts);
  const found = [...aliasMap.entries()]
    .filter(([alias]) => text.includes(alias))
    .map(([, accountName]) => accountName);

  return [...new Set(found)];
}

function detectTransactionKind(text: string): ParsedTransactionCandidate["transaction_kind"] {
  if (ADJUSTMENT_KEYWORDS.some((keyword) => text.includes(keyword))) return "adjustment";
  if (INCOME_KEYWORDS.some((keyword) => text.includes(keyword))) return "income";
  if (TRANSFER_KEYWORDS.some((keyword) => text.includes(keyword))) return "transfer";
  if (EXPENSE_KEYWORDS.some((keyword) => text.includes(keyword))) return "expense";
  return "expense";
}

function detectMerchantCategoryMemo(text: string) {
  for (const rule of MERCHANT_RULES) {
    if (rule.aliases.some((alias) => text.includes(alias))) {
      return {
        merchantName: rule.merchantName,
        category: rule.category,
        memo: rule.memo ?? null,
      };
    }
  }

  return {
    merchantName: null,
    category: null,
    memo: null,
  };
}

function extractMerchantFallback(text: string) {
  const directMatch = text.match(/(?:今日|昨日)?\s*([^\s,]+?)で\s*\d/);
  if (directMatch?.[1]) {
    return directMatch[1].trim();
  }

  const paymentMethodMatch = text.match(
    /(?:現金|財布|PayPay|Suica|nanaco|WAON|楽天Edy|[^\s,]+銀行)で\s*([^\s,]+?)\s*\d/,
  );
  if (paymentMethodMatch?.[1]) {
    return paymentMethodMatch[1].trim();
  }

  const withdrawalMatch = text.match(/([^\s,]+?)\s*(?:引き落とし|支払い|料金)/);
  if (withdrawalMatch?.[1] && !withdrawalMatch[1].includes("銀行")) {
    return withdrawalMatch[1].trim();
  }

  return null;
}

function detectCategoryFallback(text: string) {
  for (const hint of CATEGORY_HINTS) {
    if (hint.keywords.some((keyword) => text.includes(keyword))) {
      return hint.category;
    }
  }

  return null;
}

function detectMemo(text: string, fallbackMemo: string | null) {
  const parts = text.split(",");
  if (parts.length >= 2) {
    const memo = parts.slice(1).join(",").trim();
    if (memo.length > 0) return memo;
  }

  const afterAmount = text.match(/\d(?:[\d,]*)(?:円|万)(.+)$/);
  if (afterAmount?.[1]) {
    const memo = afterAmount[1].replace(/^(で|を|の)/, "").trim();
    if (memo.length > 0) return memo;
  }

  return fallbackMemo;
}

function resolveTransferAccounts(text: string, accounts: Account[], matchedAccounts: string[]) {
  const bankAccount = accounts.find((account) => account.type === "bank")?.name ?? null;
  const cashAccount =
    accounts.find((account) => account.type === "cash")?.name ??
    accounts.find((account) => account.type === "wallet")?.name ??
    null;

  if (["下ろした", "引き出し", "ATM"].some((keyword) => text.includes(keyword))) {
    return {
      fromAccountName: matchedAccounts[0] ?? bankAccount,
      toAccountName: cashAccount,
    };
  }

  if (text.includes("チャージ")) {
    const toAccountName =
      matchedAccounts.find((name) => name !== cashAccount && name !== bankAccount) ?? null;
    const fromAccountName =
      matchedAccounts.find((name) => name !== toAccountName) ??
      (text.includes("現金") || text.includes("財布") ? cashAccount : bankAccount);

    return { fromAccountName, toAccountName };
  }

  return {
    fromAccountName: matchedAccounts[0] ?? bankAccount,
    toAccountName: matchedAccounts[1] ?? null,
  };
}

export function parseNaturalLanguageTransactionText(
  text: string,
  accounts: Account[],
): ParsedTransactionCandidate {
  const normalized = normalizeText(text);
  const matchedAccounts = detectAccountNames(normalized, accounts);
  const transactionKind = detectTransactionKind(normalized);
  const amount = parseAmount(normalized);
  const detectedMerchant = detectMerchantCategoryMemo(normalized);
  const merchantName = detectedMerchant.merchantName ?? extractMerchantFallback(normalized);
  const category = detectedMerchant.category ?? detectCategoryFallback(normalized);
  const inferredMemo = detectedMerchant.memo;
  const memo = detectMemo(normalized, inferredMemo);

  const bankAccount = accounts.find((account) => account.type === "bank")?.name ?? null;
  const cashAccount =
    accounts.find((account) => account.type === "cash")?.name ??
    accounts.find((account) => account.type === "wallet")?.name ??
    null;

  let fromAccountName: string | null = null;
  let toAccountName: string | null = null;

  if (transactionKind === "income") {
    toAccountName = matchedAccounts[0] ?? bankAccount;
  } else if (transactionKind === "expense" || transactionKind === "adjustment") {
    fromAccountName = matchedAccounts[0] ?? cashAccount;
  } else {
    const transferAccounts = resolveTransferAccounts(normalized, accounts, matchedAccounts);
    fromAccountName = transferAccounts.fromAccountName;
    toAccountName = transferAccounts.toAccountName;
  }

  let confidence = 0.45;
  if (amount > 0) confidence += 0.2;
  if (fromAccountName || toAccountName) confidence += 0.15;
  if (merchantName) confidence += 0.1;
  if (category) confidence += 0.05;
  if (memo) confidence += 0.03;
  if (transactionKind !== "expense") confidence += 0.05;

  return {
    transaction_date: parseDate(normalized),
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
