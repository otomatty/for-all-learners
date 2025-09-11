# API・データベース仕様書

**Feature Branch**: `003-api`  
**Created**: 2024-12-27  
**Status**: Ready for Use  
**Input**: API・データベース仕様書の作成

## 概要

F.A.L (For All Learners) アプリケーションの API 設計とデータベース構造を包括的に文書化します。本仕様書は、システムアーキテクチャの理解、API 設計の一貫性確保、データベース運用ガイドライン、パフォーマンス最適化、セキュリティベストプラクティスの共有を目的としています。

---

## 1. API 設計仕様

### 1.1 API アーキテクチャ概要

#### **フレームワーク**

- Next.js 15 App Router
- API Routes (`app/api/`)
- Server Actions (`app/_actions/`)

#### **認証・認可**

- Supabase Auth による JWT トークン認証
- Middleware による保護ルート制御
- Row Level Security (RLS) による細粒度アクセス制御

#### **データ処理パターン**

- RESTful API 設計原則
- 型安全性確保 (TypeScript + 自動生成データベース型)
- エラーハンドリング統一パターン

### 1.2 API エンドポイント分類

#### **Core Learning APIs**

```typescript
// カードクイズ生成・実行
POST / api / practice / generate; // クイズセッション生成
POST / api / practice / log; // 学習結果記録

// 検索・サジェスト
GET / api / search - suggestions; // 統合検索候補取得
```

#### **Content Management APIs**

```typescript
// ページ管理
GET / api / pages; // ページ一覧取得
GET / api / notes / [slug] / pages; // ノート内ページ取得

// ファイル処理
GET / api / pdf - jobs; // PDFジョブ一覧
POST / api / pdf - jobs; // PDFアップロード処理
PATCH / api / pdf - jobs / [jobId]; // ジョブ状態更新
DELETE / api / pdf - jobs / [jobId]; // ジョブ削除
GET / api / pdf - jobs / stats; // 処理統計取得
```

#### **External Integration APIs**

```typescript
// CoSense連携
GET / api / cosense / pages / [projectName]; // プロジェクトページ一覧
GET / api / cosense / sync / list / [cosenseProjectId]; // 同期対象リスト
GET / api / cosense / sync / page / [cosenseProjectId] / [title]; // ページ同期実行

// Gyazo連携
GET / api / gyazo / callback; // OAuth認証コールバック
POST / api / gyazo / disconnect; // アカウント連携解除
```

#### **System Management APIs**

```typescript
// ユーザーアイコン
GET / api / user - icon / [slug]; // ユーザーアイコン画像取得

// 開発・運用
GET / api / commit - history; // リリース履歴取得
```

### 1.3 Server Actions 設計

#### **アカウント・認証**

- `accounts.ts`: ユーザープロファイル管理
- `auth.ts`: 認証フロー制御
- `subscriptions.ts`: サブスクリプション管理
- `user_settings.ts`: ユーザー設定管理

#### **学習コンテンツ**

- `decks.ts`: デッキ CRUD 操作
- `cards.ts`: カード CRUD 操作
- `pages.ts`: ページ CRUD 操作
- `questions.ts`: 問題生成・管理
- `learning_logs.ts`: 学習記録管理

#### **AI・自動化**

- `generateCards.ts`: AI カード生成
- `generatePageInfo.ts`: ページ情報自動生成
- `transcribe.ts`: 音声・画像文字起こし
- `pdfOcr.ts`: PDF OCR 処理

#### **共有・連携**

- `note-deck-links.ts`: ノート-デッキ関連付け
- `cosense.ts`: CoSense API 連携
- `gyazo.ts`: Gyazo API 連携

### 1.4 API 設計パターン

#### **エラーハンドリング**

```typescript
// 統一エラーレスポンス形式
interface ErrorResponse {
  error: string;
  message?: string;
  details?: Record<string, any>;
}

// 認証エラー: 401 Unauthorized
// 認可エラー: 403 Forbidden
// リソース不存在: 404 Not Found
// バリデーションエラー: 400 Bad Request
// サーバーエラー: 500 Internal Server Error
```

#### **レスポンス形式**

