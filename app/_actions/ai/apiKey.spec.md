# apiKey.spec.md - APIキー管理Server Actions仕様書

**作成日:** 2025-11-02
**対象:** Server Actions (Next.js 15 App Router)
**Phase:** 0.4

---

## 概要

ユーザーごとのLLM APIキー管理を行うServer Actionsの仕様を定義します。
APIキーの保存、取得、削除、検証機能を提供し、データベースとの連携を行います。

---

## DEPENDENCY MAP

```
app/_actions/ai/apiKey.ts

Parents (使用先):
  ├─ app/(protected)/settings/api-keys/page.tsx (Phase 0.5 - 未実装)
  ├─ components/settings/APIKeyForm.tsx (Phase 0.5 - 未実装)
  └─ components/ai/APIKeyPrompt.tsx (Phase 0.5 - 未実装)

Dependencies (依存先):
  ├─ lib/encryption/api-key-vault.ts (Phase 0.2)
  ├─ lib/llm/client.ts (Phase 0.3)
  ├─ lib/supabase/server.ts (既存)
  └─ @supabase/supabase-js

Related Files:
  ├─ Spec: ./apiKey.spec.md (このファイル)
  ├─ Tests: ./__tests__/apiKey.test.ts
  ├─ Database: database/schema.sql (user_api_keys table)
  └─ Plan: docs/03_plans/mastra-infrastructure/20251102_02_next-phases-plan.md
```

---

## Requirements（要件）

### FR-001: APIキー保存機能

**目的:** ユーザーのLLM APIキーを暗号化してデータベースに保存

**入力:**
- `provider`: LLMプロバイダー ('google' | 'openai' | 'anthropic')
- `apiKey`: 平文のAPIキー (string)

**処理:**
1. ユーザー認証を確認
2. APIキーを暗号化 (`encryptAPIKey`)
3. データベースに保存（既存の場合は更新）
4. RLSポリシーにより自動的にユーザーIDでフィルタリング

**出力:**
- 成功: `{ success: true, message: 'APIキーを保存しました' }`
- 失敗: `{ success: false, error: 'エラーメッセージ' }`

**エラーケース:**
- 未認証ユーザー
- 無効なプロバイダー
- 空のAPIキー
- 暗号化失敗
- データベースエラー

---

### FR-002: APIキー状態取得機能

**目的:** 各プロバイダーのAPIキー設定状態を取得

**入力:**
- `provider`: LLMプロバイダー (optional)

**処理:**
1. ユーザー認証を確認
2. データベースから該当レコードを取得
3. 存在有無と最終更新日時を返す（APIキー本体は返さない）

**出力:**
```typescript
{
  success: true,
  data: {
    google: { configured: true, updatedAt: '2025-11-02T10:00:00Z' },
    openai: { configured: false, updatedAt: null },
    anthropic: { configured: true, updatedAt: '2025-11-01T15:30:00Z' }
  }
}
```

**エラーケース:**
- 未認証ユーザー
- データベースエラー

---

### FR-003: APIキー削除機能

**目的:** 保存されたAPIキーを削除

**入力:**
- `provider`: LLMプロバイダー

**処理:**
1. ユーザー認証を確認
2. データベースから該当レコードを削除
3. RLSポリシーにより自ユーザーのレコードのみ削除可能

**出力:**
- 成功: `{ success: true, message: 'APIキーを削除しました' }`
- 失敗: `{ success: false, error: 'エラーメッセージ' }`

**エラーケース:**
- 未認証ユーザー
- 無効なプロバイダー
- レコードが存在しない
- データベースエラー

---

### FR-004: APIキー検証機能

**目的:** APIキーが有効かどうかをテスト

**入力:**
- `provider`: LLMプロバイダー
- `apiKey`: 検証するAPIキー (string)

**処理:**
1. ユーザー認証を確認
2. LLMクライアントを作成
3. シンプルなプロンプトでテスト実行
4. 成功/失敗を返す

**出力:**
- 成功: `{ success: true, message: 'APIキーは有効です' }`
- 失敗: `{ success: false, error: '詳細なエラーメッセージ' }`

**テストプロンプト:**
- "こんにちは"（短く、確実にレスポンスが返る）

**エラーケース:**
- 未認証ユーザー
- 無効なAPIキー
- プロバイダーAPI側のエラー
- ネットワークエラー

---

## Technical Specifications（技術仕様）

### データベーススキーマ

```sql
-- Phase 0.1で作成済み
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'openai', 'anthropic')),
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- RLS policies
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own API keys"
  ON user_api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own API keys"
  ON user_api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
  ON user_api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
  ON user_api_keys FOR DELETE
  USING (auth.uid() = user_id);
```

