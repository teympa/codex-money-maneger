# Smart Kakeibo

個人用の家計簿 Web アプリです。  
Next.js App Router / TypeScript / Tailwind CSS / Supabase を使って、日々の記録、予算管理、貯金目標、LINE 通知まで扱えるようにしています。

## 主な機能

- 日本語 UI
- モバイルファースト
- 口座管理
- 明細 CRUD
- 自然文入力
- 予算管理
- 貯金目標管理
- LINE テスト送信
- 日次レポート送信

## ディレクトリ構成

```text
src/
  app/
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

## ローカル起動

### 1. 依存関係を入れる

```powershell
npm.cmd install
```

### 2. 環境変数を作る

```powershell
Copy-Item env.example .env.local
```

### 3. 画面だけ確認する

```powershell
npm.cmd run dev
```

開く URL:

- `http://localhost:3000/login`

### 4. 3000 番が使われている場合

```powershell
$env:PORT=3001
npm.cmd run dev
```

開く URL:

- `http://localhost:3001/login`

## ローカル Supabase を使う

Docker Desktop を起動してから実行してください。

```powershell
npm.cmd run supabase:start
npm.cmd run supabase:reset
npm.cmd run dev
```

## 本番 Supabase の設定

### 1. Supabase Dashboard で値を確認する

`Settings -> API` で次の値を確認します。

- `Project URL`
- `Publishable key`
- `Secret key`

### 2. 環境変数に入れる

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. migration を反映する

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref あなたのProjectID
npx.cmd supabase db push
```

### 4. seed を入れる

Supabase Dashboard の `SQL Editor` で [supabase/seed.sql](C:\Users\teymp\OneDrive\ドキュメント\codex\money-maneger\supabase\seed.sql) を実行します。

確認しやすいテーブル:

- `accounts`
- `categories`
- `transactions`
- `budgets`
- `saving_goals`
- `user_notification_settings`
- `daily_report_logs`

## LINE 通知の設定

### 1. 環境変数を設定する

```env
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
CRON_SECRET=16文字以上のランダム文字列
APP_BASE_URL=https://あなたの本番URL
```

### 2. LINE Developers で Webhook を設定する

Webhook URL:

```text
https://あなたの本番URL/api/line/webhook
```

### 3. アプリ側で通知設定を保存する

`/settings` で次を設定します。

- `LINE ユーザーID`
- `LINE通知を有効にする`
- `毎日レポートを送る`
- `日次レポート送信時刻`

使えるボタン:

- `最新Webhookを確認`
- `通知設定を保存`
- `LINEにテスト送信`
- `今日のレポートをプレビュー`

## Vercel デプロイ

### 1. GitHub に push

```powershell
git add .
git commit -m "Update app"
git push origin main
```

### 2. Vercel に import

GitHub リポジトリを Vercel に読み込んで Next.js プロジェクトとしてデプロイします。

### 3. Vercel の環境変数

```env
NEXT_PUBLIC_APP_NAME=Smart Kakeibo
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
ALLOW_DEMO_MODE_IN_PRODUCTION=false
AI_PROVIDER=mock
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
CRON_SECRET=16文字以上のランダム文字列
NEXT_PUBLIC_TIMEZONE=Asia/Tokyo
APP_BASE_URL=https://あなたの本番URL
```

環境変数を更新したら Vercel を再デプロイしてください。

補足:

- 本番環境では `DEMO_MODE=true` でも自動で無効になるようにしています
- 本番でどうしてもデモモードを使う特殊ケースだけ `ALLOW_DEMO_MODE_IN_PRODUCTION=true` を明示してください

## Supabase Cron の設定

Supabase Dashboard:

1. `Integrations`
2. `Cron`
3. `pg_net` を有効化
4. `Create job`

入力例:

- Name: `daily-kakeibo-report`
- Schedule: `0 8 * * *`
- Type: `HTTP Request`
- Method: `POST`
- URL:

```text
https://あなたの本番URL/api/jobs/daily-report
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

### 3000 番ポート

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/jobs/daily-report" `
  -Headers @{ Authorization = "Bearer あなたのCRON_SECRET" } `
  -ContentType "application/json" `
  -Body '{"force":true}'
```

### 3001 番ポート

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3001/api/jobs/daily-report" `
  -Headers @{ Authorization = "Bearer あなたのCRON_SECRET" } `
  -ContentType "application/json" `
  -Body '{"force":true}'
```

### 本番 URL

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "https://あなたの本番URL/api/jobs/daily-report" `
  -Headers @{ Authorization = "Bearer あなたのCRON_SECRET" } `
  -ContentType "application/json" `
  -Body '{"force":true}'
```

結果を詳しく見る:

```powershell
$result = Invoke-RestMethod `
  -Method POST `
  -Uri "https://あなたの本番URL/api/jobs/daily-report" `
  -Headers @{ Authorization = "Bearer あなたのCRON_SECRET" } `
  -ContentType "application/json" `
  -Body '{"force":true}'

$result.result.results | Format-List
```

## トラブルシュート

### `Cannot POST /api/jobs/daily-report`

- アプリが起動していない可能性があります
- まず `/login` が開けるか確認してください
- 3000 番が別のアプリで使われているなら 3001 番で起動してください

### `Invalid supabaseUrl`

- Vercel の `NEXT_PUBLIC_SUPABASE_URL` が空か不正です
- `https://<project-ref>.supabase.co` の形で入っているか確認してください

### LINE Webhook が 401

- `LINE_CHANNEL_SECRET` が Vercel 側で一致しているか確認してください
- 環境変数更新後は再デプロイが必要です

### `already_sent_today`

- その日はすでに送信済みなので、二重送信防止でスキップされています
- `daily_report_logs` を確認してください

## よく使うコマンド

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run supabase:start
npm.cmd run supabase:reset
```
