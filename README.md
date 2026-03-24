# Smart Kakeibo

個人用の家計簿 Web アプリです。  
Next.js App Router / TypeScript / Tailwind CSS / Supabase を使って、記録・予算管理・貯金管理・LINE 通知まで扱える構成にしています。

## 主な機能

- 日本語 UI
- モバイルファースト
- 口座管理
- 明細 CRUD
- 自然文入力
- 予算管理
- 貯金目標管理
- LINE 通知
- 日次レポート送信

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

## ローカル起動

### 画面だけ確認したい場合

```powershell
npm.cmd run dev
```

アクセス先:

- `http://localhost:3000/login`

### 3000番ポートが使われている場合

```powershell
$env:PORT=3001
npm.cmd run dev
```

アクセス先:

- `http://localhost:3001/login`

日次レポート API を手動で叩くときも、ポート番号を合わせてください。

### ローカル Supabase も使う場合

Docker Desktop を起動してから実行してください。

```powershell
npm.cmd run supabase:start
npm.cmd run supabase:reset
npm.cmd run dev
```

Docker Desktop が起動していないと次のようなエラーになります。

```text
Docker Desktop is a prerequisite for local development.
```

## 本番 Supabase の設定

### 1. Supabase プロジェクトを作成

Supabase Dashboard で新しいプロジェクトを作成し、次の値を確認します。

- `Project URL`
- `Publishable key`
- `Secret key`

`.env.local` または Vercel の環境変数に設定します。

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 2. migration を反映

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref あなたのProjectID
npx.cmd supabase db push
```

### 3. seed を反映

Supabase Dashboard の `SQL Editor` で [supabase/seed.sql](C:\Users\teymp\OneDrive\ドキュメント\codex\money-maneger\supabase\seed.sql) を実行します。

確認するテーブル:

- `accounts`
- `categories`
- `transactions`
- `budgets`
- `saving_goals`
- `user_notification_settings`
- `daily_report_logs`

## LINE 通知の設定

### 1. 環境変数を設定

```env
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
CRON_SECRET=16文字以上のランダムな文字列
```

### 2. 固定 URL を設定

本番では ngrok ではなく、Vercel などの固定 URL を使う前提です。

```env
APP_BASE_URL=https://あなたの固定URL
```

### 3. LINE Developers 側で Webhook を設定

Webhook URL:

```text
https://あなたの固定URL/api/line/webhook
```

### 4. アプリ側で通知設定

`/settings` を開いて次を設定します。

- `LINE ユーザーID`
- `LINE通知を有効にする`
- `毎日レポートを送る`
- `日次レポート送信時刻`

使うボタン:

- `最新Webhookを確認`
- `通知設定を保存`
- `LINEにテスト送信`
- `今日のレポートをプレビュー`

## Vercel デプロイ

### 1. GitHub に push

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/smart-kakeibo.git
git push -u origin main
```

### 2. Vercel に import

Vercel Dashboard で GitHub リポジトリを読み込み、Next.js プロジェクトとしてデプロイします。

### 3. Vercel の環境変数を設定

```env
NEXT_PUBLIC_APP_NAME=Smart Kakeibo
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
AI_PROVIDER=mock
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
CRON_SECRET=16文字以上のランダムな文字列
NEXT_PUBLIC_TIMEZONE=Asia/Tokyo
APP_BASE_URL=https://あなたの固定URL
```

## Supabase Cron の設定

Supabase Dashboard:

1. `Integrations`
2. `Cron`
3. `pg_net` を有効化
4. `Create job`

設定例:

- Name: `daily-kakeibo-report`
- Schedule: `0 8 * * *`
- Type: `HTTP Request`
- Method: `POST`
- URL:

```text
https://あなたの固定URL/api/jobs/daily-report
```

Headers:

```text
Authorization: Bearer あなたのCRON_SECRET
Content-Type: application/json
```

Body:

```json
{"force":false}
```

## 手動で日次レポートを送る

### 3000番ポートの場合

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/jobs/daily-report" `
  -Headers @{ Authorization = "Bearer あなたのCRON_SECRET" } `
  -ContentType "application/json" `
  -Body '{"force":true}'
```

### 3001番ポートの場合

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3001/api/jobs/daily-report" `
  -Headers @{ Authorization = "Bearer あなたのCRON_SECRET" } `
  -ContentType "application/json" `
  -Body '{"force":true}'
```

結果の詳細を見たい場合:

```powershell
$result = Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3001/api/jobs/daily-report" `
  -Headers @{ Authorization = "Bearer あなたのCRON_SECRET" } `
  -ContentType "application/json" `
  -Body '{"force":true}'

$result.result.results | Format-List
```

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
- 本番運用では ngrok ではなく固定 URL を使うのがおすすめです
- LINE 通知と Cron は同じ固定 URL を前提に設定してください
