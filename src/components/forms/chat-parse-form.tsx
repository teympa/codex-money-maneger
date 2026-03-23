"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { formatCurrency } from "@/lib/format";
import type { Account, Category, ParsedTransactionCandidate } from "@/types/domain";

interface EditableCandidate extends ParsedTransactionCandidate {
  raw_text: string;
}

const KIND_LABELS = {
  income: "収入",
  expense: "支出",
  transfer: "振替",
  adjustment: "調整",
} as const;

const SENTENCE_ORDER = [
  {
    label: "1. 日付",
    examples: "今日 / 昨日 / 3/21 / 2026-03-21",
  },
  {
    label: "2. 出金元・入金先",
    examples: "現金 / 財布 / 北洋銀行 / PayPay / Suica",
  },
  {
    label: "3. 店名・相手先",
    examples: "セコマ / コンビニ / 家賃 / JR / ランチ",
  },
  {
    label: "4. 金額",
    examples: "620円 / 950円 / 2万円 / 23万円",
  },
  {
    label: "5. 種別のヒント",
    examples: "買った / 下ろした / チャージ / 入った / 引き落とし",
  },
  {
    label: "6. カテゴリのヒント",
    examples: "食費 / 外食 / 住居 / 交通費 / 給与",
  },
];

export function ChatParseForm({
  accounts,
  categories,
}: {
  accounts: Account[];
  categories: Category[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [candidate, setCandidate] = useState<EditableCandidate | null>(null);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const categoryOptions = useMemo(
    () => categories.filter((category) => category.type !== "savings"),
    [categories],
  );

  function buildCombinedMemo(candidate: ParsedTransactionCandidate) {
    const parts = [candidate.merchant_name, candidate.memo]
      .map((value) => value?.trim())
      .filter((value, index, array): value is string => Boolean(value) && array.indexOf(value!) === index);

    return parts.join(" ").trim() || null;
  }

  async function handleParse() {
    setMessage("");
    const response = await fetch("/api/chat-parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const raw = await response.text();
    const data = raw ? (JSON.parse(raw) as ParsedTransactionCandidate & { message?: string }) : null;

    if (!response.ok || !data) {
      setMessage(data?.message ?? "解析に失敗しました。");
      return;
    }

    setCandidate({
      ...data,
      memo: buildCombinedMemo(data),
      merchant_name: null,
      raw_text: text,
    });
  }

  function updateCandidate<K extends keyof EditableCandidate>(key: K, value: EditableCandidate[K]) {
    if (!candidate) return;
    setCandidate({
      ...candidate,
      [key]: value,
    });
  }

  async function handleSave() {
    if (!candidate) return;

    setIsSaving(true);
    setMessage("");

    const fromAccountId =
      accounts.find((account) => account.name === candidate.from_account_name)?.id ?? null;
    const toAccountId =
      accounts.find((account) => account.name === candidate.to_account_name)?.id ?? null;
    const categoryId = categories.find((category) => category.name === candidate.category)?.id ?? null;

    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction_date: candidate.transaction_date,
        amount: Number(candidate.amount),
        transaction_kind: candidate.transaction_kind,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        merchant_name: null,
        category_id: categoryId,
        memo: candidate.memo,
        source_type: "chat",
        raw_text: candidate.raw_text,
        confidence: candidate.confidence,
        external_id: null,
        is_duplicate_candidate: false,
      }),
    });

    const raw = await response.text();
    const result = raw ? (JSON.parse(raw) as { message?: string }) : {};

    if (!response.ok) {
      setMessage(result.message ?? "保存に失敗しました。");
      setIsSaving(false);
      return;
    }

    setMessage(result.message ?? "保存しました。");
    setCandidate(null);
    router.push("/transactions");
    router.refresh();
  }

  function handleResetParse() {
    setCandidate(null);
    setMessage("");
  }

  const accountNames = accounts.map((account) => account.name);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">自然文</label>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="min-h-28 w-full rounded-3xl border border-slate-200 px-4 py-3"
          placeholder="例: 今日 PayPayでセコマ 620円 昼ごはん"
        />
      </div>

      {!candidate ? (
        <Button type="button" onClick={handleParse} disabled={!text.trim()}>
          候補を解析する
        </Button>
      ) : null}

      {candidate ? (
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">解析候補</p>
              <p className="text-lg font-semibold text-ink">
                {KIND_LABELS[candidate.transaction_kind]} / {formatCurrency(candidate.amount)}
              </p>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                candidate.confidence >= 0.8
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              確信度 {Math.round(candidate.confidence * 100)}%
            </div>
          </div>

          {candidate.confidence < 0.8 ? (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              低めの確信度です。保存前に口座、カテゴリ、金額を確認してください。
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">日付</label>
              <input
                type="date"
                value={candidate.transaction_date}
                onChange={(event) => updateCandidate("transaction_date", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">金額</label>
              <input
                type="number"
                value={candidate.amount}
                onChange={(event) => updateCandidate("amount", Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">種別</label>
              <select
                value={candidate.transaction_kind}
                onChange={(event) =>
                  updateCandidate(
                    "transaction_kind",
                    event.target.value as EditableCandidate["transaction_kind"],
                  )
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              >
                <option value="income">収入</option>
                <option value="expense">支出</option>
                <option value="transfer">振替</option>
                <option value="adjustment">調整</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">カテゴリ</label>
              <select
                value={candidate.category ?? ""}
                onChange={(event) => updateCandidate("category", event.target.value || null)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              >
                <option value="">選択してください</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">出金元口座</label>
              <select
                value={candidate.from_account_name ?? ""}
                onChange={(event) => updateCandidate("from_account_name", event.target.value || null)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              >
                <option value="">選択してください</option>
                {accountNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">入金先口座</label>
              <select
                value={candidate.to_account_name ?? ""}
                onChange={(event) => updateCandidate("to_account_name", event.target.value || null)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              >
                <option value="">選択してください</option>
                {accountNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">内容・メモ</label>
              <textarea
                value={candidate.memo ?? ""}
                onChange={(event) => updateCandidate("memo", event.target.value || null)}
                className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "保存中..." : "この内容で保存する"}
            </Button>
            <Button type="button" variant="secondary" onClick={handleResetParse}>
              解析し直す
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-4 bg-slate-50">
        <div>
          <p className="text-sm font-semibold text-ink">文のつくりかた</p>
          <p className="mt-1 text-sm text-slate-600">
            基本は「日付 → 出金元・入金先 → 店名・相手先 → 金額 → 種別のヒント → カテゴリのヒント」の順で考えると入力しやすいです。
            すべて書かなくても大丈夫ですが、前の方の情報ほど判定に効きやすいです。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {SENTENCE_ORDER.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white px-4 py-3">
              <p className="text-sm font-medium text-slate-800">{item.label}</p>
              <p className="mt-1 text-sm text-slate-500">{item.examples}</p>
            </div>
          ))}
        </div>
      </Card>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
