# Smart Kakeibo

個人用の家計簿 Web アプリです。  
Next.js App Router / TypeScript / Tailwind CSS / Supabase を使って、毎日の記録と判断をしやすくすることを目指しています。

## 主な機能

- 日本語 UI
- モバイルファースト
- 口座管理
- 明細 CRUD
- 自然文入力
- 予算管理
- 貯金目標管理
- LINE 通知と日次レポートの土台

## ディレクトリ構成

```text
src/
  app/
    (auth)/
    (protected)/
    api/
  application/
  components/
  domain/
  infrastructure/
  lib/
  types/
supabase/
  migrations/
  seed.sql
docs/
```

## セットアップ

### 1. 依存関係をインストール

```bash
npm install
```

### 2. 環境変数ファイルを作成

```bash
cp env.example .env.local
```

PowerShell:

```powershell
Copy-Item env.example .env.local
```

## 起動方法

### 画面だけ確認したい場合

Supabase や Docker Desktop を起動しなくても、まずは画面確認できます。

```powershell
npm.cmd run dev
```

アクセス先:

- `http://localhost:3000/login`

### Supabase も使って確認したい場合

ローカル Supabase は Docker Desktop が必要です。  
先に Docker Desktop を起動してから、次を実行してください。

```powershell
npm.cmd run supabase:start
npm.cmd run supabase:reset
npm.cmd run dev
```

Docker Desktop が起動していないと、次のようなエラーになります。

```text
Docker Desktop is a prerequisite for local development.
```

## LINE 通知の実接続

### 1. `.env.local` に LINE の値を設定

```env
LINE_CHANNEL_ACCESS_TOKEN=ここにチャネルアクセストークン
LINE_CHANNEL_SECRET=ここにチャネルシークレット
```

### 2. アプリ側で通知先を設定

1. `http://localhost:3000/settings` を開く
2. LINE Developers 側で Webhook URL に `/api/line/webhook` を設定する
3. LINE から公式アカウントへ1通メッセージを送る
4. 設定画面で `最新Webhookを確認` を押す
5. `LINE ユーザーID` が入ったら `LINE通知を有効にする` を ON にする
6. `通知設定を保存` を押す
7. `LINEにテスト送信` を押して届くか確認する

### 3. 日次レポートを確認

- `今日のレポートをプレビュー` で文面を確認できます
- 日次ジョブは `/api/jobs/daily-report` を使います
- 実行時は `Authorization: Bearer <CRON_SECRET>` が必要です

## よく使うコマンド

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run supabase:start
npm run supabase:reset
```

## 補足

- `npm run dev` だけでも画面確認はできます
- DB や seed も含めて試したいときは Docker Desktop を起動してから `supabase:start` と `supabase:reset` を使ってください
- 設定値やデモモードは `.env.local` に保存します