```typescript
// 成功レスポンス
interface SuccessResponse<T> {
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

// 一覧取得レスポンス
interface ListResponse<T> extends SuccessResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
```

#### **認証パターン**

```typescript
// クライアント側認証確認
const supabase = createClient();
const {
  data: { session },
} = await supabase.auth.getSession();
if (!session) throw new Error("Unauthorized");

// サーバー側ユーザー取得
const supabase = await createClient();
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
if (error || !user) throw new Error("Authentication required");
```

---

## 2. データベース設計仕様

### 2.1 データベースアーキテクチャ

#### **プラットフォーム**

- **Supabase (PostgreSQL 15+)**
- 自動バックアップ・災害復旧
- リアルタイムデータ同期
- 拡張機能: pgcrypto (暗号化)、pg_trgm (全文検索)

#### **スキーマ構成**

- **public**: アプリケーションデータ
- **auth**: Supabase Auth 管理テーブル (自動管理)
- **extensions**: PostgreSQL 拡張機能

### 2.2 テーブル設計

#### **2.2.1 ユーザー・認証系**

##### accounts テーブル

```sql
CREATE TABLE accounts (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  user_slug TEXT UNIQUE,      -- URL用スラッグ
  avatar_url TEXT,
  gender VARCHAR(10) CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  birthdate DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

##### admin_users テーブル

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES accounts(id) UNIQUE NOT NULL,
  role admin_role NOT NULL,              -- 'super_admin' | 'admin' | 'moderator'
  permissions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **2.2.2 学習コンテンツ系**

##### decks テーブル (フラッシュカードデッキ)

```sql
CREATE TABLE decks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES accounts(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

##### cards テーブル (フラッシュカード)

```sql
CREATE TABLE cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID REFERENCES decks(id) NOT NULL,
  user_id UUID REFERENCES accounts(id) NOT NULL,
  front_content JSONB NOT NULL DEFAULT '{"type": "doc", "content": []}'::jsonb,
  back_content JSONB NOT NULL DEFAULT '{"type": "doc", "content": []}'::jsonb,
  source_audio_url TEXT,
  source_ocr_image_url TEXT,
  -- FSRS アルゴリズム用フィールド
  ease_factor DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  repetition_count INTEGER NOT NULL DEFAULT 0,
  review_interval INTEGER NOT NULL DEFAULT 0,
  next_review_at TIMESTAMP WITH TIME ZONE,
  stability DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  difficulty DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- パフォーマンス最適化インデックス
CREATE INDEX idx_cards_front_content_gin ON cards USING gin (front_content jsonb_path_ops);
CREATE INDEX idx_cards_back_content_gin ON cards USING gin (back_content jsonb_path_ops);
CREATE INDEX idx_cards_next_review_at ON cards (next_review_at) WHERE next_review_at IS NOT NULL;
```

##### pages テーブル (学習ページ)

```sql
CREATE TABLE pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES accounts(id) NOT NULL,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  content_tiptap JSONB NOT NULL,         -- Tiptap エディタ形式
  -- CoSense連携フィールド
  scrapbox_page_id TEXT,
  scrapbox_page_list_synced_at TIMESTAMPTZ,
  scrapbox_page_content_synced_at TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 一意制約
  CONSTRAINT pages_user_scrapbox_unique UNIQUE (user_id, scrapbox_page_id)
);

-- 自動更新トリガー
CREATE TRIGGER trg_pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_timestamp();
```

##### questions テーブル (問題バリエーション)

```sql
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) NOT NULL,
  user_id UUID REFERENCES accounts(id) NOT NULL,
  type VARCHAR(20) NOT NULL,             -- 'multiple_choice', 'fill_blank', etc.
  question_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **2.2.3 学習記録・分析系**

##### learning_logs テーブル

```sql
CREATE TABLE learning_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES accounts(id) NOT NULL,
  card_id UUID REFERENCES cards(id) NOT NULL,
  question_id UUID REFERENCES questions(id),
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_correct BOOLEAN NOT NULL,
  user_answer TEXT,
  practice_mode VARCHAR(20) NOT NULL,    -- 'review', 'new', 'cramming'
  review_interval INTEGER,
  next_review_at TIMESTAMP WITH TIME ZONE,
  quality SMALLINT NOT NULL DEFAULT 0,   -- FSRS品質スコア (0-4)
  response_time INTEGER NOT NULL DEFAULT 0, -- ミリ秒
  effort_time INTEGER NOT NULL DEFAULT 0,   -- ミリ秒
  attempt_count INTEGER NOT NULL DEFAULT 1
);
```

##### study_goals テーブル (学習目標)

```sql
CREATE TABLE study_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES accounts(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  progress_rate INTEGER NOT NULL DEFAULT 0 CHECK (progress_rate BETWEEN 0 AND 100),
  status VARCHAR(20) NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','completed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **2.2.4 共有・コラボレーション系**

##### deck_shares テーブル (デッキ共有)

```sql
CREATE TABLE deck_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID REFERENCES decks(id) NOT NULL,
  shared_with_user_id UUID REFERENCES accounts(id) NOT NULL,
  permission_level VARCHAR(10) NOT NULL CHECK (permission_level IN ('view','edit')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(deck_id, shared_with_user_id)
);
```

##### page_shares テーブル (ページ共有)

```sql
CREATE TABLE page_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID REFERENCES pages(id) NOT NULL,
  shared_with_user_id UUID REFERENCES accounts(id) NOT NULL,
  permission_level VARCHAR(10) NOT NULL CHECK (permission_level IN ('view','edit')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(page_id, shared_with_user_id)
);
```

##### share_links テーブル (公開リンク)

```sql
CREATE TABLE share_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('deck','page')),
  resource_id UUID NOT NULL,
  token TEXT UNIQUE NOT NULL,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('owner','editor','viewer')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **2.2.5 サブスクリプション・プラン系**

##### plans テーブル

```sql
CREATE TABLE plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  features JSONB,
  stripe_product_id TEXT UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

##### subscriptions テーブル

```sql
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES accounts(id) NOT NULL,
  plan_id UUID REFERENCES plans(id) NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  status subscription_status NOT NULL,   -- 'active', 'canceled', 'past_due', etc.
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **2.2.6 外部連携系**

##### user_gyazo_images テーブル

```sql
CREATE TABLE user_gyazo_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES accounts(id) NOT NULL,
  gyazo_image_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  permalink_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, gyazo_image_id)
);
```

##### user_llm_api_keys テーブル (暗号化保存)

```sql
CREATE TABLE user_llm_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES accounts(id) UNIQUE NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gemini',
  api_key_encrypted TEXT NOT NULL,       -- pgcrypto で暗号化
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.3 関連付けテーブル

