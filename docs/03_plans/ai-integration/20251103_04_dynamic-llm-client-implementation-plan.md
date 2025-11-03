# 動的LLMクライアント実装計画

**Issue**: ユーザー設定APIキーと複数プロバイダー対応の完全実装  
**日付**: 2025-11-03  
**ステータス**: 🚧 実装中  

---

## 📋 背景と問題点

### 現状の問題

現在、LLM設定UI（`LLMSettingsIntegrated`）と API Key管理機能は実装されているが、**実際のAI生成処理では使われていない**。

#### 具体的な問題点

1. **シングルトンクライアントの固定化**
   ```typescript
   // lib/gemini/client.ts
   export const geminiClient = new GoogleGenAI({
     apiKey: process.env.GEMINI_API_KEY, // 環境変数固定
   });
   ```
   - 環境変数がないとアプリ起動時にエラー
   - ユーザー設定のAPIキーが使えない

2. **API Key取得が無駄に**
   ```typescript
   // app/_actions/generatePageInfo.ts
   const apiKey = await getUserAPIKey(provider); // 取得するが...
   const response = await geminiClient.models.generateContent({ // 使わない！
     model: options?.model || "gemini-2.5-flash",
     contents,
   });
   ```

3. **プロバイダー選択が機能しない**
   - UIでは3プロバイダー（Google, OpenAI, Anthropic）選択可能
   - 実装はGemini固定

### 要件

1. ✅ **ユーザー設定APIキーの優先使用**
   - ユーザーが設定したAPIキーを使用
   - 未設定時のみ環境変数にフォールバック

2. ✅ **複数プロバイダー対応**
   - Google Gemini
   - OpenAI GPT
   - Anthropic Claude

3. ✅ **既存機能の後方互換性維持**
   - 環境変数のみの運用も継続可能
   - 既存のAI生成機能が引き続き動作

---

## 🎯 実装計画

### Phase 1: 動的LLMクライアント生成ヘルパーの実装

**重要**: `lib/llm/client.ts` に既に `createLLMClient()` が実装済み！

ただし、`getUserAPIKey()` との統合が必要。ヘルパー関数を追加する。

**ファイル**: `lib/llm/factory.ts` (新規作成)

```typescript
/**
 * Dynamic LLM Client Factory - Wrapper for createLLMClient with getUserAPIKey
 * 
 * DEPENDENCY MAP:
 * 
 * Parents (使用先):
 *   ├─ app/_actions/generatePageInfo.ts
 *   ├─ app/_actions/ai/generateCards.ts
 *   ├─ app/_actions/ai/generateCardsFromPage.ts
 *   └─ lib/gemini.ts (generateQuestions)
 * 
 * Dependencies (依存先):
 *   ├─ lib/llm/client.ts (createLLMClient)
 *   └─ app/_actions/ai/getUserAPIKey.ts
 * 
 * Related Files:
 *   ├─ Spec: ./factory.spec.md
 *   └─ Tests: ./__tests__/factory.test.ts
 */

import { createLLMClient, type LLMProvider, type LLMClient } from './client';
import { getUserAPIKey } from '@/app/_actions/ai/getUserAPIKey';
import logger from '@/lib/logger';

export interface CreateClientWithUserKeyOptions {
  provider: LLMProvider;
  model?: string;
  apiKey?: string; // Optional: if not provided, will fetch from getUserAPIKey
}

/**
 * Create LLM client with automatic API key resolution
 * Uses user-configured key or falls back to environment variable
 * 
 * @param options - Client creation options
 * @returns LLM client instance
 * @throws Error if API key is not available
 */
export async function createClientWithUserKey(
  options: CreateClientWithUserKeyOptions
): Promise<LLMClient> {
  const { provider, model, apiKey: providedApiKey } = options;
  
  // Get API key (use provided or fetch from user settings/env)
  const apiKey = providedApiKey ?? await getUserAPIKey(provider);
  
  logger.info(
    { provider, model, hasApiKey: !!apiKey },
    'Creating LLM client with user key'
  );
  
  // Use existing createLLMClient
  return createLLMClient({ provider, model, apiKey });
}
```

**タスク**:
- [ ] `lib/llm/factory.ts` 作成
- [ ] 既存の `createLLMClient()` との統合確認
- [ ] エラーハンドリング追加
- [ ] ロギング追加

---

### Phase 2: AI生成関数のプロンプト構造統一

**重要**: 既存の `GoogleGeminiClient` は既に実装済み（`lib/llm/google-client.ts`）

ただし、インターフェースが異なる：
- 統一クライアント: `generate(prompt: string)` 
- 既存AI関数: Gemini固有の構造化された `contents`

**解決策**: AI生成関数をシンプルなprompt文字列形式に変更する

#### 2.1 プロンプト変換ヘルパーの作成

