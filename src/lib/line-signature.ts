import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyLineSignature(body: string, signature: string | null, channelSecret: string | undefined) {
  if (!signature || !channelSecret) {
    return false;
  }

  const digest = createHmac("sha256", channelSecret).update(body).digest("base64");
  const expected = Buffer.from(digest);
  const actual = Buffer.from(signature);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
