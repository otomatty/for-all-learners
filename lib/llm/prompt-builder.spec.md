# Prompt Builder 仕様書

**対象:** プロンプト構造変換ユーティリティ  
**最終更新:** 2025-11-03  
**関連Issue:** ユーザー設定APIキーと複数プロバイダー対応  
**関連計画:** [docs/03_plans/ai-integration/20251103_04_dynamic-llm-client-implementation-plan.md](../../../docs/03_plans/ai-integration/20251103_04_dynamic-llm-client-implementation-plan.md)

---

## Overview

`buildPrompt` および `buildPromptFromGeminiContents` は、様々な形式のプロンプト構造（Gemini形式のcontents構造、シンプルな文字列配列など）を統一された文字列プロンプトに変換するユーティリティ関数です。

統一LLMクライアント（`LLMClient`）は `generate(prompt: string)` というシンプルなインターフェースを提供するため、既存のGemini固有の構造化contentsを文字列に変換する必要があります。

## Related Files

- **実装**: `lib/llm/prompt-builder.ts`
- **テスト**: `lib/llm/__tests__/prompt-builder.test.ts`
- **仕様書**: `lib/llm/prompt-builder.spec.md` (このファイル)
- **依存先**: なし（ピュア関数）
- **使用先**:
  - `app/_actions/generatePageInfo.ts`
  - `app/_actions/generateCards.ts`
  - `app/_actions/generateCardsFromPage.ts`
  - `lib/gemini.ts` (generateQuestions)

---

## Requirements

### R-001: 多様な入力形式への対応

**Description:** 様々な形式のプロンプトパーツを文字列に変換する

**Supported Formats:**

1. **単純な文字列配列**
   ```typescript
   ["System prompt", "User input"]
   ```

2. **オブジェクト配列（textプロパティ）**
   ```typescript
   [{ text: "Hello" }, { text: "World" }]
   ```

3. **Gemini形式のネスト構造**
   ```typescript
   [{ parts: [{ text: "Part 1" }, { text: "Part 2" }] }]
   ```

4. **混在形式**
   ```typescript
   ["System", { text: "User" }, { parts: [{ text: "Gemini" }] }]
   ```

**Success Criteria:**
- すべての形式が正しく変換される
- 空の配列は空文字列を返す
- 空文字列のパーツは除外される

---

### R-002: 区切り文字の適切な挿入

**Description:** 複数のパーツを適切な区切り文字で結合する

**Behavior:**
- 各パーツの間に `\n\n`（改行2つ）を挿入
- 空文字列のパーツは除外（フィルタリング）

**Success Criteria:**
- パーツ間が適切に区切られる
- 先頭・末尾に余分な改行が残らない

---

### R-003: Gemini Contents形式への対応

**Description:** Gemini APIのcontents形式を文字列に変換する

**Input Format:**
```typescript
[
  { role?: "user" | "model", parts: [{ text: "Hello" }] },
  { role?: "user" | "model", parts: [{ text: "World" }] }
]
```

**Output:**
```typescript
"Hello\n\nWorld"
```

**Success Criteria:**
- `parts` 配列内のテキストが結合される
- 各contentのpartsはスペースで結合（`join(" ")`）
- 各content間は改行2つで結合

---

### R-004: 空データの処理

**Description:** 空配列、空文字列、null/undefinedを適切に処理する

**Cases:**
1. 空配列 → 空文字列を返す
2. 空文字列のパーツ → 除外される
3. 空のparts配列 → 空文字列として扱われる

**Success Criteria:**
- 空配列は空文字列を返す
- 空文字列のパーツは結果に含まれない
- エラーがスローされない

---

### R-005: フォールバック処理

**Description:** 未知の形式のオブジェクトを適切に処理する

**Behavior:**
- 認識できない形式のオブジェクトは `JSON.stringify()` で文字列化

**Success Criteria:**
- エラーがスローされない
- 予期しない形式でも処理可能

---

## Test Cases

### TC-001: 文字列配列からプロンプト生成

**Input:**
```typescript
parts = ["System prompt", "User input"]
```

**Expected:**
```typescript
"System prompt\n\nUser input"
```