**ファイル**: `lib/llm/prompt-builder.ts` (新規作成)

```typescript
/**
 * Prompt Builder - Convert structured contents to simple prompt string
 * 
 * DEPENDENCY MAP:
 * 
 * Parents (使用先):
 *   ├─ app/_actions/generatePageInfo.ts
 *   ├─ app/_actions/ai/generateCards.ts
 *   └─ app/_actions/ai/generateCardsFromPage.ts
 * 
 * Dependencies (依存先):
 *   └─ なし
 */

/**
 * Build prompt string from parts array
 * Converts Gemini's contents structure to simple string
 * 
 * @param parts - Array of content parts (strings or objects with text property)
 * @returns Combined prompt string
 */
export function buildPrompt(parts: (string | { text: string })[]): string {
  return parts
    .map(part => typeof part === 'string' ? part : part.text)
    .join('\n\n');
}
```

**タスク**:
- [ ] `lib/llm/prompt-builder.ts` 作成
- [ ] 既存のプロンプト構造を分析
- [ ] 変換ロジックのテスト

#### 2.2 既存シングルトンの非推奨化

**ファイル**: `lib/gemini/client.ts`

```typescript
/**
 * @deprecated Use createClientWithUserKey() from lib/llm/factory.ts instead
 * 
 * Legacy singleton Gemini client
 * This will be removed in a future version
 * 
 * Migration guide:
 * Before: import { geminiClient } from '@/lib/gemini/client';
 * After:  import { createClientWithUserKey } from '@/lib/llm/factory';
 *         const client = await createClientWithUserKey({ provider: 'google' });
 */

import { GoogleGenAI } from "@google/genai";

// Check if environment variable exists (for backward compatibility)
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    "⚠️ [DEPRECATED] GEMINI_API_KEY not found. " +
    "Please configure API keys in Settings → LLM Settings, " +
    "or use createClientWithUserKey() from lib/llm/factory.ts"
  );
}

// Export singleton (null if no environment key)
// @deprecated
export const geminiClient = apiKey 
  ? new GoogleGenAI({ apiKey })
  : null;
```

**タスク**:
- [ ] `lib/gemini/client.ts` に非推奨警告を追加
- [ ] `null` チェックを追加
- [ ] マイグレーションガイドをコメントに記載
- [ ] 使用箇所で `null` チェック追加

---

### Phase 3: AI生成関数の修正

#### 3.1 generatePageInfo()

**ファイル**: `app/_actions/generatePageInfo.ts`

**変更箇所**:

```typescript
// Before:
const apiKey = await getUserAPIKey(provider); // 取得するが使わない
const contents = createUserContent([promptTemplate, title]);
const response = await geminiClient.models.generateContent({
  model: options?.model || "gemini-2.5-flash",
  contents,
});

// After:
import { createClientWithUserKey } from '@/lib/llm/factory';
import { buildPrompt } from '@/lib/llm/prompt-builder';

const prompt = buildPrompt([promptTemplate, title]);
const client = await createClientWithUserKey({ provider, model: options?.model });
const response = await client.generate(prompt);
```

**重要な変更**:
1. 構造化された `contents` → シンプルな `prompt` 文字列に変換
2. `geminiClient` → 動的な `client` に変更
3. `getUserAPIKey()` は `createClientWithUserKey()` 内部で呼ばれる

**タスク**:
- [ ] `createClientWithUserKey()` のインポート追加
- [ ] `buildPrompt()` ヘルパーの使用
- [ ] `createUserContent()` の削除または置き換え
- [ ] クライアント生成コードに変更
- [ ] エラーハンドリング確認
- [ ] ログ出力の調整

#### 3.2 generateCardsFromTranscript()

**ファイル**: `app/_actions/ai/generateCards.ts`

**変更内容**: `generatePageInfo()` と同様の変更を適用

```typescript
// Before:
const apiKey = await getUserAPIKey(provider);
const contents = createUserContent([systemPrompt, transcript]);
const response = await geminiClient.models.generateContent({ ... });

// After:
const prompt = buildPrompt([systemPrompt, transcript]);
const client = await createClientWithUserKey({ provider, model: options?.model });
const response = await client.generate(prompt);
```

**タスク**:
- [ ] 動的クライアント使用に変更
- [ ] プロンプト構造の統一
- [ ] JSON パース処理の確認

#### 3.3 generateRawCardsFromPageContent()

**ファイル**: `app/_actions/ai/generateCardsFromPage.ts`

**変更内容**: `generatePageInfo()` と同様の変更を適用

```typescript
// Before:
const apiKey = await getUserAPIKey(provider);
const contents = createUserContent([systemPrompt, pageText]);
// Gemini固有のAPI呼び出し

// After:
const prompt = buildPrompt([systemPrompt, pageText]);
const client = await createClientWithUserKey({ provider, model: options?.model });
const response = await client.generate(prompt);
```