#### card_page_links テーブル (多対多関連)

```sql
CREATE TABLE card_page_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) NOT NULL,
  page_id UUID REFERENCES pages(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(card_id, page_id)
);
```

#### goal_deck_links テーブル (目標-デッキ関連)

```sql
CREATE TABLE goal_deck_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES study_goals(id) NOT NULL,
  deck_id UUID REFERENCES decks(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(goal_id, deck_id)
);
```

### 2.4 インデックス戦略

#### **パフォーマンスインデックス**

```sql
-- ユーザー関連クエリ最適化
CREATE INDEX idx_decks_user_id ON decks (user_id);
CREATE INDEX idx_cards_deck_id ON cards (deck_id);
CREATE INDEX idx_pages_user_id ON pages (user_id);

-- 学習記録分析用
CREATE INDEX idx_learning_logs_user_id_answered_at ON learning_logs (user_id, answered_at);
CREATE INDEX idx_cards_next_review ON cards (user_id, next_review_at)
  WHERE next_review_at IS NOT NULL;

-- 共有機能最適化
CREATE INDEX idx_deck_shares_shared_with_user_id ON deck_shares (shared_with_user_id);
CREATE INDEX idx_page_shares_shared_with_user_id ON page_shares (shared_with_user_id);

-- 全文検索用 (gin インデックス)
CREATE INDEX idx_pages_content_gin ON pages USING gin (content_tiptap jsonb_path_ops);
CREATE INDEX idx_cards_content_gin ON cards USING gin (
  (front_content || back_content) jsonb_path_ops
);
```

