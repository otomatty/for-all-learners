# LLM Client Factory 仕様書

**対象:** ユーザーAPIキー統合LLMクライアントファクトリー  
**最終更新:** 2025-11-03  
**関連Issue:** ユーザー設定APIキーと複数プロバイダー対応  
**関連計画:** [docs/03_plans/ai-integration/20251103_04_dynamic-llm-client-implementation-plan.md](../../../docs/03_plans/ai-integration/20251103_04_dynamic-llm-client-implementation-plan.md)

---

## Overview

`createClientWithUserKey` は、ユーザー設定のAPIキーを自動的に取得してLLMクライアントを生成するファクトリー関数です。

`getUserAPIKey()` との統合により、ユーザー設定キー → 環境変数キー の順でフォールバックし、既存の `createLLMClient()` をラップして統一インターフェースを提供します。

## Related Files

- **実装**: `lib/llm/factory.ts`
- **テスト**: `lib/llm/__tests__/factory.test.ts`
- **仕様書**: `lib/llm/factory.spec.md` (このファイル)
- **依存先**:
  - `lib/llm/client.ts` (createLLMClient)
  - `app/_actions/ai/getUserAPIKey.ts`
  - `lib/logger.ts`
- **使用先**:
  - `app/_actions/generatePageInfo.ts`
  - `app/_actions/generateCards.ts`
  - `app/_actions/generateCardsFromPage.ts`
  - `lib/gemini.ts` (generateQuestions)

---

## Requirements

### R-001: 自動APIキー解決

**Description:** 提供されたAPIキーまたはユーザー設定のAPIキーを自動的に取得して使用する

**Behavior:**
1. `apiKey` が提供された場合、それを使用
2. `apiKey` が未提供の場合、`getUserAPIKey(provider)` を呼び出し
3. `getUserAPIKey` はユーザー設定キー → 環境変数キー の順でフォールバック
4. 取得したAPIキーで `createLLMClient()` を呼び出し

**Success Criteria:**
- 提供されたAPIキーが優先される
- 未提供時は自動的にユーザー設定キーを取得
- 環境変数へのフォールバックが正常に動作
- APIキー未設定時に適切なエラーをスロー

---

### R-002: プロバイダー対応

**Description:** 複数のLLMプロバイダー（Google, OpenAI, Anthropic）に対応

**Supported Providers:**
- `google` - Google Gemini
- `openai` - OpenAI GPT
- `anthropic` - Anthropic Claude

**Success Criteria:**
- すべてのプロバイダーでクライアント生成可能
- 不正なプロバイダー名でエラーをスロー

---

### R-003: モデル指定

**Description:** プロバイダーごとのデフォルトモデルまたはカスタムモデルを指定可能

**Behavior:**
1. `model` が指定された場合、そのモデルを使用
2. `model` が未指定の場合、プロバイダーのデフォルトモデルを使用

**Success Criteria:**
- カスタムモデル指定が正常に動作
- デフォルトモデルが正しく設定される

---

### R-004: エラーハンドリング

**Description:** APIキー取得失敗やクライアント生成失敗を適切に処理

**Error Cases:**
1. **APIキー未設定** → `getUserAPIKey` からエラーが伝播
2. **不正なプロバイダー** → `createLLMClient` からエラーが伝播
3. **クライアント生成失敗** → エラーをログに記録してthrow

**Success Criteria:**
- すべてのエラーケースで適切なエラーメッセージ
- エラーがログに記録される
- エラーが呼び出し元に伝播される

---

### R-005: ロギング

**Description:** デバッグ・監視のための適切なログ出力

**Log Points:**
1. クライアント生成開始時: provider, model, hasProvidedApiKey
2. APIキー解決後: provider, model, hasApiKey
3. クライアント生成成功時: provider, model
4. エラー発生時: provider, model, error message

**Success Criteria:**
- すべてのログがstructured logging形式
- センシティブ情報（APIキー）が含まれない
- ログレベルが適切（info/error）