**タスク**:
- [ ] 動的クライアント使用に変更
- [ ] プロンプト構造の統一
- [ ] JSON パース処理の確認

#### 3.4 generateQuestions()

**ファイル**: `lib/gemini.ts`

**特記事項**: 
- ファイル名が `gemini.ts` だが、プロバイダー非依存にする
- 将来的に `lib/llm/question-generator.ts` にリネーム検討（別Issue化）

**変更内容**:

```typescript
// Before:
const apiKey = await getUserAPIKey(provider);
// Gemini固有のAPIを直接呼び出し
const result = await geminiClient.models.generateContent({ ... });

// After:
import { createClientWithUserKey } from '@/lib/llm/factory';

const client = await createClientWithUserKey({ provider, model: options?.model });
const result = await client.generate(systemPrompt);
```

**タスク**:
- [ ] 動的クライアント使用に変更
- [ ] プロンプト構造の統一
- [ ] JSON パース処理の確認
- [ ] プロバイダーパラメータの伝播確認
- [ ] ファイル名変更を Issue 化（低優先度、別タスク）

---

### Phase 4: テストの追加・修正

#### 4.1 ファクトリーのテスト

**ファイル**: `lib/llm/__tests__/factory.test.ts`

**テストケース**:
- TC-001: Google Gemini クライアント生成
- TC-002: OpenAI クライアント生成
- TC-003: Anthropic クライアント生成
- TC-004: 無効なプロバイダーでエラー
- TC-005: APIキー未設定時のフォールバック（getUserAPIKey経由）
- TC-006: 提供されたAPIキーの優先使用
- TC-007: モデル指定の動作確認

**タスク**:
- [ ] テストファイル作成
- [ ] モック設定（getUserAPIKey, createLLMClient）
- [ ] 全テストケース実装
- [ ] エラーケースのテスト追加

#### 4.2 プロンプトビルダーのテスト

**ファイル**: `lib/llm/__tests__/prompt-builder.test.ts`

**テストケース**:
- TC-001: 文字列配列からプロンプト生成
- TC-002: オブジェクト配列からプロンプト生成
- TC-003: 混在配列からプロンプト生成
- TC-004: 空配列の処理

**タスク**:
- [ ] テストファイル作成
- [ ] 全テストケース実装

#### 4.3 既存AI生成関数のテスト修正

**対象ファイル**:
- `app/_actions/__tests__/generatePageInfo.test.ts`
- `app/_actions/ai/__tests__/generateCards.test.ts`
- `lib/__tests__/generateQuestions.test.ts`
- その他AI生成関数のテスト

**変更内容**:
- `createClientWithUserKey()` のモック追加
- `buildPrompt()` のモック追加（必要に応じて）
- プロバイダー切り替えのテスト追加
- モデル指定のテスト追加

**タスク**:
- [ ] 各テストファイルのモック更新
- [ ] プロバイダー別テスト追加
- [ ] エラーハンドリングのテスト確認

---

### Phase 5: ドキュメント更新

#### 5.1 仕様書の更新

**対象ファイル**:
- `lib/llm/factory.spec.md` (新規作成)
- `lib/llm/prompt-builder.spec.md` (新規作成)
- `app/_actions/generatePageInfo.spec.md` (更新)
- `app/_actions/ai/generateCards.spec.md` (更新)
- `lib/gemini.spec.md` (更新)

**タスク**:
- [ ] factory.spec.md 作成
- [ ] prompt-builder.spec.md 作成
- [ ] 既存仕様書に動的クライアント使用を明記
- [ ] DEPENDENCY MAP を全て更新

#### 5.2 実装ログの作成

**ファイル**: `docs/05_logs/2025_11/20251103/06_dynamic-llm-client-implementation.md`

**内容**:
- 実装の背景と目的
- 既存実装の調査結果
- 変更内容の詳細
  - ファクトリー追加
  - プロンプトビルダー追加
  - AI生成関数の修正
- テスト結果
- 動作確認結果
- 今後の課題・改善点

**タスク**:
- [ ] 実装完了後にログ作成
- [ ] スクリーンショット追加（設定画面）
- [ ] パフォーマンス測定結果記載

#### 5.3 マイグレーションガイド

**ファイル**: `docs/guides/llm-migration-guide.md` (新規作成)

**内容**:
- 旧 `geminiClient` から新 `createClientWithUserKey()` への移行方法
- 環境変数のみの運用からユーザー設定APIキーへの移行手順
- コード例（Before/After）
- トラブルシューティング
  - APIキーが見つからない
  - プロバイダーが無効
  - モデルが見つからない

