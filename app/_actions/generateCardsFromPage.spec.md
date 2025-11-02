# generateCardsFromPage.spec.md

## Overview

`generateRawCardsFromPageContent` は、ページコンテンツ（Tiptap JSON形式）からフラッシュカード（問題文と回答のペア）を生成するサーバーアクションです。

Phase 1.1で、ユーザーが設定したAPIキーまたは環境変数のAPIキーを使用して、複数のLLMプロバイダー（Google Gemini、OpenAI、Anthropic）から選択可能になります。

## Related Files

- Implementation: `app/_actions/generateCardsFromPage.ts`
- Tests: `app/_actions/__tests__/generateCardsFromPage.test.ts` (新規作成)
- Spec: `app/_actions/generateCardsFromPage.spec.md` (このファイル)
- Dependencies:
  - `app/_actions/ai/getUserAPIKey.ts` - APIキー取得
  - `lib/gemini/client.ts` - Gemini クライアント
  - `lib/llm/client.ts` - LLM統合クライアント（将来）
- Parents (使用先):
  - `components/pages/generate-cards/generate-cards-form.tsx` - ページからカード生成UI

## Requirements

### R-001: 基本的なカード生成

**Description:** Tiptap JSON形式のページコンテンツからテキストを抽出し、問題文と回答のペアを生成する

**Input:**
```typescript
pageContentTiptap: Json | null;  // Tiptap JSON形式のコンテンツ
```

**Output:**
```typescript
Promise<{
  generatedRawCards: GeneratedRawCard[];
  error?: string;
}>;

interface GeneratedRawCard {
  front_content: string;   // 問題文
  back_content: string;    // 回答
}
```

**Success Criteria:**
- Tiptap JSONからテキストが正しく抽出される
- JSON配列形式でカードが返される
- 各カードに front_content, back_content が含まれる
- エラー時は error プロパティが設定される

---

### R-002: プロバイダー選択対応

**Description:** ユーザーが指定したLLMプロバイダーを選択可能にする

**Input:**
```typescript
{
  pageContentTiptap: Json | null;
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

**Description:** 予期しないエラーを適切にハンドリングし、ユーザーフレンドリーなエラーメッセージを返す

**Error Cases:**
1. **空のページコンテンツ** → `{ error: "ページに抽出可能なテキストコンテンツがありません。", generatedRawCards: [] }`
2. **APIキー未設定** → Error throw（getUserAPIKeyから）
3. **LLM API呼び出し失敗** → `{ error: "AIによるカード生成に失敗しました: {message}", generatedRawCards: [] }`
4. **JSON解析失敗** → `{ error: "AIによるカード生成に失敗しました: {message}", generatedRawCards: [] }`
5. **空の候補** → `{ error: "AIからの応答が空です。", generatedRawCards: [] }`
6. **カード0件生成** → `{ error: "AIによってカードが生成されませんでした。", generatedRawCards: [] }`

**Success Criteria:**
- すべてのエラーケースで適切なエラーメッセージを返す
- エラー発生時も関数は throw せず、error プロパティを設定（APIキー未設定以外）
- スタックトレース情報が含まれない（セキュリティ）

---

### R-005: Tiptapテキスト抽出

**Description:** Tiptap JSON形式から正確にプレーンテキストを抽出する

**Behavior:**
1. Tiptap doc 構造を再帰的に走査
2. text ノードからテキストを抽出
3. paragraph, heading 等のブロック要素の後に改行を追加
4. 余分な空白・改行をトリム

**Success Criteria:**
- 複数段落が正しく抽出される
- リスト、引用、コードブロック等も抽出可能
- 空のコンテンツは空文字列を返す

---

### R-006: JSONパース処理

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

### R-007: ロギング

**Description:** デバッグ・監視のための適切なログ出力

**Log Points:**
1. カード生成開始時: provider, pageTextLength, hasApiKey
2. API呼び出し前: provider, model
3. エラー発生時: provider, error message

**Success Criteria:**
- すべてのログがstructured logging形式
- センシティブ情報（APIキー、ページ全文）が含まれない

---

### R-008: 既存機能との互換性

**Description:** 既存の呼び出し元と互換性を維持

**Backward Compatibility:**
```typescript
// 既存の呼び出し（パラメータなし）は引き続き動作
const result = await generateRawCardsFromPageContent(pageContent);

