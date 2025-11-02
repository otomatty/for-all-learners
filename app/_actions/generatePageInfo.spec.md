# generatePageInfo.spec.md

## Overview

`generatePageInfo` は、ページタイトルを基にMarkdown形式の解説ドキュメントを生成するサーバーアクションです。

Phase 1.0で、ユーザーが設定したAPIキーまたは環境変数のAPIキーを使用して、複数のLLMプロバイダー（Google Gemini、OpenAI、Anthropic）から選択可能になります。

## Related Files

- Implementation: `app/_actions/generatePageInfo.ts`
- Tests: `app/_actions/__tests__/generatePageInfo.test.ts` (新規作成)
- Spec: `app/_actions/generatePageInfo.spec.md` (このファイル)
- Dependencies:
  - `app/_actions/ai/getUserAPIKey.ts` - APIキー取得
  - `lib/llm/client.ts` - LLM統合クライアント
  - `app/_actions/promptService.ts` - プロンプト管理

## Requirements

### R-001: 基本的なページ情報生成

**Description:** ユーザーが指定したタイトルからMarkdown形式のコンテンツを生成する

**Input:**
```typescript
title: string;  // ページのタイトル（キーワード）
```

**Output:**
```typescript
Promise<string>;  // Markdown形式の解説ドキュメント
```

**Success Criteria:**
- Markdown形式の妥当なコンテンツが返される
- 空行やフォーマッティングが適切
- 先頭のH1ヘッディングが削除される

---

### R-002: プロバイダー選択対応

**Description:** ユーザーが指定したLLMプロバイダーを選択可能にする

**Input:**
```typescript
{
  title: string;
  provider?: "google" | "openai" | "anthropic";  // デフォルト: "google"
  model?: string;  // オプション：カスタムモデル
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

**Description:** ユーザーが設定したAPIキーを使用して生成を行う

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
1. **空のタイトル** → Error: "タイトルが空です"
2. **APIキー未設定** → Error: "API key not configured for provider: {provider}"
3. **LLM API呼び出し失敗** → Error: "コンテンツ生成に失敗しました"
4. **不正なプロバイダー** → Error: "Invalid provider: {provider}"

**Success Criteria:**
- すべてのエラーケースで適切なエラーメッセージを返す
- スタックトレース情報が含まれない（セキュリティ）

---

### R-005: プロンプト管理

**Description:** プロバイダーごとに最適化されたプロンプトテンプレートを使用する

**Behavior:**
1. `getPromptTemplate("page_info", provider)`でプロバイダー固有のテンプレートを取得
2. 各プロバイダーの性質に最適化されたプロンプト（例：トークン制限対応）

**Success Criteria:**
- Google、OpenAI、Anthropicそれぞれの最適なプロンプトが使用される
- プロンプトのバージョン管理が可能

---

## Test Cases

### TC-001: 基本的なMarkdown生成（Google Gemini）

**Input:**
```typescript
title = "React Hooks入門"
provider = "google"  // またはデフォルト
```

**Expected:**
- Markdown形式の解説が返される
- H1ヘッディング（`# React Hooks入門`）が含まれない
- 複数のセクション（概要、使用例、注意点など）が含まれる

**Acceptance:**
```typescript
✅ 返り値がstring型
✅ Markdownの妥当性が確認できる（# や ## が含まれる）
✅ 最初の行がH1ヘッディングでない
```

---

### TC-002: OpenAIプロバイダーを使用した生成

**Input:**
```typescript
title = "TypeScript型システム"
provider = "openai"
```

**Expected:**
- OpenAI API（GPT-4など）を使用してコンテンツが生成される
- Geminiと異なる品質・フォーマット

**Acceptance:**
```typescript
✅ OpenAI APIが呼び出された
✅ Markdown形式のコンテンツが返される
✅ プロバイダーごとの最適化プロンプトが使用されている
```

---

### TC-003: Anthropicプロバイダーを使用した生成

**Input:**
```typescript
title = "分散システム設計"
provider = "anthropic"
```

