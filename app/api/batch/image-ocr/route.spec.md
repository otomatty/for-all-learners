# route.spec.md - Image Batch OCR API Route Specification

**対象ファイル**: `app/api/batch/image-ocr/route.ts`
**作成日**: 2025-11-17
**フェーズ**: Phase 4.1 - Batch Processing Migration

---

## 概要

画像のバッチOCR処理をAPI Routesに移行します。既存の `transcribeImagesBatch` Server ActionをAPI Routeに変換し、クライアント側から呼び出せるようにします。

---

## 要件定義

### R-001: バッチOCR処理の実行
- 複数の画像を一度にOCR処理
- Gemini APIを使用してテキスト抽出
- バッチサイズは最大4画像（Geminiの制限）

### R-002: クォータ管理
- Gemini APIのクォータをチェック
- クォータ不足の場合は適切なエラーメッセージを返す

### R-003: リトライロジック
- API呼び出し失敗時に自動リトライ
- 429エラー（レート制限）の場合は適切な待機時間を設定

### R-004: エラーハンドリング
- 画像取得失敗の処理
- API呼び出しエラーの処理
- JSON解析エラーの処理

### R-005: 認証チェック
- ユーザー認証の確認
- 未認証の場合は401エラーを返す

---

## リクエスト/レスポンス仕様

### リクエストボディ

```typescript
interface ImageBatchOcrRequest {
  pages: Array<{
    pageNumber: number;
    imageUrl: string;
  }>;
  batchSize?: number; // オプション: デフォルト4
}
```

### レスポンスボディ（成功）

```typescript
interface ImageBatchOcrResponse {
  success: boolean;
  message: string;
  extractedPages?: Array<{
    pageNumber: number;
    text: string;
  }>;
  error?: string;
  processedCount?: number;
  skippedCount?: number;
}
```

### レスポンスボディ（エラー）

```typescript
interface ErrorResponse {
  error: string;
  message?: string;
}
```

---

## テストケース

### TC-001: 基本的なバッチOCR処理
**入力**:
```json
{
  "pages": [
    { "pageNumber": 1, "imageUrl": "https://example.com/image1.png" },
    { "pageNumber": 2, "imageUrl": "https://example.com/image2.png" }
  ]
}
```
**期待**:
- ステータス: 200
- レスポンス: 抽出されたテキストが含まれる
- processedCount: 2

### TC-002: バッチサイズの指定
**入力**:
```json
{
  "pages": [
    { "pageNumber": 1, "imageUrl": "https://example.com/image1.png" },
    { "pageNumber": 2, "imageUrl": "https://example.com/image2.png" },
    { "pageNumber": 3, "imageUrl": "https://example.com/image3.png" },
    { "pageNumber": 4, "imageUrl": "https://example.com/image4.png" },
    { "pageNumber": 5, "imageUrl": "https://example.com/image5.png" }
  ],
  "batchSize": 2
}
```
**期待**:
- ステータス: 200
- 複数のバッチに分割されて処理される

### TC-003: バリデーションエラー（pages未指定）
**入力**:
```json
{}
```
**期待**:
- ステータス: 400
- エラーメッセージ: "pages are required"

### TC-004: バリデーションエラー（空のpages）
**入力**:
```json
{
  "pages": []
}
```
**期待**:
- ステータス: 400
- エラーメッセージ: "pages must not be empty"

### TC-005: クォータ不足エラー
**入力**:
```json
{
  "pages": [
    { "pageNumber": 1, "imageUrl": "https://example.com/image1.png" }
  ]
}
```
**期待** (クォータ不足の場合):
- ステータス: 429
- エラーメッセージ: クォータ不足のメッセージ

### TC-006: 画像取得失敗
**入力**:
```json
{
  "pages": [
    { "pageNumber": 1, "imageUrl": "https://invalid-url.com/image.png" }
  ]
}
```
**期待**:
- ステータス: 200（部分成功）
- skippedCount: 1
- extractedPages: 空配列または部分的な結果

### TC-007: API呼び出しエラー
**入力**:
```json
{
  "pages": [
    { "pageNumber": 1, "imageUrl": "https://example.com/image1.png" }
  ]
}
```
**期待** (API呼び出し失敗の場合):
- ステータス: 500
- エラーメッセージ: API呼び出しエラーの詳細

### TC-008: 認証エラー
**入力**:
```json
{
  "pages": [
    { "pageNumber": 1, "imageUrl": "https://example.com/image1.png" }
  ]
}
```
**期待** (未認証の場合):
- ステータス: 401
- エラーメッセージ: "Authentication required"

---

## 実装ノート

### 1. 認証チェック

```typescript
const supabase = createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
  return NextResponse.json(
    { error: "Authentication required" },
    { status: 401 }
  );
}
```

### 2. バリデーション

```typescript
if (!body.pages || !Array.isArray(body.pages)) {
  return NextResponse.json(
    { error: "pages are required" },
    { status: 400 }
  );
}

if (body.pages.length === 0) {
  return NextResponse.json(
    { error: "pages must not be empty" },
    { status: 400 }
  );
}
```

### 3. 既存関数の呼び出し

```typescript
import { transcribeImagesBatch } from "@/app/_actions/transcribeImageBatch";

const result = await transcribeImagesBatch(
  body.pages,
  body.batchSize || 4
);
```

### 4. エラーハンドリング

```typescript
try {
  const result = await transcribeImagesBatch(body.pages, body.batchSize || 4);
  return NextResponse.json(result);
} catch (error) {
  logger.error({ error }, "Image batch OCR failed");
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unknown error" },
    { status: 500 }
  );
}
```

---

## 依存関係

### Parents (このファイルを使用)
- フロントエンド: カスタムフック `hooks/batch/useImageBatchOcr.ts` (作成予定)

### Dependencies (このファイルが使用)
- `@/app/_actions/transcribeImageBatch`: transcribeImagesBatch
- `@/lib/supabase/server`: createClient
- `@/lib/logger`: logger

---

## 関連ドキュメント

- **実装ファイル**: `app/api/batch/image-ocr/route.ts`
- **移行元**: `app/_actions/transcribeImageBatch.ts`
- **実装計画**: `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md`

---

**最終更新**: 2025-11-17
**作成者**: AI Agent
