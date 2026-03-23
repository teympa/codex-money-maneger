import { NextResponse } from "next/server";
import { sendLineMessage } from "@/application/services/notifier-service";
import { getNotificationSetting } from "@/infrastructure/repositories/kakeibo-repository";

export async function POST() {
  try {
    const setting = await getNotificationSetting();

    if (!setting.line_notifications_enabled) {
      return NextResponse.json(
        { message: "LINE通知がOFFです。設定をONにしてから試してください。" },
        { status: 400 },
      );
    }

    if (!setting.line_user_id) {
      return NextResponse.json(
        { message: "LINEユーザーIDを入力してください。" },
        { status: 400 },
      );
    }

    const timestamp = new Date().toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
    });

    const result = await sendLineMessage({
      lineUserId: setting.line_user_id,
      message: `【LINE通知テスト】\nSmart Kakeibo からの接続確認です。\n送信時刻: ${timestamp}`,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          message:
            "reason" in result && result.reason
              ? result.reason
              : "LINEへのテスト送信に失敗しました。",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "LINEにテストメッセージを送信しました。" });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "LINEへのテスト送信に失敗しました。",
      },
      { status: 500 },
    );
  }
}