// 新しい呼び出し（プロバイダー指定）も動作
const result = await generateRawCardsFromPageContent(pageContent, { provider: "openai" });
```

**Success Criteria:**
- 既存コード（generate-cards-form.tsx）が修正不要
- options パラメータはオプショナル

---

## Test Cases

### TC-001: 基本的なカード生成（Google Gemini）

**Input:**
```typescript
pageContentTiptap = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "React Hooks は関数コンポーネントで状態管理を行う機能です。" }]
    }
  ]
}
options = { provider: "google" }
```

**Expected:**
- JSON配列形式でカードが返される
- 最低1つのカードが含まれる
- error プロパティが undefined

**Acceptance:**
```typescript
✅ getUserAPIKey("google") が呼び出された
✅ 返り値が { generatedRawCards: GeneratedRawCard[], error?: undefined } 型
✅ generatedRawCards.length >= 1
✅ generatedRawCards[0].front_content が存在
✅ generatedRawCards[0].back_content が存在
```

---

### TC-002: OpenAIプロバイダーを使用したカード生成

**Input:**
```typescript
pageContentTiptap = { /* Tiptap JSON */ }
options = { provider: "openai" }
```

**Expected:**
- OpenAI API（GPT-4など）を使用してカードが生成される

**Acceptance:**
```typescript
✅ getUserAPIKey("openai") が呼び出された
✅ 返り値が { generatedRawCards: GeneratedRawCard[] } 型
```

---

### TC-003: Anthropicプロバイダーを使用したカード生成

**Input:**
```typescript
pageContentTiptap = { /* Tiptap JSON */ }
options = { provider: "anthropic" }
```

**Expected:**
- Anthropic API（Claude など）を使用

**Acceptance:**
```typescript
✅ getUserAPIKey("anthropic") が呼び出された
✅ 返り値が { generatedRawCards: GeneratedRawCard[] } 型
```

---

### TC-004: 空のページコンテンツエラーハンドリング

**Input:**
```typescript
pageContentTiptap = null
```

**Expected:**
- エラーメッセージを含む結果オブジェクトを返す
- error: "ページに抽出可能なテキストコンテンツがありません。"
- generatedRawCards: []

**Acceptance:**
```typescript
✅ Error を throw しない
✅ result.error が設定される
✅ result.generatedRawCards が空配列
✅ getUserAPIKey は呼び出されない（早期リターン）
```

---

### TC-005: ユーザーAPIキー優先

**Input:**
```typescript
pageContentTiptap = { /* Tiptap JSON */ }
options = { provider: "google" }
// ユーザーが Google API キー を user_api_keys テーブルに登録済み
// 環境変数 GEMINI_API_KEY も設定されている
```

**Expected:**
- ユーザー設定のAPIキーが使用される

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
pageContentTiptap = { /* Tiptap JSON */ }
options = { provider: "openai" }
// ユーザーが OpenAI API キーを設定していない
// 環境変数 OPENAI_API_KEY も未設定
```

**Expected:**
- getUserAPIKey から Error が throw される
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
pageContentTiptap = { /* Tiptap JSON */ }
options = { provider: "invalid_provider" }
```

**Expected:**
- getUserAPIKey から Error が throw される

**Acceptance:**
```typescript
✅ プロバイダーバリデーションが機能
✅ 適切なエラーメッセージ
```

---

### TC-008: LLM API呼び出し失敗

**Input:**
```typescript
pageContentTiptap = { /* Tiptap JSON */ }
options = { provider: "google" }
// LLM API が タイムアウトまたはエラーを返す
```

**Expected:**
- エラーメッセージを含む結果オブジェクトを返す
- error: "AIによるカード生成に失敗しました: ..."

**Acceptance:**
```typescript
✅ Error を throw しない
✅ result.error にエラーメッセージが含まれる
✅ result.generatedRawCards が空配列
```

---

### TC-009: JSON解析失敗エラー

**Input:**
```typescript
pageContentTiptap = { /* Tiptap JSON */ }
// LLMが不正なJSON形式を返す
response = "これは正しいJSONではありません { invalid }"
```

**Expected:**
- エラーメッセージを含む結果オブジェクトを返す
- error: "AIによるカード生成に失敗しました: ..."

**Acceptance:**
```typescript
✅ JSON.parse() エラーが適切にキャッチされる
✅ result.error が設定される
```

---

### TC-010: コードフェンス抽出（JSON）

**Input:**
```typescript
pageContentTiptap = { /* Tiptap JSON */ }
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
- generatedRawCards.length === 1