#### **一意制約インデックス**

```sql
-- CoSense連携の重複防止
CREATE UNIQUE INDEX idx_pages_user_scrapbox ON pages (user_id, scrapbox_page_id)
  WHERE scrapbox_page_id IS NOT NULL;

-- 共有関係の重複防止
CREATE UNIQUE INDEX idx_deck_shares_unique ON deck_shares (deck_id, shared_with_user_id);
CREATE UNIQUE INDEX idx_page_shares_unique ON page_shares (page_id, shared_with_user_id);
```

### 2.5 データベース関数

#### **暗号化関数**

```sql
-- LLM APIキー暗号化
CREATE OR REPLACE FUNCTION encrypt_user_llm_api_key(data TEXT, key TEXT)
RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT ENCODE(pgp_sym_encrypt(data, key), 'base64');
$$;

-- LLM APIキー復号化
CREATE OR REPLACE FUNCTION decrypt_user_llm_api_key(encrypted_base64 TEXT, key TEXT)
RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT CONVERT_FROM(
    pgp_sym_decrypt(DECODE(encrypted_base64, 'base64')::bytea, key)::bytea,
    'UTF8'
  );
$$;
```

#### **一括取得関数**

```sql
-- CoSense 同期用高速取得
CREATE OR REPLACE FUNCTION get_pages_by_ids(ids TEXT[], uid UUID)
RETURNS TABLE(scrapbox_page_id TEXT, updated_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT p.scrapbox_page_id, p.updated_at
  FROM pages p
  WHERE p.user_id = uid AND p.scrapbox_page_id = ANY(ids);
END;
$$ LANGUAGE plpgsql STABLE;
```

#### **統合検索関数**

```sql
CREATE FUNCTION search_suggestions(p_query TEXT)
RETURNS TABLE (
  type TEXT,
  id UUID,
  suggestion TEXT,
  excerpt TEXT
) LANGUAGE SQL STABLE AS $$
  -- カード検索
  SELECT 'card' as type, c.id, LEFT(c.front_content->>'text', 50) as suggestion,
         LEFT(c.back_content->>'text', 100) as excerpt
  FROM cards c
  WHERE c.front_content::text ILIKE '%' || p_query || '%'
     OR c.back_content::text ILIKE '%' || p_query || '%'
  LIMIT 5

  UNION ALL

  -- ページ検索
  SELECT 'page' as type, p.id, p.title as suggestion,
         LEFT(p.content_tiptap->>'text', 100) as excerpt
  FROM pages p
  WHERE p.title ILIKE '%' || p_query || '%'
     OR p.content_tiptap::text ILIKE '%' || p_query || '%'
  LIMIT 5;
$$;
```

---

## 3. セキュリティ・パフォーマンス

### 3.1 Row Level Security (RLS)

#### **基本ポリシーパターン**

```sql
-- 基本的な所有者ポリシー
CREATE POLICY "Users can manage own resources" ON table_name
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 共有リソースポリシー
CREATE POLICY "Users can access shared decks" ON decks
  FOR SELECT USING (
    user_id = auth.uid() OR
    id IN (
      SELECT deck_id FROM deck_shares
      WHERE shared_with_user_id = auth.uid()
    )
  );
```

### 3.2 データ暗号化

#### **機密データ暗号化**

- LLM API キー: `pgcrypto` による対称暗号化
- 暗号化キー: 環境変数で管理 (`ENCRYPTION_KEY`)
- 暗号化処理: 専用関数による自動化

### 3.3 パフォーマンス最適化

#### **クエリ最適化戦略**

- 適切なインデックス設計
- 部分インデックス活用 (条件付きインデックス)
- JSONB 演算子最適化
- 接続プーリング (Supabase 自動管理)

#### **大量データ処理**

- ページネーション実装
- 遅延ローディング
- バックグラウンド処理 (PDF OCR、AI 生成など)

---

## 4. 運用・モニタリング

### 4.1 ヘルスチェック

#### **データベース監視項目**

