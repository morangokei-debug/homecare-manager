# Homecare Manager

在宅訪問業務と処方管理を一元管理するWebアプリケーション

## 概要

- 訪問カレンダーを中心とした予定管理
- 患者・施設のマスタ管理
- 確定予定のPDF出力
- リマインド通知機能

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **UI**: shadcn/ui
- **バックエンド**: Next.js API Routes
- **ORM**: Prisma
- **データベース**: PostgreSQL
- **認証**: NextAuth.js

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` ファイルを編集して、以下を設定してください：

- `DATABASE_URL`: PostgreSQLの接続URL
- `AUTH_SECRET`: 認証用のシークレットキー（`openssl rand -base64 32` で生成）

### 3. データベースのセットアップ

```bash
# Prismaクライアント生成
npx prisma generate

# マイグレーション実行
npx prisma migrate dev
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセスできます。

## ディレクトリ構成

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   ├── (dashboard)/       # メイン画面
│   └── api/               # API Routes
├── components/            # コンポーネント
│   ├── ui/               # shadcn/ui
│   └── layout/           # レイアウト
├── lib/                   # ユーティリティ
└── types/                 # 型定義

prisma/
├── schema.prisma         # DBスキーマ
└── migrations/           # マイグレーション

docs/
├── requirements.md       # 要件定義書
├── tech-stack.md        # 技術選定書
└── database-design.md   # データ設計書
```

## ドキュメント

- [要件定義書](./docs/requirements.md)
- [技術選定書](./docs/tech-stack.md)
- [データ設計書](./docs/database-design.md)

## ライセンス

Private

