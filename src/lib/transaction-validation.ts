import type { TransactionKind } from "@/types/domain";

export interface TransactionPayloadLike {
  transaction_kind: TransactionKind;
  from_account_id?: string | null;
  to_account_id?: string | null;
}

export function validateTransactionPayload(payload: TransactionPayloadLike) {
  const fromAccountId = payload.from_account_id ?? null;
  const toAccountId = payload.to_account_id ?? null;

  if (payload.transaction_kind === "expense" && !fromAccountId) {
    return "支出では出金元口座が必須です。";
  }

  if (payload.transaction_kind === "income" && !toAccountId) {
    return "収入では入金先口座が必須です。";
  }

  if (payload.transaction_kind === "transfer") {
    if (!fromAccountId || !toAccountId) {
      return "振替では出金元口座と入金先口座の両方が必須です。";
    }
    if (fromAccountId === toAccountId) {
      return "振替では出金元口座と入金先口座を別々にしてください。";
    }
  }

  if (payload.transaction_kind === "adjustment" && !fromAccountId) {
    return "調整では対象口座が必須です。";
  }

  return null;
}
