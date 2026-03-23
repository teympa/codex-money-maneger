export async function sendLineMessage(input: { lineUserId: string; message: string }) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelAccessToken) {
    return {
      ok: false,
      mode: "mock" as const,
      reason: "LINE_CHANNEL_ACCESS_TOKEN が未設定です。",
      payload: input,
    };
  }

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      to: input.lineUserId,
      messages: [{ type: "text", text: input.message }],
    }),
  });

  if (response.ok) {
    return { ok: true, mode: "line" as const, status: response.status };
  }

  const responseText = await response.text();
  return {
    ok: false,
    mode: "line" as const,
    status: response.status,
    reason: responseText || `LINE push failed (${response.status})`,
  };
}
