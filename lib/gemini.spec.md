# generateQuestions.spec.md

## Overview

`generateQuestions()` および `generateBulkQuestions()` は、既存のフラッシュカード（front_content, back_content）から練習問題を生成する関数です。

Phase 1.2で、ユーザーが設定したAPIキーまたは環境変数のAPIキーを使用して、複数のLLMプロバイダー（Google Gemini、OpenAI、Anthropic）から選択可能になります。

## Related Files

- Implementation: `lib/gemini.ts`
- Tests: `lib/__tests__/generateQuestions.test.ts` (新規作成)
- Spec: `lib/gemini.spec.md` (このファイル)
- Dependencies:
  - `app/_actions/ai/getUserAPIKey.ts` - APIキー取得
  - `lib/gemini/client.ts` - Gemini クライアント
  - `lib/logger.ts` - Logger
- Parents (使用先):
  - `app/api/practice/generate/route.ts` - API Route
  - `app/_actions/quiz.ts` - Quiz問題生成

## Requirements

### R-001: 基本的な問題生成

**Description:** フラッシュカードのfront/backから指定された形式（flashcard、multiple_choice、cloze）の問題を生成する

**Input:**
```typescript
front: string;       // カード表面
back: string;        // カード裏面
type: QuestionType;  // "flashcard" | "multiple_choice" | "cloze"
difficulty?: "easy" | "normal" | "hard";  // デフォルト: "normal"
```

**Output:**
```typescript
Promise<QuestionData>;  // FlashcardQuestion | MultipleChoiceQuestion | ClozeQuestion
```

**Success Criteria:**
- JSON形式で問題が返される
- type に応じた適切な構造（question, options, answers 等）
- エラー時は Error を throw

---

### R-002: プロバイダー選択対応

**Description:** ユーザーが指定したLLMプロバイダーを選択可能にする

**Input:**
```typescript
{
  front: string;
  back: string;
  type: QuestionType;
  difficulty?: "easy" | "normal" | "hard";
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

**Description:** ユーザーが設定したAPIキーを使用して問題生成を行う

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
1. **空のfront/back** → Error throw（入力検証）
2. **APIキー未設定** → Error throw（getUserAPIKeyから）
3. **LLM API呼び出し失敗** → Error throw with message
4. **JSON解析失敗** → Error throw: "Failed to parse Gemini response JSON: {message}"
5. **空の応答** → Error throw: "Empty response from Gemini client"

**Success Criteria:**
- すべてのエラーケースで適切なエラーメッセージを含む Error を throw
- スタックトレース情報が含まれない（セキュリティ）

---

### R-005: JSONパース処理

**Description:** LLMの応答から正確にJSONオブジェクト/配列を抽出する

**Behavior:**
1. **コードフェンス抽出**: \`\`\`json ... \`\`\` を検出
2. **フォールバック抽出**: 最初の `{` から最後の `}` または `[` から `]` までを抽出
3. JSON.parse() でパース
4. パース失敗時は適切なエラーをスロー

**Success Criteria:**
- コードフェンス内のJSONが正しく抽出される
- コードフェンスがない場合もJSONオブジェクト/配列を抽出可能
- 不正なJSONの場合、適切なエラーメッセージ

---

### R-006: ロギング

**Description:** デバッグ・監視のための適切なログ出力

**Log Points:**
1. 問題生成開始時: provider, type, difficulty, front/backLength
2. API呼び出し前: provider, model
3. エラー発生時: provider, type, error message

**Success Criteria:**
- すべてのログがstructured logging形式
- センシティブ情報（APIキー、カード全文）が含まれない

---

### R-007: バッチ生成対応（generateBulkQuestions）

**Description:** 複数のカードから一度にまとめて問題を生成する

**Input:**
```typescript
pairs: { front: string; back: string }[];
type: QuestionType;
locale?: string;  // デフォルト: "en"
options?: {
  provider?: LLMProvider;
  model?: string;
}
```

**Output:**
```typescript
Promise<QuestionData[]>;
```

**Success Criteria:**
- 複数カードを一度のAPI呼び出しで処理
- レスポンスは JSON配列形式
- 各要素が適切な構造

---

### R-008: 既存機能との互換性

**Description:** 既存の呼び出し元と互換性を維持

**Backward Compatibility:**
```typescript
// 既存の呼び出し（パラメータなし）は引き続き動作
const question = await generateQuestions(front, back, "flashcard");