**Acceptance:**
```typescript
✅ 文字列が正しく結合される
✅ 改行2つで区切られる
```

---

### TC-002: オブジェクト配列からプロンプト生成

**Input:**
```typescript
parts = [{ text: "Hello" }, { text: "World" }]
```

**Expected:**
```typescript
"Hello\n\nWorld"
```

**Acceptance:**
```typescript
✅ textプロパティが正しく抽出される
✅ 改行2つで区切られる
```

---

### TC-003: Gemini形式のネスト構造からプロンプト生成

**Input:**
```typescript
parts = [{ parts: [{ text: "Part 1" }, { text: "Part 2" }] }]
```

**Expected:**
```typescript
"Part 1 Part 2"
```

**Acceptance:**
```typescript
✅ parts配列内のテキストが結合される
✅ スペースで区切られる（parts内）
```

---

### TC-004: 混在形式からプロンプト生成

**Input:**
```typescript
parts = ["System", { text: "User" }, { parts: [{ text: "Gemini" }] }]
```

**Expected:**
```typescript
"System\n\nUser\n\nGemini"
```

**Acceptance:**
```typescript
✅ 異なる形式が混在しても正しく処理される
✅ 適切に結合される
```

---

### TC-005: 空配列の処理

**Input:**
```typescript
parts = []
```

**Expected:**
```typescript
""
```

**Acceptance:**
```typescript
✅ 空文字列が返される
✅ エラーがスローされない
```

---

### TC-006: 空文字列パーツの除外

**Input:**
```typescript
parts = ["Hello", "", "World", "   "]
```

**Expected:**
```typescript
"Hello\n\nWorld"
```

**Acceptance:**
```typescript
✅ 空文字列が除外される
✅ 空白のみの文字列も除外される
```

---

### TC-007: null/undefinedの処理

**Input:**
```typescript
parts = ["Hello", null, "World"]  // nullは型エラーだが、実行時エラーを避ける
```

**Expected:**
- エラーがスローされない
- nullは文字列化されるか除外される

**Acceptance:**
```typescript
✅ エラーがスローされない
✅ 適切に処理される
```

---

### TC-008: 複数のGemini形式パーツ

**Input:**
```typescript
parts = [
  { parts: [{ text: "First" }, { text: "part" }] },
  { parts: [{ text: "Second" }, { text: "part" }] }
]
```

**Expected:**
```typescript
"First part\n\nSecond part"
```

**Acceptance:**
```typescript
✅ 各parts内はスペースで結合
✅ 各content間は改行2つで結合
```

---

### TC-009: buildPromptFromGeminiContents - 基本的な変換

**Input:**
```typescript
contents = [
  { role: "user", parts: [{ text: "Hello" }] },
  { role: "model", parts: [{ text: "Hi" }] }
]
```

**Expected:**
```typescript
"Hello\n\nHi"
```

**Acceptance:**
```typescript
✅ roleは無視される
✅ parts内のテキストが抽出される
✅ 改行2つで結合される
```

---

### TC-010: buildPromptFromGeminiContents - 空のparts配列

**Input:**
```typescript
contents = [
  { role: "user", parts: [] },
  { role: "user", parts: [{ text: "Hello" }] }
]
```

**Expected:**
```typescript
"Hello"
```

**Acceptance:**
```typescript
✅ 空のpartsは空文字列として扱われる
✅ 空文字列は除外される
```

---

### TC-011: buildPromptFromGeminiContents - 空配列

**Input:**
```typescript
contents = []
```

**Expected:**
```typescript
""
```

**Acceptance:**
```typescript
✅ 空文字列が返される
✅ エラーがスローされない
```

---

### TC-012: 長いテキストの処理

**Input:**
```typescript
parts = ["A".repeat(1000), "B".repeat(1000)]
```

**Expected:**
```typescript
"A...\n\nB..."
```

**Acceptance:**
```typescript
✅ 長いテキストでも正しく処理される
✅ メモリリークが発生しない
```

---

### TC-013: 特殊文字の処理

**Input:**
```typescript
parts = ["Hello\nWorld", "Test\tTab"]
```

**Expected:**
```typescript
"Hello\nWorld\n\nTest\tTab"
```

