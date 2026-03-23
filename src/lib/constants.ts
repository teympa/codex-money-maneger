import { endOfMonth, formatISO, startOfMonth } from "date-fns";

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Smart Kakeibo";
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE ?? "Asia/Tokyo";
export const APP_BASE_URL =
  process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const DEMO_USER_ID = "11111111-1111-1111-1111-111111111111";

export const ACCOUNT_TYPE_LABELS = {
  bank: "銀行口座",
  cash: "現金",
  card: "クレジットカード",
  emoney: "電子マネー",
  wallet: "財布",
  points: "ポイント",
} as const;

export const TRANSACTION_KIND_LABELS = {
  income: "収入",
  expense: "支出",
  transfer: "振替",
  adjustment: "調整",
} as const;

export function getCurrentMonthKey(date = new Date()) {
  return formatISO(date, { representation: "date" }).slice(0, 7);
}

export function getMonthDateRange(date = new Date()) {
  return {
    start: formatISO(startOfMonth(date), { representation: "date" }),
    end: formatISO(endOfMonth(date), { representation: "date" }),
  };
}