**タスク**:
- [ ] マイグレーションガイド作成
- [ ] コード例の追加
- [ ] トラブルシューティングセクション追加

---

## 🔍 影響範囲分析

### 変更が必要なファイル

#### 新規作成
- `lib/llm/factory.ts` (ヘルパー関数)
- `lib/llm/prompt-builder.ts` (プロンプト変換)
- `lib/llm/factory.spec.md`
- `lib/llm/prompt-builder.spec.md`
- `lib/llm/__tests__/factory.test.ts`
- `lib/llm/__tests__/prompt-builder.test.ts`
- `docs/guides/llm-migration-guide.md`

#### 修正（コード）
- `lib/gemini/client.ts` (非推奨化)
- `app/_actions/generatePageInfo.ts` (動的クライアント化)
- `app/_actions/ai/generateCards.ts` (動的クライアント化)
- `app/_actions/ai/generateCardsFromPage.ts` (動的クライアント化)
- `lib/gemini.ts` (動的クライアント化)

#### 修正（テスト）
- `app/_actions/__tests__/generatePageInfo.test.ts`
- `app/_actions/ai/__tests__/generateCards.test.ts`
- `lib/__tests__/generateQuestions.test.ts`
- 上記に対応するテストの追加・修正

#### 更新（ドキュメント・仕様書）
- `app/_actions/generatePageInfo.spec.md`
- `app/_actions/ai/generateCards.spec.md`
- `app/_actions/ai/generateCardsFromPage.spec.md`
- `lib/gemini.spec.md`
- DEPENDENCY MAP（全修正ファイル）
- 実装ログ作成（`docs/05_logs/2025_11/20251103/06_dynamic-llm-client-implementation.md`)

### 影響を受けるコンポーネント

- AI生成機能全般
  - ページ情報生成
  - カード生成（音声・ページ）
  - 問題生成
- LLM設定UI（影響なし、既に実装済み）

---

## ⚠️ リスクと対策

### リスク1: 既存環境変数運用の破壊

**対策**:
- 環境変数がない場合の警告表示のみ（エラーにしない）
- `getUserAPIKey()` が環境変数にフォールバック
- 後方互換性を維持

### リスク2: APIキー未設定時のエラー

**対策**:
- 明確なエラーメッセージ
- 設定ページへの誘導UI
- フォールバック機能の確実な動作

### リスク3: パフォーマンス低下

**懸念**: 毎回クライアント生成でオーバーヘッド？

**対策**:
- クライアント生成は軽量（接続プール不要）
- 必要に応じてリクエストレベルのキャッシング検討
- 初期実装では最適化せず、計測後に判断

---

## 📅 実装スケジュール

### 優先度: 🔴 高

| Phase | 作業内容 | 見積時間 | 依存関係 |
|-------|---------|---------|---------|
| Phase 1 | ファクトリー + プロンプトビルダー実装 | 1.5h | なし |
| Phase 2 | シングルトン非推奨化 + プロンプト構造統一 | 1h | Phase 1 |
| Phase 3 | AI生成関数修正（4ファイル） | 3h | Phase 1, 2 |
| Phase 4 | テスト追加・修正 | 2.5h | Phase 3 |
| Phase 5 | ドキュメント更新 | 1h | Phase 4 |

**合計見積**: 約9時間

**実装順序**:
1. Phase 1: 基盤整備（ファクトリー、プロンプトビルダー）
2. Phase 2: 既存コードの準備（非推奨化）
3. Phase 3: 実際の移行（AI生成関数の修正）
4. Phase 4: 品質保証（テスト）
5. Phase 5: ドキュメント化

---

## ✅ 完了条件

- [ ] すべてのAI生成関数が動的クライアントを使用
- [ ] ユーザー設定APIキーが優先される
- [ ] 3プロバイダー全てが動作する
- [ ] 既存のテストが全て通る
- [ ] 新規テストが追加され、全て通る
- [ ] 環境変数のみの運用も継続可能
- [ ] DEPENDENCY MAP が最新
- [ ] ドキュメントが更新されている

---

## 📚 参考資料

- [LLM設定UI実装ログ](../05_logs/2025_11/20251103/05_llm-settings-ui-cleanup.md)
- [getUserAPIKey仕様書](../../../app/_actions/ai/getUserAPIKey.spec.md)
- [既存LLMクライアント実装](../../../lib/llm/client.ts)
- [API Key管理仕様](../../../app/_actions/ai/apiKey.spec.md)

---

## 🎯 次のステップ

この計画が承認されたら：

1. Phase 1から順次実装
2. 各Phaseごとにコミット
3. Phase 3完了時点で動作確認
4. 全Phase完了後、統合テスト

**計画作成日**: 2025-11-03  
**最終更新日**: 2025-11-03  
**ステータス**: 🚧 レビュー待ち

