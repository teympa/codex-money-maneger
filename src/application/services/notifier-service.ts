function getLineChannelAccessToken() {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN ?? null;
}

async function sendLineRequest(endpoint: "push" | "reply", body: Record<string, unknown>) {
  const channelAccessToken = getLineChannelAccessToken();

  if (!channelAccessToken) {
    return {
      ok: false,
      mode: "mock" as const,
      reason: "LINE_CHANNEL_ACCESS_TOKEN が未設定です。",
      payload: body,
    };
  }

  const response = await fetch(`https://api.line.me/v2/bot/message/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    return { ok: true, mode: "line" as const, status: response.status };
  }

  const responseText = await response.text();
  return {
    ok: false,
    mode: "line" as const,
    status: response.status,
    reason: responseText || `LINE request failed (${response.status})`,
  };
}

export async function sendLineMessage(input: { lineUserId: string; message: string }) {
  return sendLineRequest("push", {
    to: input.lineUserId,
    messages: [{ type: "text", text: input.message }],
  });
}

export async function replyLineMessage(input: { replyToken: string; message: string }) {
  return sendLineRequest("reply", {
    replyToken: input.replyToken,
    messages: [{ type: "text", text: input.message }],
  });
}