---

## Test Cases

### TC-001: Google Gemini クライアント生成

**Input:**
```typescript
provider = "google"
```

**Expected:**
- `getUserAPIKey("google")` が呼び出される
- `createLLMClient({ provider: "google", apiKey: userApiKey })` が呼び出される
- LLMClient インスタンスが返される

**Acceptance:**
```typescript
✅ getUserAPIKey が1回呼び出された
✅ createLLMClient が正しいパラメータで呼び出された
✅ LLMClient インスタンスが返される
```

---

### TC-002: OpenAI クライアント生成

**Input:**
```typescript
provider = "openai"
```

**Expected:**
- `getUserAPIKey("openai")` が呼び出される
- `createLLMClient({ provider: "openai", apiKey: userApiKey })` が呼び出される
- LLMClient インスタンスが返される

**Acceptance:**
```typescript
✅ getUserAPIKey("openai") が呼び出された
✅ createLLMClient が正しいパラメータで呼び出された
✅ LLMClient インスタンスが返される
```

---

### TC-003: Anthropic クライアント生成

**Input:**
```typescript
provider = "anthropic"
```

**Expected:**
- `getUserAPIKey("anthropic")` が呼び出される
- `createLLMClient({ provider: "anthropic", apiKey: userApiKey })` が呼び出される
- LLMClient インスタンスが返される

**Acceptance:**
```typescript
✅ getUserAPIKey("anthropic") が呼び出された
✅ createLLMClient が正しいパラメータで呼び出された
✅ LLMClient インスタンスが返される
```

---

### TC-004: 無効なプロバイダーでエラー

**Input:**
```typescript
provider = "invalid-provider"  // 不正なプロバイダー
```

**Expected:**
- `createLLMClient` からエラーがスローされる
- エラーが呼び出し元に伝播される

**Acceptance:**
```typescript
✅ Error がスローされる
✅ エラーメッセージが適切
```

---

### TC-005: APIキー未設定時のフォールバック

**Input:**
```typescript
provider = "google"
// getUserAPIKey が null を返す（ユーザー設定キーなし）
// 環境変数 GEMINI_API_KEY は設定されている
```

**Expected:**
- `getUserAPIKey` が環境変数キーを返す
- 環境変数キーでクライアントが生成される

**Acceptance:**
```typescript
✅ getUserAPIKey が呼び出された
✅ 環境変数キーが使用された
✅ クライアントが正常に生成された
```

---

### TC-006: 提供されたAPIキーの優先使用

**Input:**
```typescript
provider = "google"
apiKey = "provided-api-key-123"
// ユーザー設定キーも存在する
```

**Expected:**
- 提供されたAPIキーが使用される
- `getUserAPIKey` は呼び出されない

**Acceptance:**
```typescript
✅ getUserAPIKey が呼び出されない
✅ 提供されたAPIキーが使用される
✅ createLLMClient が正しいパラメータで呼び出された
```

---

### TC-007: モデル指定の動作確認

**Input:**
```typescript
provider = "google"
model = "gemini-1.5-pro"
```

**Expected:**
- 指定されたモデルが使用される
- `createLLMClient` に model パラメータが渡される

**Acceptance:**
```typescript
✅ createLLMClient が { provider, model, apiKey } で呼び出された
✅ model パラメータが正しく設定されている
```

---

### TC-008: モデル未指定時のデフォルト使用

**Input:**
```typescript
provider = "google"
// model 未指定
```

**Expected:**
- デフォルトモデルが使用される
- `createLLMClient` に model: undefined が渡される

**Acceptance:**
```typescript
✅ createLLMClient が { provider, model: undefined, apiKey } で呼び出された
✅ createLLMClient 内でデフォルトモデルが設定される
```

---

### TC-009: APIキー未設定エラー

**Input:**
```typescript
provider = "openai"
// getUserAPIKey がエラーをスロー
```

