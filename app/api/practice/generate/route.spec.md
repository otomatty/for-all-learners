# route.spec.md - Practice Question Generation API Route Specification

**対象ファイル**: `app/api/practice/generate/route.ts`
**作成日**: 2025-11-03
**フェーズ**: Phase 1.3 - Practice Generate Route getUserAPIKey Integration

---

## 概要

練習問題生成APIルート（`/api/practice/generate`）に、ユーザーが選択したLLMプロバイダー（Google Gemini, OpenAI, Anthropic）とモデルを指定できる機能を追加します。

これにより、フロントエンドから `provider` と `model` パラメータを受け取り、`generateQuestions()` に渡すことで、ユーザーが設定したAPIキーを使用して問題生成を実行できます。

---

## 要件定義

### R-001: プロバイダー選択のサポート
- リクエストボディに `provider?: "google" | "openai" | "anthropic"` パラメータを追加
- 指定がない場合はデフォルト（"google"）を使用
- 不正な値の場合は400エラーを返す

### R-002: モデル指定のサポート
- リクエストボディに `model?: string` パラメータを追加
- 指定がない場合は環境変数またはデフォルトモデルを使用

### R-003: generateQuestions統合
- `generateQuestions()` の第5引数に `{ provider, model }` を渡す
- 既存の実装（provider/model未指定）も引き続き動作

### R-004: バリデーション強化
- `cardIds` が空配列の場合は400エラー
- `type` が不正な値の場合は400エラー
- `provider` が不正な値の場合は400エラー

### R-005: エラーハンドリング
- getUserAPIKey エラー（APIキー未設定）を適切にハンドリング
- LLM API呼び出しエラーを適切にハンドリング
- 各エラーに対して明確なエラーメッセージを返す

### R-006: ロギング統合
- リクエスト開始時: cardIds数、type、provider、model
- 問題生成開始時: cardId、provider
- 問題生成完了時: cardId、成功/失敗
- エラー時: 詳細なエラー情報

---

## リクエスト/レスポンス仕様

### リクエストボディ

```typescript
interface GeneratePracticeRequest {
  cardIds: string[];        // 必須: カードIDの配列
  type: QuestionType;       // 必須: "flashcard" | "multiple_choice" | "cloze"
  provider?: LLMProvider;   // オプション: "google" | "openai" | "anthropic"
  model?: string;           // オプション: モデル名（例: "gpt-4", "claude-3-opus"）
}
```

### レスポンスボディ（成功）

```typescript
interface GeneratePracticeResponse {
  questions: Array<{
    cardId: string;
    question: QuestionData;
  }>;
}
```

### レスポンスボディ（エラー）

```typescript
interface ErrorResponse {
  error: string;
}
```

---

## テストケース

### TC-001: 基本的な問題生成（デフォルトプロバイダー）
**入力**:
```json
{
  "cardIds": ["card-1", "card-2"],
  "type": "flashcard"
}
```
**期待**:
- ステータス: 200
- レスポンス: 2つの問題が生成される
- generateQuestions が provider="google" で呼ばれる

### TC-002: Googleプロバイダー指定
**入力**:
```json
{
  "cardIds": ["card-1"],
  "type": "flashcard",
  "provider": "google"
}
```
**期待**:
- ステータス: 200
- generateQuestions が provider="google" で呼ばれる

### TC-003: OpenAIプロバイダー指定
**入力**:
```json
{
  "cardIds": ["card-1"],
  "type": "multiple_choice",
  "provider": "openai"
}
```
**期待**:
- ステータス: 200
- generateQuestions が provider="openai" で呼ばれる

### TC-004: Anthropicプロバイダー指定
**入力**:
```json
{
  "cardIds": ["card-1"],
  "type": "cloze",
  "provider": "anthropic"
}
```
**期待**:
- ステータス: 200
- generateQuestions が provider="anthropic" で呼ばれる

### TC-005: カスタムモデル指定
**入力**:
```json
{
  "cardIds": ["card-1"],
  "type": "flashcard",
  "provider": "openai",
  "model": "gpt-4"
}
```
**期待**:
- ステータス: 200
- generateQuestions が provider="openai", model="gpt-4" で呼ばれる

### TC-006: バリデーションエラー（cardIds未指定）
**入力**:
```json
{
  "type": "flashcard"
}
```
**期待**:
- ステータス: 400
- エラーメッセージ: "cardIds and type are required"

### TC-007: バリデーションエラー（type未指定）
**入力**:
```json
{
  "cardIds": ["card-1"]
}
```
**期待**:
- ステータス: 400
- エラーメッセージ: "cardIds and type are required"

### TC-008: バリデーションエラー（空のcardIds）
**入力**:
```json
{
  "cardIds": [],
  "type": "flashcard"
}
```
**期待**:
- ステータス: 400
- エラーメッセージ: "cardIds must not be empty"

### TC-009: バリデーションエラー（不正なprovider）
**入力**:
```json
{
  "cardIds": ["card-1"],
  "type": "flashcard",
  "provider": "invalid-provider"
}
```
**期待**:
- ステータス: 400
- エラーメッセージ: "Invalid provider. Must be one of: google, openai, anthropic"