**Acceptance:**
```typescript
✅ 改行やタブが正しく保持される
✅ エスケープされない
```

---

### TC-014: 複雑なネスト構造

**Input:**
```typescript
parts = [
  "System",
  { text: "User" },
  { parts: [{ text: "A" }, { text: "B" }, { text: "C" }] },
  "Final"
]
```

**Expected:**
```typescript
"System\n\nUser\n\nA B C\n\nFinal"
```

**Acceptance:**
```typescript
✅ 複雑な構造でも正しく処理される
✅ 各形式が適切に変換される
```

---

### TC-015: フォールバック処理（未知の形式）

**Input:**
```typescript
parts = [{ unknown: "property" }]
```

**Expected:**
```typescript
JSON.stringify({ unknown: "property" })
```

**Acceptance:**
```typescript
✅ エラーがスローされない
✅ JSON.stringify で文字列化される
```

---

## Implementation Notes

### API設計

```typescript
export type PromptPart =
  | string
  | { text: string }
  | { parts: { text: string }[] };

export function buildPrompt(parts: PromptPart[]): string

export function buildPromptFromGeminiContents(
  contents: { role?: string; parts: { text: string }[] }[]
): string
```

### 使用例

```typescript
// シンプルな文字列配列
const prompt1 = buildPrompt(["System prompt", "User input"]);
// => "System prompt\n\nUser input"

// オブジェクト配列
const prompt2 = buildPrompt([
  { text: "Hello" },
  { text: "World" }
]);
// => "Hello\n\nWorld"

// Gemini形式
const prompt3 = buildPrompt([
  { parts: [{ text: "Part 1" }, { text: "Part 2" }] }
]);
// => "Part 1 Part 2"

// Gemini contents形式
const prompt4 = buildPromptFromGeminiContents([
  { role: "user", parts: [{ text: "Hello" }] },
  { role: "model", parts: [{ text: "Hi" }] }
]);
// => "Hello\n\nHi"
```

### 実装詳細

**buildPrompt の処理フロー:**

1. **空チェック**
   ```typescript
   if (!parts || parts.length === 0) return "";
   ```

2. **各パーツの変換**
   ```typescript
   parts.map(part => {
     if (typeof part === "string") return part;
     if ("text" in part) return part.text;
     if ("parts" in part) return part.parts.map(p => p.text).join(" ");
     return JSON.stringify(part);
   })
   ```

3. **空文字列のフィルタリング**
   ```typescript
   .filter(text => text.trim().length > 0)
   ```

4. **結合**
   ```typescript
   .join("\n\n")
   ```

**buildPromptFromGeminiContents の処理フロー:**

1. **空チェック**
   ```typescript
   if (!contents || contents.length === 0) return "";
   ```

2. **各contentの変換**
   ```typescript
   contents.map(content => {
     if (!content.parts || content.parts.length === 0) return "";
     return content.parts.map(p => p.text).join(" ");
   })
   ```

3. **空文字列のフィルタリング**
   ```typescript
   .filter(text => text.trim().length > 0)
   ```

4. **結合**
   ```typescript
   .join("\n\n")
   ```

### パフォーマンス考慮事項

1. **配列操作の効率**
   - `map` → `filter` → `join` のパイプライン処理
   - 中間配列の生成は避けられないが、通常の使用では問題なし

2. **文字列結合**
   - `join("\n\n")` は効率的
   - 長い配列でも問題なし

### エッジケース処理

1. **null/undefined**
   - TypeScriptの型チェックで防ぐ
   - 実行時は `JSON.stringify()` でフォールバック

2. **空配列**
   - 早期リターンで効率化

3. **空文字列パーツ**
   - `trim().length > 0` でフィルタリング

---

## Related Documentation

- [実装計画書](../../../docs/03_plans/ai-integration/20251103_04_dynamic-llm-client-implementation-plan.md)
- [実装ログ](../../../docs/05_logs/2025_11/20251103/06_dynamic-llm-client-implementation.md)
- [LLM Client Factory仕様書](./factory.spec.md)

---

**最終更新:** 2025-11-03  
**作成者:** AI Assistant  
**ステータス:** ✅ 実装完了、テスト完了