// 新しい呼び出し（プロバイダー指定）も動作
const question = await generateQuestions(front, back, "flashcard", "normal", { provider: "openai" });
```

**Success Criteria:**
- 既存コード（API Route、quiz.ts）が修正不要
- options パラメータはオプショナル

---

## Test Cases

### TC-001: 基本的な問題生成（Google Gemini）

**Input:**
```typescript
front = "React Hooks"
back = "関数コンポーネントで状態管理を行う機能"
type = "flashcard"
options = { provider: "google" }
```

**Expected:**
- JSON形式で問題が返される
- result.type === "flashcard"
- result.question が存在
- result.answer が存在

**Acceptance:**
```typescript
✅ getUserAPIKey("google") が呼び出された
✅ 返り値が FlashcardQuestion 型
✅ result.type === "flashcard"
✅ result.question が存在
✅ result.answer が存在
```

---

### TC-002: Multiple Choice問題生成

**Input:**
```typescript
front = "HTTP"
back = "HyperText Transfer Protocol"
type = "multiple_choice"
options = { provider: "google" }
```

**Expected:**
- MultipleChoiceQuestion 型
- options配列が4要素
- correctAnswerIndex が 0~3

**Acceptance:**
```typescript
✅ result.type === "multiple_choice"
✅ result.options.length === 4
✅ result.correctAnswerIndex >= 0 && <= 3
✅ result.explanation が存在
```

---

### TC-003: Cloze問題生成

**Input:**
```typescript
front = "TypeScript"
back = "型安全なJavaScriptスーパーセット"
type = "cloze"
options = { provider: "google" }
```

**Expected:**
- ClozeQuestion 型
- blanks配列が存在
- answers配列が存在

**Acceptance:**
```typescript
✅ result.type === "cloze"
✅ result.blanks が配列
✅ result.answers が配列
✅ result.options が配列の配列
```

---

### TC-004: OpenAIプロバイダーを使用した問題生成

**Input:**
```typescript
front = "Test"
back = "Test"
type = "flashcard"
options = { provider: "openai" }
```

**Expected:**
- OpenAI API を使用

**Acceptance:**
```typescript
✅ getUserAPIKey("openai") が呼び出された
✅ 返り値が QuestionData 型
```

---

### TC-005: Anthropicプロバイダーを使用した問題生成

**Input:**
```typescript
front = "Test"
back = "Test"
type = "flashcard"
options = { provider: "anthropic" }
```

**Expected:**
- Anthropic API を使用

**Acceptance:**
```typescript
✅ getUserAPIKey("anthropic") が呼び出された
✅ 返り値が QuestionData 型
```

---

### TC-006: ユーザーAPIキー優先

**Input:**
```typescript
front = "Test"
back = "Test"
type = "flashcard"
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
```

---

### TC-007: APIキー未設定エラー

**Input:**
```typescript
front = "Test"
back = "Test"
type = "flashcard"
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

### TC-008: LLM API呼び出し失敗

**Input:**
```typescript
front = "Test"
back = "Test"
type = "flashcard"
options = { provider: "google" }
// LLM API が タイムアウトまたはエラーを返す
```

**Expected:**
- Error throw with message

**Acceptance:**
```typescript
✅ Error を throw
✅ エラーメッセージが含まれる
```

---

### TC-009: JSON解析失敗エラー

**Input:**
```typescript
front = "Test"
back = "Test"
type = "flashcard"
// LLMが不正なJSON形式を返す
response = "これは正しいJSONではありません { invalid }"
```

**Expected:**
- Error throw: "Failed to parse Gemini response JSON: ..."

**Acceptance:**
```typescript
✅ JSON.parse() エラーが適切にキャッチされる
✅ エラーメッセージに "Failed to parse" が含まれる
```

---

### TC-010: コードフェンス抽出（JSON）