**Expected:**
- `getUserAPIKey` のエラーが伝播される
- クライアントは生成されない

**Acceptance:**
```typescript
✅ Error がスローされる
✅ createLLMClient が呼び出されない
✅ エラーメッセージが適切
```

---

### TC-010: クライアント生成失敗時のエラーハンドリング

**Input:**
```typescript
provider = "google"
// createLLMClient がエラーをスロー
```

**Expected:**
- エラーがログに記録される
- エラーが呼び出し元に伝播される

**Acceptance:**
```typescript
✅ logger.error が呼び出された
✅ Error がスローされる
✅ エラーログに provider, model, error message が含まれる
```

---

## Implementation Notes

### API設計

```typescript
export interface CreateClientWithUserKeyOptions {
  provider: LLMProvider;
  model?: string;
  apiKey?: string; // Optional: if not provided, will fetch from getUserAPIKey
}

export async function createClientWithUserKey(
  options: CreateClientWithUserKeyOptions
): Promise<LLMClient>
```

### 使用例

```typescript
// 自動APIキー取得（ユーザー設定 → 環境変数）
const client = await createClientWithUserKey({ provider: "google" });
const response = await client.generate("Hello");

// カスタムモデル指定
const client = await createClientWithUserKey({
  provider: "openai",
  model: "gpt-4o"
});

// 明示的なAPIキー指定（ユーザー設定をバイパス）
const client = await createClientWithUserKey({
  provider: "anthropic",
  apiKey: "sk-ant-..."
});
```

### 内部実装フロー

1. **APIキー解決**
   ```
   providedApiKey ?? await getUserAPIKey(provider)
   ```

2. **クライアント生成**
   ```typescript
   createLLMClient({ provider, model, apiKey })
   ```

3. **エラーハンドリング**
   ```typescript
   try {
     const client = await createLLMClient(...);
     logger.info(...);
     return client;
   } catch (error) {
     logger.error(...);
     throw error;
   }
   ```

### ロギング詳細

**開始ログ:**
```typescript
logger.info(
  { provider, model, hasProvidedApiKey: !!providedApiKey },
  "createClientWithUserKey: Starting client creation"
);
```

**APIキー解決ログ:**
```typescript
logger.info(
  { provider, model, hasApiKey: !!apiKey },
  "createClientWithUserKey: API key resolved"
);
```

**成功ログ:**
```typescript
logger.info(
  { provider, model },
  "createClientWithUserKey: Client created successfully"
);
```

**エラーログ:**
```typescript
logger.error(
  { provider, model, error: error.message },
  "createClientWithUserKey: Failed to create client"
);
```

### セキュリティ考慮事項

1. **APIキーの管理**
   - APIキーはメモリ内のみ
   - ログに出力しない（`hasApiKey: !!apiKey` のように存在確認のみ）
   - エラーメッセージにAPIキーを含めない

2. **エラーハンドリング**
   - スタックトレース情報をログに含めない
   - ユーザーフレンドリーなエラーメッセージ

### パフォーマンス考慮事項

1. **APIキー取得**
   - `getUserAPIKey` は1回のDB読み取り（キャッシュ済み）
   - オーバーヘッドは軽微

2. **クライアント生成**
   - LLMクライアントの生成は軽量（接続プール不要）
   - 実際のLLM API呼び出しが支配的（数秒〜数十秒）

---

## Related Documentation

- [実装計画書](../../../docs/03_plans/ai-integration/20251103_04_dynamic-llm-client-implementation-plan.md)
- [実装ログ](../../../docs/05_logs/2025_11/20251103/06_dynamic-llm-client-implementation.md)
- [LLM Client仕様書](./client.spec.md)
- [getUserAPIKey仕様書](../../../app/_actions/ai/getUserAPIKey.spec.md)

---

**最終更新:** 2025-11-03  
**作成者:** AI Assistant  
**ステータス:** ✅ 実装完了、テスト完了