### TC-010: APIキー未設定エラー
**入力**:
```json
{
  "cardIds": ["card-1"],
  "type": "flashcard",
  "provider": "openai"
}
```
**期待** (getUserAPIKeyがエラーをthrow):
- ステータス: 500
- エラーメッセージ: "API key not configured for provider: openai. Please set it in Settings."

### TC-011: データベースエラー
**入力**:
```json
{
  "cardIds": ["non-existent-id"],
  "type": "flashcard"
}
```
**期待** (Supabaseがエラーを返す):
- ステータス: 500
- エラーメッセージ: "Failed to fetch cards"

### TC-012: LLM API呼び出しエラー
**入力**:
```json
{
  "cardIds": ["card-1"],
  "type": "flashcard",
  "provider": "google"
}
```
**期待** (generateQuestionsがエラーをthrow):
- ステータス: 500
- エラーメッセージ: エラー詳細

---

## 実装ノート

### 1. リクエストボディの型定義

```typescript
interface GeneratePracticeRequest {
  cardIds: string[];
  type: QuestionType;
  provider?: LLMProvider;
  model?: string;
}
```

### 2. バリデーション順序

1. cardIds と type の必須チェック
2. cardIds が空配列でないかチェック
3. provider が有効な値かチェック（指定されている場合）
4. type が有効な値かチェック（generateQuestions に渡す前）

### 3. generateQuestions呼び出し

```typescript
const qData = await generateQuestions(
  card.front_content as string,
  card.back_content as string,
  type,
  "normal", // difficulty
  provider || model ? { provider, model } : undefined, // options
);
```

**注意**: `provider` または `model` が指定されている場合のみ options オブジェクトを渡す（後方互換性のため）

### 4. エラーハンドリング

```typescript
try {
  // ... 処理
} catch (err: unknown) {
  logger.error(
    {
      cardIds,
      type,
      provider,
      error: err instanceof Error ? err.message : String(err),
    },
    "Failed to generate practice questions"
  );

  if (err instanceof Error) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  return NextResponse.json(
    { error: "An unknown error occurred" },
    { status: 500 }
  );
}
```

### 5. ロギング

```typescript
import { logger } from "@/lib/logger";

// リクエスト開始
logger.info(
  {
    cardCount: cardIds.length,
    type,
    provider: provider || "google",
    model: model || "default",
  },
  "Starting practice question generation"
);

// 各カードの処理開始
logger.info(
  { cardId: card.id, provider: provider || "google" },
  "Generating question for card"
);

// 処理完了
logger.info(
  { cardCount: questions.length },
  "Practice question generation completed"
);
```

---

## 依存関係

### Parents (このファイルを使用)
- フロントエンド: `components/practice/*` (練習問題UI)
- フロントエンド: `app/(protected)/practice/page.tsx`

### Dependencies (このファイルが使用)
- `@/lib/gemini`: generateQuestions, QuestionType
- `@/lib/supabase/server`: createClient
- `@/lib/logger`: logger
- `@/app/_actions/ai/getUserAPIKey`: LLMProvider（型定義）

---

## 後方互換性

既存のフロントエンドコード（provider/model未指定）は引き続き動作：

```typescript
// ✅ 既存コード（後方互換）
const response = await fetch("/api/practice/generate", {
  method: "POST",
  body: JSON.stringify({
    cardIds: ["card-1"],
    type: "flashcard",
  }),
});

// ✅ 新しいコード（provider指定）
const response = await fetch("/api/practice/generate", {
  method: "POST",
  body: JSON.stringify({
    cardIds: ["card-1"],
    type: "flashcard",
    provider: "openai",
    model: "gpt-4",
  }),
});
```

---

## セキュリティ考慮事項

### 1. APIキーの保護
- APIキーはクライアントに送信しない
- getUserAPIKey で暗号化されたキーを取得
- ログにAPIキーを出力しない

### 2. 入力検証
- cardIds が不正な形式でないか検証
- provider が許可された値のみか検証
- SQLインジェクション対策（Supabaseが対応）

### 3. レート制限（将来的な拡張）
- ユーザーごとのリクエスト制限
- IP アドレスごとの制限

---

## パフォーマンス考慮事項

### 1. 並列処理
- `Promise.all()` で複数カードの問題を並列生成
- ただし、LLM API のレート制限に注意

### 2. タイムアウト
- LLM API 呼び出しにタイムアウトを設定（generateQuestions内部で実装済み）

### 3. キャッシング（将来的な拡張）
- 同じカード・タイプの問題を一定期間キャッシュ

---

## テスト戦略

### 1. ユニットテスト
- リクエストバリデーション
- エラーハンドリング
- generateQuestions 呼び出し

### 2. モック
- Supabase クライアント
- generateQuestions 関数
- getUserAPIKey（間接的にモック、generateQuestionsのモック内で対応）

### 3. テストカバレッジ目標
- 行カバレッジ: ≥ 90%
- 分岐カバレッジ: ≥ 85%

---

## 関連ドキュメント

- **実装ファイル**: `app/api/practice/generate/route.ts`
- **依存関数仕様**: `lib/gemini.spec.md`
- **getUserAPIKey仕様**: `app/_actions/ai/getUserAPIKey.spec.md`
- **実装計画**: `docs/03_plans/ai-integration/phase1-implementation-plan.md`

---

**最終更新**: 2025-11-03
**作成者**: AI (Grok Code Fast 1.5)