### 型定義

```typescript
import type { LLMProvider } from '@/lib/llm/client';

export type SaveAPIKeyResult = 
  | { success: true; message: string }
  | { success: false; error: string };

export type DeleteAPIKeyResult = 
  | { success: true; message: string }
  | { success: false; error: string };

export type TestAPIKeyResult = 
  | { success: true; message: string }
  | { success: false; error: string };

export interface APIKeyStatus {
  configured: boolean;
  updatedAt: string | null;
}

export type GetAPIKeyStatusResult = 
  | { success: true; data: Record<LLMProvider, APIKeyStatus> }
  | { success: false; error: string };
```

### Server Actions署名

```typescript
'use server';

/**
 * Save encrypted API key to database
 */
export async function saveAPIKey(
  provider: LLMProvider,
  apiKey: string
): Promise<SaveAPIKeyResult>;

/**
 * Get API key configuration status for all providers
 */
export async function getAPIKeyStatus(
  provider?: LLMProvider
): Promise<GetAPIKeyStatusResult>;

/**
 * Delete API key from database
 */
export async function deleteAPIKey(
  provider: LLMProvider
): Promise<DeleteAPIKeyResult>;

/**
 * Test if API key is valid by making a test request
 */
export async function testAPIKey(
  provider: LLMProvider,
  apiKey: string
): Promise<TestAPIKeyResult>;
```

---

## Test Cases（テストケース）

### TC-001: saveAPIKey - 新規保存成功

**前提条件:**
- ユーザーがログイン済み
- 該当プロバイダーのAPIキーが未設定

**入力:**
```typescript
await saveAPIKey('google', 'test-google-api-key-12345');
```

**期待結果:**
```typescript
{
  success: true,
  message: 'APIキーを保存しました'
}
```

**検証項目:**
- データベースに暗号化されたキーが保存される
- `user_id`が正しく設定される
- `provider`が正しく設定される
- `created_at`, `updated_at`が設定される

---

### TC-002: saveAPIKey - 既存キー更新成功

**前提条件:**
- ユーザーがログイン済み
- 該当プロバイダーのAPIキーが既に設定済み

**入力:**
```typescript
await saveAPIKey('google', 'new-google-api-key-67890');
```

**期待結果:**
```typescript
{
  success: true,
  message: 'APIキーを保存しました'
}
```

**検証項目:**
- 既存レコードが更新される（新規作成されない）
- `updated_at`が更新される
- 古いAPIキーは上書きされる

---

### TC-003: saveAPIKey - 未認証エラー

**前提条件:**
- ユーザーが未ログイン

**入力:**
```typescript
await saveAPIKey('google', 'test-api-key');
```

**期待結果:**
```typescript
{
  success: false,
  error: 'ログインが必要です'
}
```

---

### TC-004: saveAPIKey - 空のAPIキーエラー

**前提条件:**
- ユーザーがログイン済み

**入力:**
```typescript
await saveAPIKey('google', '');
```

**期待結果:**
```typescript
{
  success: false,
  error: 'APIキーを入力してください'
}
```

---

### TC-005: saveAPIKey - 無効なプロバイダーエラー

**前提条件:**
- ユーザーがログイン済み

**入力:**
```typescript
await saveAPIKey('invalid-provider' as any, 'test-key');
```

**期待結果:**
```typescript
{
  success: false,
  error: '無効なプロバイダーです'
}
```

---

### TC-006: getAPIKeyStatus - 全プロバイダー取得成功

**前提条件:**
- ユーザーがログイン済み
- Googleのみ設定済み

**入力:**
```typescript
await getAPIKeyStatus();
```

**期待結果:**
```typescript
{
  success: true,
  data: {
    google: { configured: true, updatedAt: '2025-11-02T10:00:00Z' },
    openai: { configured: false, updatedAt: null },
    anthropic: { configured: false, updatedAt: null }
  }
}
```

---

### TC-007: getAPIKeyStatus - 特定プロバイダー取得成功

**前提条件:**
- ユーザーがログイン済み
- Googleのみ設定済み

**入力:**
```typescript
await getAPIKeyStatus('google');
```

**期待結果:**
```typescript
{
  success: true,
  data: {
    google: { configured: true, updatedAt: '2025-11-02T10:00:00Z' },
    openai: { configured: false, updatedAt: null },
    anthropic: { configured: false, updatedAt: null }
  }
}
```

**備考:** 単一プロバイダー指定でも全プロバイダーの状態を返す

---

### TC-008: deleteAPIKey - 削除成功

