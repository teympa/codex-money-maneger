from __future__ import annotations

from pathlib import Path


TITLE = "Smart Kakeibo 使い方と機能ガイド"
LINES = [
    "Smart Kakeibo 使い方と機能ガイド",
    "",
    "1. アプリ概要",
    "Smart Kakeibo は、個人用の家計簿 Web アプリです。",
    "日々の記録、予算管理、貯金目標、自然文入力、LINE 通知までまとめて使えます。",
    "",
    "2. 主な機能",
    "・口座管理: 銀行、現金、カード、電子マネーを分けて管理",
    "・明細管理: 収入、支出、振替、調整を追加、編集、削除",
    "・自然文入力: 日本語の文章から明細候補を作って保存",
    "・予算管理: 月予算、カテゴリ予算、消化率、残額の確認",
    "・貯金目標: 目標金額、現在額、期限、必要月額の管理",
    "・ダッシュボード: 今月支出、残予算、今日あと使える額、月末着地予測",
    "・LINE 通知: テスト送信、日次レポート、Webhook 連携",
    "",
    "3. 基本の使い方",
    "1. ログインしてダッシュボードを開く",
    "2. 口座一覧で銀行、現金、カード、電子マネーを確認する",
    "3. 明細追加または自然文入力で日々の支出や収入を登録する",
    "4. 予算画面とダッシュボードで今月の残額や消化率を見る",
    "5. 目標画面で旅行積立や防衛資金などの進捗を確認する",
    "",
    "4. よく使うページ",
    "・ダッシュボード: 今日あと使える額、残予算、月末着地予測を確認",
    "・明細一覧: 登録済み明細の確認、編集、削除",
    "・自然文入力: 文章から候補を作って保存",
    "・設定: カテゴリ、自動分類ルール、LINE 通知、本番運用チェックの管理",
    "",
    "5. LINE 通知について",
    "設定画面から LINE ユーザーID の確認、通知設定保存、テスト送信ができます。",
    "日次レポートは Supabase Cron で毎朝自動送信する土台があります。",
    "",
    "6. 現時点の完成イメージ",
    "MVP を超えて、個人利用なら十分実用に入る完成度です。",
    "日々の記録、予算管理、自然文入力、LINE 通知まで揃っているため、",
    "毎日使う家計簿として運用しやすい状態です。",
]


def pdf_hex(text: str) -> str:
    encoded = text.encode("utf-16-be")
    return "<FEFF" + encoded.hex().upper() + ">"


def escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_content_stream(lines: list[str]) -> bytes:
    top_y = 800
    line_height = 20
    content: list[str] = ["BT", "/F1 12 Tf", "50 800 Td", "14 TL"]

    first = True
    y = top_y
    for line in lines:
      if first:
          content.append(f"{pdf_hex(line)} Tj")
          first = False
      else:
          y -= line_height
          content.append("T*")
          content.append(f"{pdf_hex(line)} Tj")
    content.append("ET")
    return "\n".join(content).encode("ascii")


def build_pdf(lines: list[str]) -> bytes:
    page_height = 36
    pages = [lines[i : i + page_height] for i in range(0, len(lines), page_height)]

    objects: list[bytes] = []

    catalog_id = 1
    pages_id = 2
    font_id = 3
    next_id = 4
    page_entries: list[int] = []

    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objects.append(b"<< /Type /Pages /Count 0 /Kids [] >>")
    objects.append(
        b"<< /Type /Font /Subtype /Type0 /BaseFont /HeiseiKakuGo-W5 /Encoding /UniJIS-UCS2-H /DescendantFonts ["
        b"<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HeiseiKakuGo-W5 /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 5 >> >>"
        b"] >>"
    )

    for page_lines in pages:
        page_id = next_id
        content_id = next_id + 1
        next_id += 2
        page_entries.append(page_id)

        content_stream = build_content_stream(page_lines)
        page_obj = (
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {content_id} 0 R >>"
        ).encode("ascii")
        content_obj = (
            f"<< /Length {len(content_stream)} >>\nstream\n".encode("ascii")
            + content_stream
            + b"\nendstream"
        )

        objects.append(page_obj)
        objects.append(content_obj)

    kids = " ".join(f"{page_id} 0 R" for page_id in page_entries)
    objects[pages_id - 1] = f"<< /Type /Pages /Count {len(page_entries)} /Kids [{kids}] >>".encode("ascii")

    pdf = bytearray(b"%PDF-1.4\n%\x93\x8c\x8b\x9e\n")
    offsets = [0]

    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")

    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

    pdf.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\nstartxref\n{xref_start}\n%%EOF".encode(
            "ascii"
        )
    )
    return bytes(pdf)


def main() -> None:
    output_path = Path(__file__).with_name("smart-kakeibo-user-guide.pdf")
    output_path.write_bytes(build_pdf(LINES))
    print(output_path)


if __name__ == "__main__":
    main()