**Acceptance:**
```typescript
✅ JSON配列が正しく抽出
✅ generatedRawCards.length === 1
✅ front_content, back_content が正しい
```

---

### TC-011: JSON配列抽出（フォールバック）

**Input:**
```typescript
pageContentTiptap = { /* Tiptap JSON */ }
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
- generatedRawCards.length === 1

**Acceptance:**
```typescript
✅ JSON配列が正しく抽出（フォールバック）
✅ generatedRawCards.length === 1
```

---

### TC-012: 空の候補エラー

**Input:**
```typescript
pageContentTiptap = { /* Tiptap JSON */ }
// LLMが空の応答を返す
response.candidates = []
```

**Expected:**
- エラーメッセージを含む結果オブジェクトを返す
- error: "AIからの応答が空です。"

**Acceptance:**
```typescript
✅ 空の候補が適切に検出される
✅ result.error が設定される
```

---

### TC-013: カード0件生成エラー

**Input:**
```typescript
pageContentTiptap = { /* Tiptap JSON */ }
// LLMが空配列を返す
response = "[]"
```

**Expected:**
- エラーメッセージを含む結果オブジェクトを返す
- error: "AIによってカードが生成されませんでした。"

**Acceptance:**
```typescript
✅ 空配列が適切に検出される
✅ result.error が設定される
```

---

## Implementation Notes

### Phase 1.1 統合手順

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
   export async function generateRawCardsFromPageContent(
     pageContentTiptap: Json | null,
     options?: GenerateCardsOptions
   ): Promise<{
     generatedRawCards: GeneratedRawCard[];
     error?: string;
   }>
   ```

4. **Provider決定とAPIキー取得（テキスト抽出後）**
   ```typescript
   const pageText = extractTextFromTiptap(pageContentTiptap);
   
   if (!pageText) {
     return {
       error: "ページに抽出可能なテキストコンテンツがありません。",
       generatedRawCards: [],
     };
   }
   
   const provider = (options?.provider || "google") as LLMProvider;
   
   logger.info(
     { provider, pageTextLength: pageText.length },
     "Starting card generation from page content",
   );
   
   const apiKey = await getUserAPIKey(provider);
   
   logger.info(
     { provider, hasApiKey: !!apiKey },
     "API key retrieved for card generation",
   );
   ```

5. **モデル対応**
   ```typescript
   const response = await geminiClient.models.generateContent({
     model: options?.model || "gemini-2.5-flash",
     contents,
   });
   ```

6. **エラーハンドリング修正**
   - try-catch 内でのエラーは error プロパティに設定
   - getUserAPIKey のエラーは throw（早期失敗）

7. **DEPENDENCY MAP更新**
   ```typescript
   /**
    * DEPENDENCY MAP:
    *
    * Parents (使用先):
    *   └─ components/pages/generate-cards/generate-cards-form.tsx
    *
    * Dependencies (依存先):
    *   ├─ app/_actions/ai/getUserAPIKey.ts
    *   ├─ lib/gemini/client.ts
    *   └─ lib/logger.ts
    *
    * Related Files:
    *   ├─ Spec: ./generateCardsFromPage.spec.md
    *   ├─ Tests: ./__tests__/generateCardsFromPage.test.ts
    *   └─ Related: ./generateCards.ts (音声トランスクリプト用)
    */
   ```

### テスト実装のポイント

1. **Mock Setup**
   - `getUserAPIKey` をモック
   - `geminiClient.models.generateContent` をモック
   - `logger` をモック（オプション）

2. **Helper Function**
   ```typescript
   function createMockGeminiResponse(
     cards: Array<{ front_content: string; back_content: string }>
   )
   ```

3. **Tiptap Mock Data**
   ```typescript
   const mockTiptapContent = {
     type: "doc",
     content: [
       {
         type: "paragraph",
         content: [{ type: "text", text: "テストテキスト" }]
       }
     ]
   };
   ```

### 将来の拡張

1. **Phase 2.0: LLM Client 抽象化**
   - OpenAI/Anthropicの完全対応
   - `lib/llm/client.ts` に統合クライアント作成

2. **高度なエラーリトライ**
   - 指数バックオフ
   - 複数プロバイダーのフォールバック

---

**最終更新:** 2025-11-02
**Phase:** 1.1
**ステータス:** 仕様定義完了