**前提条件:**
- ユーザーがログイン済み
- Googleのキーが設定済み

**入力:**
```typescript
await deleteAPIKey('google');
```

**期待結果:**
```typescript
{
  success: true,
  message: 'APIキーを削除しました'
}
```

**検証項目:**
- データベースからレコードが削除される
- 他のプロバイダーのキーは削除されない

---

### TC-009: deleteAPIKey - 存在しないキーの削除

**前提条件:**
- ユーザーがログイン済み
- Googleのキーが未設定

**入力:**
```typescript
await deleteAPIKey('google');
```

**期待結果:**
```typescript
{
  success: true,
  message: 'APIキーを削除しました'
}
```

**備考:** 存在しない場合もエラーにしない（冪等性）

---

### TC-010: testAPIKey - 有効なキー検証成功

**前提条件:**
- ユーザーがログイン済み
- 有効なGoogleのAPIキー

**入力:**
```typescript
await testAPIKey('google', 'valid-google-api-key');
```

**期待結果:**
```typescript
{
  success: true,
  message: 'APIキーは有効です'
}
```

**検証項目:**
- LLMクライアントが正常に作成される
- テストプロンプトが正常に実行される

---

### TC-011: testAPIKey - 無効なキー検証失敗

**前提条件:**
- ユーザーがログイン済み
- 無効なAPIキー

**入力:**
```typescript
await testAPIKey('google', 'invalid-api-key');
```

**期待結果:**
```typescript
{
  success: false,
  error: 'APIキーが無効です。エラー: API_KEY_INVALID'
}
```

---

### TC-012: testAPIKey - ネットワークエラー

**前提条件:**
- ユーザーがログイン済み
- ネットワークが利用できない

**入力:**
```typescript
await testAPIKey('google', 'valid-api-key');
```

**期待結果:**
```typescript
{
  success: false,
  error: 'ネットワークエラーが発生しました'
}
```

---

## Implementation Notes（実装メモ）

### セキュリティ考慮事項

1. **APIキーの暗号化**
   - Phase 0.2の`encryptAPIKey`/`decryptAPIKey`を使用
   - データベースには暗号化された値のみ保存
   - メモリ上でも可能な限り保持時間を短縮

2. **RLSポリシー**
   - 各ユーザーは自分のAPIキーのみアクセス可能
   - Supabase RLSにより強制

3. **エラーメッセージ**
   - APIキー本体を含めない
   - 詳細なエラー情報はログのみ

4. **認証チェック**
   - すべてのServer Actionで最初に実行
   - 未認証の場合は即座にエラー返却

### パフォーマンス考慮事項

1. **データベースクエリ最適化**
   - インデックス活用（`user_id`, `provider`の複合ユニーク制約）
   - 必要なカラムのみ取得

2. **キャッシング**
   - APIキー状態は頻繁に変更されないためキャッシュ可能
   - ただし、Phase 0.4ではキャッシュなしで実装

3. **並列処理**
   - `testAPIKey`は時間がかかるため、UI側でローディング表示

### エラーハンドリング

```typescript
// 標準的なエラーハンドリングパターン
try {
  // メイン処理
} catch (error) {
  console.error('Error in saveAPIKey:', error);
  
  // ユーザーフレンドリーなメッセージ
  if (error instanceof PostgrestError) {
    return { success: false, error: 'データベースエラーが発生しました' };
  }
  
  return { 
    success: false, 
    error: error instanceof Error ? error.message : '不明なエラーが発生しました' 
  };
}
```

### テスト用のモック

```typescript
// Supabaseクライアントのモック
const mockSupabase = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  }),
  auth: {
    getUser: jest.fn(),
  },
};
```

---

## Related Documentation（関連ドキュメント）

- **Issue:** [#74 Mastra基盤構築とAPIキー管理システムの実装](https://github.com/otomatty/for-all-learners/issues/74)
- **実装計画:** `docs/03_plans/mastra-infrastructure/20251102_02_next-phases-plan.md`
- **Phase 0.1:** `docs/05_logs/2025_11/20251102/01_database-migration.md`
- **Phase 0.2:** `docs/05_logs/2025_11/20251102/02_api-key-encryption.md`
- **Phase 0.3:** `docs/05_logs/2025_11/20251102/04_llm-client-implementation.md`
- **暗号化:** `lib/encryption/api-key-vault.spec.md`
- **LLMクライアント:** `lib/llm/client.spec.md`
- **データベーススキーマ:** `database/schema.sql`

---

**最終更新:** 2025-11-02
**ステータス:** 仕様確定
**次のステップ:** 実装 → テストコード作成
