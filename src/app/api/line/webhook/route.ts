import { NextResponse } from "next/server";
import { getLatestLineWebhookSnapshot, setLatestLineWebhookSnapshot } from "@/lib/line-webhook-debug-store";
import { verifyLineSignature } from "@/lib/line-signature";

type RawLineEvent = {
  type?: string;
  timestamp?: number;
  source?: {
    type?: string;
    userId?: string;
  };
};

export async function GET() {
  return NextResponse.json({
    latest: getLatestLineWebhookSnapshot(),
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!process.env.LINE_CHANNEL_SECRET) {
    return NextResponse.json({ message: "LINE_CHANNEL_SECRET が未設定です。" }, { status: 500 });
  }

  if (!verifyLineSignature(rawBody, signature, process.env.LINE_CHANNEL_SECRET)) {
    return NextResponse.json({ message: "署名検証に失敗しました。" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Webhook の JSON を解釈できませんでした。" }, { status: 400 });
  }

  const rawEvents = Array.isArray(payload.events) ? (payload.events as RawLineEvent[]) : [];
  const events = rawEvents.map((event) => ({
    type: event.type ?? "unknown",
    sourceType: event.source?.type ?? null,
    sourceUserId: event.source?.userId ?? null,
    timestamp: event.timestamp ?? null,
  }));

  setLatestLineWebhookSnapshot({
    receivedAt: new Date().toISOString(),
    events,
    raw: payload,
  });

  return NextResponse.json({ message: "ok" });
}
