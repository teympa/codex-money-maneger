# Smart Kakeibo 実装計画

## 1. ディレクトリ構成案

```text
src/
  app/
    (auth)/login
    (protected)/
      accounts
      budgets
      chat-input
      dashboard
      goals
      import/csv
      settings
      transactions
    api/
  components/
    layout/
    dashboard/
    forms/
    transactions/
    shared/
  domain/
    models/
    value-objects/
  application/
    services/
    use-cases/
  infrastructure/
    repositories/
    supabase/
    ai/
    imports/
    notifications/
  lib/
  types/
supabase/
  migrations/
  seed.sql
docs/
```

## 2. DB schema 提案

- `profiles`: Supabase Auth の `auth.users` と 1:1。タイムゾーン、通貨を保持
- `accounts`: 口座と支払手段を統一管理
- `categories`: 支出 / 収入 / 貯金カテゴリ
- `transactions`: 収入、支出、振替、調整の中心テーブル
- `budgets`: 月別予算
- `saving_goals`: 貯金目標
- `classification_rules`: 自動分類ルール
- `sync_logs`: CSV / API 同期ログ
- `alerts`: 予算超過や危険状態
- `user_notification_settings`: LINE 通知設定
- `daily_report_logs`: 日次レポート配信ログ

## 3. 実装計画

### Step 1

- Next.js App Router + Tailwind + TypeScript の土台構築
- 共通レイアウトとナビゲーション作成
- Supabase クライアント初期化
- migration / seed の追加

### Step 2

- MVP 実装
- 認証画面
- accounts CRUD
- transactions CRUD
- dashboard 集計
- budgets 管理
- saving_goals 管理

### Step 3

- 自然言語入力インターフェース
- CSV import preview / commit
- 重複候補判定
- 自動分類ルール基礎

### Step 4

- alerts 生成
- LINE 通知設定
- report generator
- scheduled job endpoint

### Step 5

- transfer / adjustment UX 改善
- 現金 / 電子マネー残高強化
- 支払手段別集計強化

## 4. MVP スコープ定義

含めるもの:

- ログイン画面
- ダッシュボード
- 口座一覧・追加
- 明細一覧・追加・編集・削除
- 予算一覧・追加
- 貯金目標一覧・追加
- 設定画面の基本セクション

MVP では UI を先に動かし、自然言語入力、CSV 取込、LINE 通知はプレースホルダと拡張ポイントを含む形に留めます。
