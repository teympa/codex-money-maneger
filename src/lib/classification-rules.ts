export function splitRuleKeywords(value: string) {
  return value
    .split(/[\n,、]+/)
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);
}

export function normalizeRuleKeywords(value: string) {
  return splitRuleKeywords(value).join(", ");
}