**Input:**
```typescript
front = "Test"
back = "Test"
type = "flashcard"
// LLMがコードフェンス内にJSONを返す
response = `
\`\`\`json
{
  "question": "What is Test?",
  "answer": "Test answer"
}
\`\`\`
`
```

**Expected:**
- コードフェンス内のJSONが正しく抽出される

**Acceptance:**
```typescript
✅ JSONオブジェクトが正しく抽出
✅ result.question === "What is Test?"
```

---

### TC-011: JSONオブジェクト抽出（フォールバック）

**Input:**
```typescript
front = "Test"
back = "Test"
type = "flashcard"
// LLMがコードフェンスなしでJSONを返す
response = `
以下のような問題を生成しました:
{ "question": "Q1", "answer": "A1" }
よろしくお願いします。
`
```

**Expected:**
- コードフェンスがない場合でもJSONオブジェクトを抽出

**Acceptance:**
```typescript
✅ JSONオブジェクトが正しく抽出（フォールバック）
✅ result.question === "Q1"
```

---

### TC-012: 空の応答エラー

**Input:**
```typescript
front = "Test"
back = "Test"
type = "flashcard"
// LLMが空の応答を返す
response.text = ""
```

**Expected:**
- Error throw: "Empty response from Gemini client"

**Acceptance:**
```typescript
✅ 空の応答が適切に検出される
✅ エラーメッセージに "Empty response" が含まれる
```

---

### TC-013: バッチ生成（generateBulkQuestions）

**Input:**
```typescript
pairs = [
  { front: "A", back: "Answer A" },
  { front: "B", back: "Answer B" }
]
type = "flashcard"
locale = "ja"
options = { provider: "google" }
```

**Expected:**
- JSON配列形式で複数の問題が返される
- result.length === 2

**Acceptance:**
```typescript
✅ getUserAPIKey("google") が呼び出された
✅ 返り値が QuestionData[] 型
✅ result.length === 2
✅ result[0].type === "flashcard"
```

---

### TC-014: カスタムモデル指定

**Input:**
```typescript
front = "Test"
back = "Test"
type = "flashcard"
options = { provider: "google", model: "gemini-2.0-pro" }
```

**Expected:**
- カスタムモデルが使用される

**Acceptance:**
```typescript
✅ geminiClient.models.generateContent が呼ばれる
✅ model パラメータが "gemini-2.0-pro"
```

---

### TC-015: デフォルトモデル使用

**Input:**
```typescript
front = "Test"
back = "Test"
type = "flashcard"
options = { provider: "google" }  // model 未指定
```

**Expected:**
- デフォルトモデル（gemini-2.5-flash）が使用される

**Acceptance:**
```typescript
✅ geminiClient.models.generateContent が呼ばれる
✅ model パラメータが "gemini-2.5-flash"
```

---

## Implementation Notes

### Phase 1.2 統合手順

1. **getUserAPIKey インポート追加**
   ```typescript
   import { getUserAPIKey } from "@/app/_actions/ai/getUserAPIKey";
   import type { LLMProvider } from "@/lib/llm/client";
   import logger from "@/lib/logger";
   ```

2. **GenerateQuestionsOptions インターフェース定義**
   ```typescript
   interface GenerateQuestionsOptions {
     provider?: LLMProvider;
     model?: string;
   }
   ```

3. **generateQuestions 関数シグネチャ修正**
   ```typescript
   export async function generateQuestions(
     front: string,
     back: string,
     type: QuestionType,
     difficulty: "easy" | "normal" | "hard" = "normal",
     options?: GenerateQuestionsOptions,
   ): Promise<QuestionData>
   ```

4. **Provider決定とAPIキー取得**
   ```typescript
   const provider = (options?.provider || "google") as LLMProvider;
   
   logger.info(
     { provider, type, difficulty, frontLength: front.length, backLength: back.length },
     "Starting question generation",
   );
   
   const apiKey = await getUserAPIKey(provider);
   
   logger.info(
     { provider, hasApiKey: !!apiKey },
     "API key retrieved for question generation",
   );
   ```

5. **モデル対応**
   ```typescript
   const model = options?.model || process.env.GEMINI_MODEL || "gemini-2.5-flash";
   
   const apiResponse = await geminiClient.models.generateContent({
     model,
     contents: prompt,
   });
   ```

6. **エラーハンドリング修正**
   ```typescript
   } catch (error: unknown) {
     logger.error(
       {
         provider,
         type,
         error: error instanceof Error ? error.message : String(error),
       },
       "Failed to generate question",
     );
     
     const msg = error instanceof Error ? error.message : String(error);
     throw new Error(`Failed to parse Gemini response JSON: ${msg}`);
   }
   ```

7. **DEPENDENCY MAP追加**
   ```typescript
   /**
    * DEPENDENCY MAP:
    *
    * Parents (使用先):
    *   ├─ app/api/practice/generate/route.ts
    *   └─ app/_actions/quiz.ts (generateBulkQuestions)
    *
    * Dependencies (依存先):
    *   ├─ app/_actions/ai/getUserAPIKey.ts
    *   ├─ lib/gemini/client.ts
    *   └─ lib/logger.ts
    *
    * Related Files:
    *   ├─ Spec: ./gemini.spec.md
    *   └─ Tests: ./__tests__/generateQuestions.test.ts
    */
   ```

8. **generateBulkQuestions も同様に修正**
   - options パラメータ追加
   - getUserAPIKey 統合
   - logger 統合

### テスト実装のポイント

1. **Mock Setup**
   - `getUserAPIKey` をモック
   - `geminiClient.models.generateContent` をモック
   - `logger` をモック（オプション）

2. **Helper Function**
   ```typescript
   function createMockGeminiResponse(questionData: Partial<QuestionData>)
   ```

3. **Test Data**
   ```typescript
   const mockFront = "React Hooks";
   const mockBack = "関数コンポーネントで状態管理を行う機能";
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
**Phase:** 1.2
**ステータス:** 仕様定義完了
