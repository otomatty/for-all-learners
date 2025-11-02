# generateCards.spec.md

## Overview

`generateCardsFromTranscript` は、音声トランスクリプト（文字起こし）を基にフラッシュカード（問題文と回答のペア）を生成するサーバーアクションです。

Phase 1.0で、ユーザーが設定したAPIキーまたは環境変数のAPIキーを使用して、複数のLLMプロバイダー（Google Gemini、OpenAI、Anthropic）から選択可能になります。

## Related Files

- Implementation: `app/_actions/generateCards.ts`
- Tests: `app/_actions/__tests__/generateCards.test.ts` (新規作成)
- Spec: `app/_actions/generateCards.spec.md` (このファイル)
- Dependencies:
  - `app/_actions/ai/getUserAPIKey.ts` - APIキー取得
  - `lib/gemini/client.ts` - Gemini クライアント
  - `lib/llm/client.ts` - LLM統合クライアント（将来）
- Parents (使用先):
  - `app/_actions/audioBatchProcessing.ts` - バッチ処理
  - `app/(protected)/decks/[deckId]/_components/audio-card-generator.tsx` - 音声カード生成
  - `app/(protected)/decks/[deckId]/_components/image-card-generator.tsx` - 画像OCRカード生成

## Requirements

### R-001: 基本的なカード生成

**Description:** トランスクリプトから問題文と回答のペアをJSON配列で生成する

**Input:**
```typescript
transcript: string;  // 文字起こしテキスト
sourceAudioUrl: string;  // 音声ファイルURL
```

**Output:**
```typescript
Promise<GeneratedCard[]>;

interface GeneratedCard {
  front_content: string;   // 問題文
  back_content: string;    // 回答
  source_audio_url: string;  // 音声URL
}
```

**Success Criteria:**
- JSON配列形式でカードが返される
- 各カードに front_content, back_content, source_audio_url が含まれる
- 最低1つのカードが生成される

---

### R-002: プロバイダー選択対応

**Description:** ユーザーが指定したLLMプロバイダーを選択可能にする

**Input:**
```typescript
{
  transcript: string;
  sourceAudioUrl: string;
  options?: {
    provider?: "google" | "openai" | "anthropic";  // デフォルト: "google"
    model?: string;  // オプション：カスタムモデル
  }
}
```

**Behavior:**
1. `provider`が指定されていない場合、デフォルトは`"google"`
2. `getUserAPIKey(provider)`でAPIキーを取得
3. 指定されたプロバイダーのクライアントを使用

**Success Criteria:**
- Google、OpenAI、Anthropicすべてのプロバイダーで生成可能
- デフォルトプロバイダーが正しく設定される

---

### R-003: ユーザーAPIキー統合

**Description:** ユーザーが設定したAPIキーを使用してカード生成を行う

**Behavior:**
1. `getUserAPIKey(provider)`を呼び出し
2. ユーザー設定キー → 環境変数キー の順でフォールバック
3. キーが存在しない場合、エラーをスロー

**Success Criteria:**
- ユーザーが設定したAPIキーが優先される
- 環境変数へのフォールバックが正常に動作
- キー未設定時に適切なエラーメッセージが出力

---

### R-004: エラーハンドリング

**Description:** 予期しないエラーを適切にハンドリングする

**Error Cases:**
1. **空のトランスクリプト** → Error: "トランスクリプトが空です"
2. **APIキー未設定** → Error: "API key not configured for provider: {provider}"
3. **LLM API呼び出し失敗** → Error: "カード生成に失敗しました"
4. **JSON解析失敗** → Error: "カード生成結果の解析に失敗しました"
5. **空の候補** → Error: "カード生成に失敗しました: 内容が空です"

**Success Criteria:**
- すべてのエラーケースで適切なエラーメッセージを返す
- スタックトレース情報が含まれない（セキュリティ）

---

### R-005: JSONパース処理

**Description:** LLMの応答から正確にJSON配列を抽出する

