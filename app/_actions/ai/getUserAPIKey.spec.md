# getUserAPIKey.spec.md

**対象:** ユーザーAPIキー取得
**ファイル:** `app/_actions/ai/getUserAPIKey.ts`
**作成日:** 2025-11-02

---

## 概要

指定されたLLMプロバイダーのAPIキーを取得します。
ユーザーが設定したAPIキーを優先し、未設定の場合は環境変数をフォールバックとして使用します。

---

## 要件

### 機能要件

#### FR-1: ユーザーAPIキー取得
- ユーザーが設定したAPIキーを取得
- 暗号化されたキーを復号化
- プロバイダー指定（google/openai/anthropic）

#### FR-2: 環境変数フォールバック
- ユーザーキー未設定時は環境変数使用
- 未認証ユーザーは環境変数使用

#### FR-3: エラーハンドリング
- APIキーが存在しない場合はエラー
- 復号化失敗時はエラー
- わかりやすいエラーメッセージ

### 非機能要件

#### NFR-1: セキュリティ
- APIキーをログに出力しない
- 復号化は安全に実行

#### NFR-2: パフォーマンス
- データベースクエリ最小化
- キャッシュ不要（セキュリティ優先）

---

## 関数シグネチャ

```typescript
export async function getUserAPIKey(
  provider: LLMProvider
): Promise<string>
```

### パラメータ

| 名前 | 型 | 必須 | 説明 |
|------|------|------|------|
| provider | LLMProvider | ✅ | プロバイダー名（"google" \| "openai" \| "anthropic"） |

### 戻り値

| 型 | 説明 |
|------|------|
| Promise<string> | 復号化されたAPIキー |

### エラー

| ケース | エラーメッセージ |
|--------|------------------|
| プロバイダー不正 | "Invalid provider: {provider}" |
| APIキー未設定 | "API key not configured for provider: {provider}. Please set it in Settings." |
| 復号化失敗 | "Failed to decrypt API key" |

---

## ロジックフロー

```
getUserAPIKey(provider)
  ↓
認証チェック
  ├─ 認証済み
  │   ↓
  │ user_api_keys から取得
  │   ├─ 存在する → 復号化して返す
  │   └─ 存在しない → 環境変数フォールバック
  │
  └─ 未認証 → 環境変数フォールバック

環境変数フォールバック:
  ├─ GEMINI_API_KEY (google)
  ├─ OPENAI_API_KEY (openai)
  └─ ANTHROPIC_API_KEY (anthropic)
```

---

## テストケース

### TC-001: 認証ユーザー、APIキー設定済み
**入力:**
- provider: "google"
- ユーザー: 認証済み
- user_api_keys: 存在

**期待:**
- 復号化されたAPIキーを返す
- データベースクエリ1回

---

### TC-002: 認証ユーザー、APIキー未設定、環境変数あり
**入力:**
- provider: "google"
- ユーザー: 認証済み
- user_api_keys: 存在しない
- 環境変数: GEMINI_API_KEY設定済み

**期待:**
- 環境変数のAPIキーを返す

---

### TC-003: 未認証ユーザー、環境変数あり
**入力:**
- provider: "google"
- ユーザー: 未認証
- 環境変数: GEMINI_API_KEY設定済み

**期待:**
- 環境変数のAPIキーを返す

---

### TC-004: APIキー完全に未設定
**入力:**
- provider: "google"
- ユーザー: 認証済み
- user_api_keys: 存在しない
- 環境変数: GEMINI_API_KEY未設定

**期待:**
- エラー: "API key not configured for provider: google. Please set it in Settings."

---

### TC-005: 不正なプロバイダー
**入力:**
- provider: "invalid"

**期待:**
- エラー: "Invalid provider: invalid"

---

### TC-006: 復号化失敗
**入力:**
- provider: "google"
- ユーザー: 認証済み
- user_api_keys: 存在（暗号化データ不正）

**期待:**
- エラー: "Failed to decrypt API key"

---

## 実装ノート

### セキュリティ考慮事項

1. **ログ出力禁止**
```typescript
// ❌ Bad
logger.info("API key retrieved", { apiKey });

// ✅ Good
logger.info("API key retrieved", { provider, hasKey: !!apiKey });
```

2. **エラーメッセージ**
```typescript
// ユーザー向け: わかりやすく
"API key not configured. Please set it in Settings."

// 開発者向け: 詳細情報
logger.error("Failed to retrieve API key", { provider, userId, error });
```

### パフォーマンス

```typescript
// Single query - 効率的
const { data } = await supabase
  .from("user_api_keys")
  .select("encrypted_key")
  .eq("user_id", user.id)
  .eq("provider", provider)
  .single();
```

---

## 依存関係

### 使用するモジュール
- `@/lib/supabase/server` - createClient
- `@/lib/encryption/api-key-vault` - decryptAPIKey
- `@/lib/llm/client` - LLMProvider型

### 使用される場所（予定）
- `app/_actions/generatePageInfo.ts`
- `app/_actions/ai/generateCards.ts`
- `components/ai/ProviderSelector.tsx`

---

## 関連ドキュメント

- [Phase 1.0 統合計画](../../../docs/03_plans/mastra-infrastructure/20251102_04_phase10-integration-plan.md)
- [API Key Management](./apiKey.spec.md)
- [LLM Client](../../../lib/llm/client.spec.md)

---

**最終更新:** 2025-11-02
**作成者:** AI (Claude 3.5 Sonnet)