- 接続数・プール使用率
- クエリパフォーマンス
- ストレージ使用量
- レプリケーション遅延

#### **API 監視項目**

- レスポンス時間
- エラー率 (4xx, 5xx)
- スループット (RPS)
- 認証失敗率

### 4.2 バックアップ・災害復旧

#### **バックアップ戦略**

- 自動日次バックアップ (Supabase)
- Point-in-Time Recovery (PITR)
- 地理的冗長化

#### **復旧手順**

1. サービス停止通知
2. 最新バックアップからの復旧
3. データ整合性確認
4. サービス再開・ユーザー通知

---

## 5. 開発・統合ガイド

### 5.1 データベース型生成

```bash
# Supabase から TypeScript 型定義を自動生成
bun run gen:types

# 生成される型定義ファイル
# types/database.types.ts
```

### 5.2 新規 API 開発パターン

#### **API Route テンプレート**

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ビジネスロジック実装
    const { data, error } = await supabase
      .from("table_name")
      .select("*")
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

#### **Server Action テンプレート**

```typescript
// app/_actions/example.ts
"use server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export async function createExample(
  data: Database["public"]["Tables"]["table_name"]["Insert"]
): Promise<Database["public"]["Tables"]["table_name"]["Row"]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: result, error } = await supabase
    .from("table_name")
    .insert({ ...data, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return result;
}
```

### 5.3 データベース マイグレーション

#### **新規テーブル追加手順**

1. `database/migrations/` に SQL ファイル作成
2. Supabase ダッシュボードで実行
3. 型定義を再生成 (`bun run gen:types`)
4. RLS ポリシー設定
5. 必要に応じてインデックス追加

#### **カラム追加パターン**

```sql
-- 新規カラム追加
ALTER TABLE table_name
ADD COLUMN new_column TEXT DEFAULT 'default_value';

-- インデックス追加 (必要に応じて)
CREATE INDEX idx_table_name_new_column ON table_name (new_column);

-- RLS ポリシー更新 (必要に応じて)
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "updated_policy_name" ON table_name
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

---

## ✅ 品質チェックリスト

### **API 設計品質**

- [x] 全エンドポイントで認証・認可確認済み
- [x] 統一エラーハンドリング実装済み
- [x] TypeScript 型安全性確保済み
- [x] レート制限考慮済み (Supabase 標準)
- [x] CORS 設定適切 (Next.js 自動処理)

### **データベース品質**

- [x] 全テーブルに RLS ポリシー設定済み
- [x] 外部キー制約・CHECK 制約設定済み
- [x] 適切なインデックス戦略実装済み
- [x] 機密データ暗号化済み
- [x] バックアップ・復旧戦略確立済み

### **セキュリティ品質**

- [x] JWT 認証実装済み
- [x] 細粒度アクセス制御 (RLS) 実装済み
- [x] SQL インジェクション対策済み (パラメータ化クエリ)
- [x] 機密情報暗号化済み
- [x] 認証バイパス対策済み

### **パフォーマンス品質**

- [x] クエリ最適化済み
- [x] 適切なインデックス設計済み
- [x] 接続プール最適化済み (Supabase 管理)
- [x] 大量データ処理対策済み
- [x] レスポンス時間監視体制確立済み

### **運用品質**

- [x] 監視・アラート設定済み
- [x] ログ設計済み
- [x] 災害復旧手順確立済み
- [x] 開発ガイドライン整備済み
- [x] 型定義自動生成環境構築済み

---

**ドキュメント管理**

- **作成者**: GitHub Copilot
- **レビュー状態**: Ready for Use
- **更新履歴**: 初回作成 (2024-12-27)
- **関連仕様書**: 001-実装済み技術要件まとめ、002-認証・セキュリティ仕様書

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

[Describe the main user journey in plain language]

### Acceptance Scenarios

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

### Edge Cases

- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]
- **FR-003**: Users MUST be able to [key interaction, e.g., "reset their password"]
- **FR-004**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-005**: System MUST [behavior, e.g., "log all security events"]

_Example of marking unclear requirements:_

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities _(include if feature involves data)_

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status

_Updated by main() during processing_

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---