**Expected:**
- Anthropic API（Claude など）を使用
- 詳細で論理的なコンテンツ

**Acceptance:**
```typescript
✅ Anthropic APIが呼び出された
✅ Markdown形式のコンテンツが返される
```

---

### TC-004: 空のタイトルエラーハンドリング

**Input:**
```typescript
title = ""
```

**Expected:**
- Error を throw
- エラーメッセージ: "タイトルが空です"

**Acceptance:**
```typescript
✅ Error をスロー
✅ エラーメッセージが正確
```

---

### TC-005: ユーザーAPIキー優先

**Input:**
```typescript
title = "Next.js App Router"
provider = "google"
// ユーザーが Google API キー を user_api_keys テーブルに登録済み
// 環境変数 GEMINI_API_KEY も設定されている
```

**Expected:**
- ユーザー設定のAPIキーが使用される
- 環境変数のキーは使用されない

**Acceptance:**
```typescript
✅ getUserAPIKey が呼び出された
✅ ユーザー設定キーが優先される
✅ ログに確認可能
```

---

### TC-006: APIキー未設定エラー

**Input:**
```typescript
title = "Vue.js Composition API"
provider = "openai"
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
title = "テスト"
provider = "invalid_provider"  // 不正なプロバイダー
```

**Expected:**
- Error を throw
- エラーメッセージ: "Invalid provider: invalid_provider"

**Acceptance:**
```typescript
✅ プロバイダーバリデーションが機能
✅ 適切なエラーメッセージ
```

---

### TC-008: LLM API呼び出し失敗時の復帰

**Input:**
```typescript
title = "テスト"
provider = "google"
// LLM API が タイムアウトまたはエラーを返す
```

**Expected:**
- Error を throw
- エラーメッセージ: "コンテンツ生成に失敗しました" またはタイムアウトメッセージ

**Acceptance:**
```typescript
✅ LLM APIエラーが適切にハンドリング
✅ ユーザーフレンドリーなエラーメッセージ
```

---

### TC-009: コードフェンス抽出（複数パターン）

**Input:**
```typescript
title = "テスト"
// LLMがコードフェンス内にMarkdownを返す
response = `
\`\`\`markdown
## セクション1
内容...
\`\`\`
`
```

**Expected:**
- コードフェンス内のコンテンツが抽出される
- フェンスの記号は削除される

**Acceptance:**
```typescript
✅ markdown / md フェンスが正しく抽出
✅ 外側のフェンスが削除
```

---

## Implementation Notes

### Key Considerations

1. **API キー管理**
   - `getUserAPIKey` で自動的にフォールバック処理
   - ユーザーが未設定の場合はエラー

2. **プロバイダーバリデーション**
   - "google" | "openai" | "anthropic" のみ許可
   - その他は TypeError を throw

3. **プロンプト最適化**
   - Google Gemini: 長いコンテキストに対応
   - OpenAI: JSON形式の構造化出力可能
   - Anthropic: 論理的で詳細な説明が強み

4. **パフォーマンス**
   - LLM呼び出しは非同期（await 必須）
   - キャッシング可能性は検討中

5. **セキュリティ**
   - APIキーはメモリ内のみ
   - ログに出力しない
   - ユーザー認証確認済み

---

## Dependencies

| 依存先 | 用途 | 必須度 |
|--------|------|--------|
| `getUserAPIKey` | APIキー取得 | 🔴 Critical |
| `lib/llm/client` | LLM統合 | 🔴 Critical |
| `promptService` | プロンプト取得 | 🟡 High |
| `@google/genai` | Google API | 🟡 High |
| `openai` | OpenAI API | 🟡 High |
| `@anthropic-ai/sdk` | Anthropic API | 🟡 High |

---

## Acceptance Criteria

- [ ] TC-001 ～ TC-009 すべてがパス
- [ ] ビルドでエラーなし
- [ ] 型チェック完全
- [ ] エラーメッセージすべてが適切
- [ ] パフォーマンステスト通過

---

**Last Updated:** 2025-11-02
