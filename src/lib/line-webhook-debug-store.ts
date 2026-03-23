type LineWebhookEventSummary = {
  type: string;
  sourceType: string | null;
  sourceUserId: string | null;
  timestamp: number | null;
};

type LineWebhookDebugSnapshot = {
  receivedAt: string;
  events: LineWebhookEventSummary[];
  raw: Record<string, unknown>;
};

let latestWebhookSnapshot: LineWebhookDebugSnapshot | null = null;

export function setLatestLineWebhookSnapshot(snapshot: LineWebhookDebugSnapshot) {
  latestWebhookSnapshot = snapshot;
}

export function getLatestLineWebhookSnapshot() {
  return latestWebhookSnapshot;
}
