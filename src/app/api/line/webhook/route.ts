import { NextResponse } from "next/server";
import { replyLineMessage } from "@/application/services/notifier-service";
import { saveLineTextAsTransaction } from "@/application/services/line-chat-transaction-service";
import { getLatestLineWebhookSnapshot, setLatestLineWebhookSnapshot } from "@/lib/line-webhook-debug-store";
import { verifyLineSignature } from "@/lib/line-signature";

type RawLineEvent = {
  type?: string;
  replyToken?: string;
  timestamp?: number;
  source?: {
    type?: string;
    userId?: string;
  };
  message?: {
    type?: string;
    text?: string;
  };
};

function buildGuideMessage() {
  return [
    "家計簿と連携しました。",
    "このLINEに自然文を送ると明細登録できます。",
    "例: 今日 PayPayでセコマ620円 昼ごはん",
  ].join("\n");
}

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
    messageType: event.message?.type ?? null,
    messageText: event.message?.text ?? null,
    timestamp: event.timestamp ?? null,
  }));

  setLatestLineWebhookSnapshot({
    receivedAt: new Date().toISOString(),
    events,
    raw: payload,
  });

  for (const event of rawEvents) {
    if (event.type === "follow" && event.replyToken) {
      await replyLineMessage({
        replyToken: event.replyToken,
        message: buildGuideMessage(),
      });
      continue;
    }

    if (
      event.type !== "message" ||
      event.message?.type !== "text" ||
      !event.message.text ||
      !event.replyToken ||
      !event.source?.userId
    ) {
      continue;
    }

    try {
      const result = await saveLineTextAsTransaction(event.source.userId, event.message.text);
      await replyLineMessage({
        replyToken: event.replyToken,
        message: result.message,
      });
    } catch (error) {
      await replyLineMessage({
        replyToken: event.replyToken,
        message:
          error instanceof Error
            ? `登録に失敗しました。\n${error.message}`
            : "登録に失敗しました。時間を置いてもう一度試してください。",
      });
    }
  }

  return NextResponse.json({ message: "ok" });
}