**Behavior:**
1. **コードフェンス抽出**: \`\`\`json ... \`\`\` または \`\`\` ... \`\`\` を検出
2. **フォールバック抽出**: 最初の `[` から最後の `]` までを抽出
3. JSON.parse() でパース
4. パース失敗時は適切なエラーをスロー

**Success Criteria:**
- コードフェンス内のJSONが正しく抽出される
- コードフェンスがない場合もJSON配列を抽出可能
- 不正なJSONの場合、適切なエラーメッセージ

---

### R-006: ロギング

**Description:** デバッグ・監視のための適切なログ出力

**Log Points:**
1. カード生成開始時: provider, transcript長, hasApiKey
2. API呼び出し前: provider, model
3. エラー発生時: provider, error message

**Success Criteria:**
- すべてのログがstructured logging形式
- センシティブ情報（APIキー、トランスクリプト全文）が含まれない

---

### R-007: 既存機能との互換性

**Description:** 既存の呼び出し元と互換性を維持

**Backward Compatibility:**
```typescript
// 既存の呼び出し（パラメータなし）は引き続き動作
await generateCardsFromTranscript(transcript, audioUrl);

// 新しい呼び出し（プロバイダー指定）も動作
await generateCardsFromTranscript(transcript, audioUrl, { provider: "openai" });
```

**Success Criteria:**
- 既存コード（audio-card-generator.tsx等）が修正不要
- options パラメータはオプショナル

---

## Test Cases

### TC-001: 基本的なカード生成（Google Gemini）

**Input:**
```typescript
transcript = "React Hooks とは、関数コンポーネントで状態管理を行う機能です。"
sourceAudioUrl = "https://example.com/audio.mp3"
options = { provider: "google" }
```

**Expected:**
- JSON配列形式でカードが返される
- 最低1つのカードが含まれる
- 各カードに front_content, back_content, source_audio_url が含まれる

**Acceptance:**
```typescript
✅ getUserAPIKey("google") が呼び出された
✅ 返り値が GeneratedCard[] 型
✅ cards.length >= 1
✅ cards[0].front_content が存在
✅ cards[0].back_content が存在
✅ cards[0].source_audio_url === sourceAudioUrl
```

---

### TC-002: OpenAIプロバイダーを使用したカード生成

**Input:**
```typescript
transcript = "TypeScript は JavaScript に型システムを追加した言語です。"
sourceAudioUrl = "https://example.com/audio2.mp3"
options = { provider: "openai" }
```

**Expected:**
- OpenAI API（GPT-4など）を使用してカードが生成される
- Geminiと異なる品質・フォーマット

**Acceptance:**
```typescript
✅ getUserAPIKey("openai") が呼び出された
✅ OpenAI APIが呼び出された（将来実装）
✅ 返り値が GeneratedCard[] 型
```

---

### TC-003: Anthropicプロバイダーを使用したカード生成

**Input:**
```typescript
transcript = "Next.js は React ベースのフルスタックフレームワークです。"
sourceAudioUrl = "https://example.com/audio3.mp3"
options = { provider: "anthropic" }
```

**Expected:**
- Anthropic API（Claude など）を使用
- 詳細で論理的なカード生成

**Acceptance:**
```typescript
✅ getUserAPIKey("anthropic") が呼び出された
✅ Anthropic APIが呼び出された（将来実装）
✅ 返り値が GeneratedCard[] 型
```

---

### TC-004: 空のトランスクリプトエラーハンドリング

**Input:**
```typescript
transcript = ""
sourceAudioUrl = "https://example.com/audio.mp3"
```

**Expected:**
- Error を throw
- エラーメッセージ: "トランスクリプトが空です"

**Acceptance:**
```typescript
✅ Error をスロー
✅ エラーメッセージが正確
✅ getUserAPIKey は呼び出されない（早期リターン）
```

---

### TC-005: ユーザーAPIキー優先

**Input:**
```typescript
transcript = "テストトランスクリプト"
sourceAudioUrl = "https://example.com/audio.mp3"
options = { provider: "google" }
// ユーザーが Google API キー を user_api_keys テーブルに登録済み
// 環境変数 GEMINI_API_KEY も設定されている
```

**Expected:**
- ユーザー設定のAPIキーが使用される
- 環境変数のキーは使用されない

**Acceptance:**
```typescript
✅ getUserAPIKey("google") が呼び出された
✅ ユーザー設定キーが優先される
✅ ログに確認可能
```

---

### TC-006: APIキー未設定エラー

**Input:**
```typescript
transcript = "テストトランスクリプト"
sourceAudioUrl = "https://example.com/audio.mp3"
options = { provider: "openai" }
// ユーザーが OpenAI API キーを設定していない
// 環境変数 OPENAI_API_KEY も未設定
```

**Expected:**
- Error を throw
- エラーメッセージ: "API key not configured for provider: openai. Please set it in Settings."

**Acceptance:**
```typescript
✅ getUserAPIKey からエラーが伝播
✅ 適切なエラーメッセージ
```

---

### TC-007: 不正なプロバイダーエラー

**Input:**
```typescript
transcript = "テストトランスクリプト"
sourceAudioUrl = "https://example.com/audio.mp3"
options = { provider: "invalid_provider" }  // 不正なプロバイダー
```

**Expected:**
- Error を throw
- エラーメッセージ: "Invalid provider: invalid_provider"（getUserAPIKeyから）

**Acceptance:**
```typescript
✅ プロバイダーバリデーションが機能
✅ 適切なエラーメッセージ
```

---

### TC-008: LLM API呼び出し失敗

**Input:**
```typescript
transcript = "テストトランスクリプト"
sourceAudioUrl = "https://example.com/audio.mp3"
options = { provider: "google" }
// LLM API が タイムアウトまたはエラーを返す
```

**Expected:**
- Error を throw
- エラーメッセージ: "カード生成に失敗しました" またはタイムアウトメッセージ

**Acceptance:**
```typescript
✅ LLM APIエラーが適切にハンドリング
✅ ユーザーフレンドリーなエラーメッセージ
```

---

### TC-009: JSON解析失敗エラー

**Input:**
```typescript
transcript = "テストトランスクリプト"
sourceAudioUrl = "https://example.com/audio.mp3"
// LLMが不正なJSON形式を返す
response = "これは正しいJSONではありません { invalid }"
```

**Expected:**
- Error を throw
- エラーメッセージ: "カード生成結果の解析に失敗しました"

**Acceptance:**
```typescript
✅ JSON.parse() エラーが適切にキャッチされる
✅ 適切なエラーメッセージ
```

---

### TC-010: コードフェンス抽出（JSON）

**Input:**
```typescript
transcript = "テストトランスクリプト"
sourceAudioUrl = "https://example.com/audio.mp3"
// LLMがコードフェンス内にJSONを返す
response = `
\`\`\`json
[
  {
    "front_content": "React Hooksとは?",
    "back_content": "関数コンポーネントで状態管理を行う機能"
  }
]
\`\`\`
`
```

**Expected:**
- コードフェンス内のJSONが正しく抽出される
- フェンスの記号は削除される
- JSON.parse() が成功する

**Acceptance:**
```typescript
✅ JSON配列が正しく抽出
✅ cards.length === 1
✅ cards[0].front_content === "React Hooksとは?"
```

---

### TC-011: JSON配列抽出（フォールバック）

**Input:**
```typescript
transcript = "テストトランスクリプト"
sourceAudioUrl = "https://example.com/audio.mp3"
// LLMがコードフェンスなしでJSONを返す
response = `
以下のようなカードを生成しました:
[
  { "front_content": "質問1", "back_content": "回答1" }
]
よろしくお願いします。
`
```

**Expected:**
- コードフェンスがない場合でもJSON配列を抽出
- 最初の `[` から最後の `]` までを抽出
- JSON.parse() が成功する

**Acceptance:**
```typescript
✅ JSON配列が正しく抽出（フォールバック）
✅ cards.length === 1
✅ cards[0].front_content === "質問1"
```

---

### TC-012: 空の候補エラー

**Input:**
```typescript
transcript = "テストトランスクリプト"
sourceAudioUrl = "https://example.com/audio.mp3"
// LLMが空の応答を返す
response.candidates = []
```

**Expected:**
- Error を throw
- エラーメッセージ: "カード生成に失敗しました: 内容が空です"

**Acceptance:**
```typescript
✅ 空の候補が適切に検出される
✅ 適切なエラーメッセージ
```

---

## Implementation Notes

### Phase 1.0 統合手順

1. **getUserAPIKey インポート追加**
   ```typescript
   import { getUserAPIKey } from "@/app/_actions/ai/getUserAPIKey";
   import type { LLMProvider } from "@/lib/llm/client";
   import logger from "@/lib/logger";
   ```

2. **GenerateCardsOptions インターフェース定義**
   ```typescript
   interface GenerateCardsOptions {
     provider?: LLMProvider;
     model?: string;
   }
   ```

3. **関数シグネチャ修正**
   ```typescript
   export async function generateCardsFromTranscript(
     transcript: string,
     sourceAudioUrl: string,
     options?: GenerateCardsOptions
   ): Promise<GeneratedCard[]>
   ```

4. **入力検証追加**
   ```typescript
   if (!transcript.trim()) {
     throw new Error("トランスクリプトが空です");
   }
   ```

5. **Provider決定とAPIキー取得**
   ```typescript
   const provider = (options?.provider || "google") as LLMProvider;
   
   logger.info(
     { provider, transcriptLength: transcript.length },
     "Starting card generation"
   );
   
   const apiKey = await getUserAPIKey(provider);
   
   logger.info(
     { provider, hasApiKey: !!apiKey },
     "API key retrieved"
   );
   ```

6. **既存のGemini呼び出しロジックを保持**
   - システムプロンプト
   - createUserContent
   - geminiClient.models.generateContent
   - JSONパース処理

7. **DEPENDENCY MAP更新**
   ```typescript
   /**
    * DEPENDENCY MAP:
    *
    * Parents (使用先):
    *   ├─ app/_actions/audioBatchProcessing.ts
    *   ├─ app/(protected)/decks/[deckId]/_components/audio-card-generator.tsx
    *   └─ app/(protected)/decks/[deckId]/_components/image-card-generator.tsx
    *
    * Dependencies (依存先):
    *   ├─ app/_actions/ai/getUserAPIKey.ts
    *   ├─ lib/gemini/client.ts
    *   └─ lib/logger.ts
    *
    * Related Files:
    *   ├─ Spec: ./generateCards.spec.md
    *   ├─ Tests: ./__tests__/generateCards.test.ts
    *   └─ Plan: docs/03_plans/phase-1-ai-integration/20251102_02_day3-generatecards-integration-plan.md
    */
   ```

### テスト実装のポイント

1. **Mock Setup**
   - `getUserAPIKey` をモック
   - `geminiClient.models.generateContent` をモック
   - `logger` をモック（オプション）

2. **Helper Function**
   ```typescript
   function createMockGeminiResponse(jsonArray: any[]) {
     const text = JSON.stringify(jsonArray);
     return {
       candidates: [{ content: { parts: [{ text }] } }],
       text,
       data: undefined,
       functionCalls: undefined,
       executableCode: undefined,
       codeExecutionResult: undefined,
     };
   }
   ```

3. **各テストケースで beforeEach 実行**
   ```typescript
   beforeEach(() => {
     vi.clearAllMocks();
     vi.mocked(getUserAPIKey).mockResolvedValue("test-api-key");
   });
   ```

### 将来の拡張

1. **Phase 2.0: LLM Client 抽象化**
   - OpenAI/Anthropicの完全対応
   - `lib/llm/client.ts` に統合クライアント作成
   - プロバイダーごとのレスポンス形式を統一

2. **カスタムモデル対応**
   - `options.model` パラメータを実際に使用
   - プロバイダーごとの推奨モデルリスト

3. **高度なエラーリトライ**
   - 指数バックオフ
   - 複数プロバイダーのフォールバック

---

**最終更新:** 2025-11-02
**Phase:** 1.0 Day 3
**ステータス:** 仕様定義完了
