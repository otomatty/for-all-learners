# Phase 1.1: generateCardsFromPage 統合完了

**作業日時:** 2025-11-02
**Phase:** 1.1 - generateCardsFromPage getUserAPIKey統合
**Status:** ✅ 完了

---

## 実施した作業

### 1. 仕様書作成

**ファイル:** `app/_actions/generateCardsFromPage.spec.md`

- **Requirements:** R-001 ~ R-008 定義
  - R-001: 基本的なカード生成（Tiptap JSON → テキスト抽出 → AI生成）
  - R-002: プロバイダー選択対応（google, openai, anthropic）
  - R-003: ユーザーAPIキー統合（getUserAPIKey使用）
  - R-004: エラーハンドリング（6種類のエラーケース）
  - R-005: Tiptapテキスト抽出（複雑な構造対応）
  - R-006: JSONパース処理（コードフェンス/フォールバック）
  - R-007: ロギング（structured logging）
  - R-008: 既存機能との互換性（options はオプショナル）

- **Test Cases:** TC-001 ~ TC-015 定義
  - TC-001: Google Gemini基本生成
  - TC-002: OpenAIプロバイダー
  - TC-003: Anthropicプロバイダー
  - TC-004: 空のページコンテンツエラー
  - TC-005: ユーザーAPIキー優先
  - TC-006: APIキー未設定エラー
  - TC-007: 不正なプロバイダーエラー
  - TC-008: LLM API呼び出し失敗
  - TC-009: JSON解析失敗エラー
  - TC-010: コードフェンス抽出（JSON）
  - TC-011: JSON配列抽出（フォールバック）
  - TC-012: 空の候補エラー
  - TC-013: カード0件生成エラー
  - TC-014: カスタムモデル指定
  - TC-015: Tiptapテキスト抽出（複雑な構造）

- **Implementation Notes:** Phase 1.1統合手順を詳細記載

---

### 2. 実装修正

**ファイル:** `app/_actions/generateCardsFromPage.ts`

**追加内容:**

1. **DEPENDENCY MAP コメント追加**
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
    *   ├─ lib/logger.ts
    *   └─ lib/supabase/server.ts
    */
   ```

2. **インポート追加**
   ```typescript
   import { getUserAPIKey } from "@/app/_actions/ai/getUserAPIKey";
   import type { LLMProvider } from "@/lib/llm/client";
   import logger from "@/lib/logger";
   ```

3. **GenerateCardsOptions インターフェース定義**
   ```typescript
   interface GenerateCardsOptions {
     provider?: LLMProvider;
     model?: string;
   }
   ```

4. **関数シグネチャ修正**
   ```typescript
   export async function generateRawCardsFromPageContent(
     pageContentTiptap: Json | null,
     options?: GenerateCardsOptions,  // ← 追加
   ): Promise<{ ... }>
   ```

5. **getUserAPIKey 統合**
   ```typescript
   // Provider を決定
   const provider = (options?.provider || "google") as LLMProvider;

   logger.info(
     { provider, pageTextLength: pageText.length },
     "Starting card generation from page content",
   );

   // ユーザーAPIキーを取得
   const apiKey = await getUserAPIKey(provider);

   logger.info(
     { provider, hasApiKey: !!apiKey },
     "API key retrieved for card generation from page",
   );
   ```

6. **モデル対応**
   ```typescript
   const model = options?.model || "gemini-2.5-flash";

   logger.info(
     { provider, model },
     "Calling LLM API for card generation from page",
   );
   ```

7. **エラーログ追加**
   ```typescript
   } catch (error: unknown) {
     logger.error(
       {
         provider,
         error: error instanceof Error ? error.message : String(error),
       },
       "Failed to generate cards from page content",
     );
     // ...
   }
   ```

**既存機能との互換性:**
- `options` パラメータはオプショナル（省略可能）
- 既存の呼び出し元（generate-cards-form.tsx）は修正不要
- デフォルトプロバイダーは "google"

---

### 3. テストファイル作成

**ファイル:** `app/_actions/__tests__/generateCardsFromPage.test.ts`

**実装内容:**

- **Test Cases:** 19テストケース（TC-001～TC-015をカバー）
- **Helper Functions:**
  - `createMockTiptapContent()` - Tiptap JSON モック作成
  - `createMockGeminiResponse()` - Gemini API レスポンスモック作成

- **Mock Setup:**
  - `vi.mock("@/lib/gemini/client")` - geminiClient を早期モック（環境変数チェック回避）
  - `vi.mock("@/app/_actions/ai/getUserAPIKey")` - getUserAPIKey モック
  - `vi.mock("@/lib/logger")` - logger モック

**主要テストケース:**

1. **正常系（TC-001, TC-002, TC-003）**
   - Google, OpenAI, Anthropic プロバイダーでのカード生成
   - デフォルトプロバイダー（google）の動作確認

2. **エラーハンドリング（TC-004, TC-006, TC-007, TC-008）**
   - 空のページコンテンツ
   - APIキー未設定
   - 不正なプロバイダー
   - LLM API呼び出し失敗（タイムアウト、ネットワークエラー）

3. **JSON処理（TC-009, TC-010, TC-011, TC-012, TC-013）**
   - JSON解析失敗
   - コードフェンス抽出
   - フォールバック抽出
   - 空の候補
   - カード0件生成

4. **高度な機能（TC-005, TC-014, TC-015）**
   - ユーザーAPIキー優先
   - カスタムモデル指定
   - 複雑なTiptap構造からのテキスト抽出

---

## テスト結果

### Phase 1.1 テスト

```bash
$ bun run test -- app/_actions/__tests__/generateCardsFromPage.test.ts
```

**結果:** ✅ **19/19 PASS** (100%)

```
✓ TC-001: Basic card generation with Google Gemini
  ✓ should generate cards from page content using Google provider
  ✓ should use default provider (google) when not specified
✓ TC-002: Card generation with OpenAI provider
  ✓ should call getUserAPIKey with openai provider
✓ TC-003: Card generation with Anthropic provider
  ✓ should call getUserAPIKey with anthropic provider
✓ TC-004: Empty page content error handling
  ✓ should return error when page content is null
  ✓ should return error when Tiptap content has no text
✓ TC-005: User API key priority
  ✓ should prioritize user-configured API key
✓ TC-006: API key not configured error
  ✓ should throw error when API key is not configured
✓ TC-007: Invalid provider error
  ✓ should throw error for invalid provider
✓ TC-008: LLM API call failure
  ✓ should handle API timeout error
  ✓ should handle network error
✓ TC-009: JSON parsing failure
  ✓ should handle invalid JSON response
✓ TC-010: Code fence JSON extraction
  ✓ should extract JSON from code fence
✓ TC-011: JSON array fallback extraction
  ✓ should extract JSON array without code fence
✓ TC-012: Empty candidates error
  ✓ should handle empty candidates response
✓ TC-013: Zero cards generated error
  ✓ should return error when LLM returns empty array
✓ TC-014: Custom model specification
  ✓ should use custom model when specified
  ✓ should use default model when not specified
✓ TC-015: Complex Tiptap text extraction
  ✓ should extract text from multi-paragraph content

Test Files  1 passed (1)
     Tests  19 passed (19)
  Duration  897ms
```

### ビルド検証

```bash
$ bun run build
```

**結果:** ✅ **Success**

```
✓ Compiled successfully in 16.0s
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (42/42)
✓ Collecting build traces
✓ Finalizing page optimization
```

---

## 変更ファイル一覧

| ファイル | 変更内容 | 備考 |
|---------|---------|------|
| `app/_actions/generateCardsFromPage.spec.md` | 新規作成 | 大規模仕様書（R-001~R-008, TC-001~TC-015） |
| `app/_actions/generateCardsFromPage.ts` | getUserAPIKey統合、options追加、logging追加 | +50行 |
| `app/_actions/__tests__/generateCardsFromPage.test.ts` | 新規作成（19テストケース） | 包括的テストスイート（19ケース） |

---

## 依存関係の影響

### 親コンポーネント（使用先）

- `components/pages/generate-cards/generate-cards-form.tsx` - **修正不要**
  - `options` パラメータはオプショナル
  - 既存の呼び出しは引き続き動作

### 依存コンポーネント（依存先）

- `app/_actions/ai/getUserAPIKey.ts` - Phase 0.1~0.4で実装済み（12/12 tests PASS）
- `lib/gemini/client.ts` - 既存実装
- `lib/logger.ts` - 既存実装

---

## Phase 1.1 で実装した機能

### ✅ 完了内容

1. **マルチプロバイダー対応**
   - Google Gemini（デフォルト）
   - OpenAI（将来対応予定）
   - Anthropic（将来対応予定）

2. **ユーザーAPIキー優先**
   - ユーザーが設定したAPIキーを最優先
   - 環境変数へのフォールバック
   - APIキー未設定時の適切なエラー

3. **Structured Logging**
   - カード生成開始時のログ
   - API呼び出し前のログ
   - エラー発生時の詳細ログ
   - センシティブ情報の除外

4. **包括的なエラーハンドリング**
   - 空のページコンテンツ
   - APIキー未設定
   - LLM API呼び出し失敗
   - JSON解析失敗
   - 空の候補
   - カード0件生成

5. **後方互換性**
   - 既存コード修正不要
   - `options` パラメータはオプショナル

---

## 学び・気づき

### 1. Tiptap JSONの柔軟性

Tiptap JSON構造は非常に柔軟で、以下のような複雑なコンテンツも正しく抽出可能：

- 複数段落
- 見出し
- リスト
- 引用
- コードブロック

`extractTextFromTiptapNode()` の再帰的な実装により、深いネストも対応可能。

### 2. geminiClient Mock の早期設定

geminiClient は環境変数 `GEMINI_API_KEY` をインポート時にチェックするため、テストファイルで以下が必要：

```typescript
vi.mock("@/lib/gemini/client", () => ({
  geminiClient: {
    models: {
      generateContent: vi.fn(),
    },
  },
}));
```

これにより環境変数チェックを回避し、テストが実行可能になる。

### 3. JSON パース処理の堅牢性

LLM（特にGemini）は、以下のような多様な形式でJSONを返すため、柔軟なパース処理が必要：

- コードフェンス付き: \`\`\`json ... \`\`\`
- コードフェンスなし: \`\`\` ... \`\`\`
- プレーンテキスト内: "ここにJSON: [...] です"

実装では、コードフェンス抽出 → フォールバック抽出の2段階で対応。

### 4. Phase 1.0との一貫性

Phase 1.0（generateCards統合）と同じパターンを適用することで、実装が統一され、保守性が向上：

- 同じ GenerateCardsOptions インターフェース
- 同じ getUserAPIKey 統合パターン
- 同じ logger 呼び出しパターン
- 同じエラーハンドリングパターン

---

## 次の作業予定

### Phase 1.2 以降の候補

#### Option A: 残りの AI Server Actions統合

Phase 1 計画書（`docs/03_plans/phase-1-ai-integration/20251101_01_detailed-implementation-plan.md`）に記載された残りの統合：

1. **Day 4: `generateQuestionsFromPage`**
   - クイズ生成機能の統合
   - 既存の使用先: `pages/generate-quiz-form.tsx`
   - 推定工数: 1時間

2. **Day 5: その他のAI機能**
   - 画像OCR関連（`use-image-ocr.ts`）
   - PDF処理関連（`use-pdf-processing.ts`）

#### Option B: Phase 2.0（LLM Client抽象化）

より高度な統合レイヤーの構築：

- OpenAI/Anthropic完全対応
- `lib/llm/client.ts` の統合クライアント実装
- プロバイダー間の透過的な切り替え

#### 推奨: Option A（Day 4から継続）

理由:
- Phase 1 を完全に完了させることで、マイルストーンが明確
- 既存パターンの繰り返しで効率的
- Phase 2.0 は Phase 1 完了後に全体最適化として実施

---

## Phase 1.1 完了宣言

✅ **Phase 1.1（generateCardsFromPage統合）が正常に完了しました。**

**統計:**
- 仕様書: R-001~R-008, TC-001~TC-015
- 実装修正: +50行
- テスト: 19/19 PASS (100%)
- ビルド: Success
- 後方互換性: ✅ 維持

**次のステップ:**
Phase 1.2 以降の実装を継続します。

---

## 関連ドキュメント

- **仕様書:** `app/_actions/generateCardsFromPage.spec.md`
- **実装:** `app/_actions/generateCardsFromPage.ts`
- **テスト:** `app/_actions/__tests__/generateCardsFromPage.test.ts`
- **Phase 1計画:** `docs/03_plans/phase-1-ai-integration/20251101_01_detailed-implementation-plan.md`
- **Phase 0完了ログ:** `docs/05_logs/2025_11/20251101/05_phase-0-completion.md`
- **Phase 1.0完了ログ:** `docs/05_logs/2025_11/20251102/09_generatecards-integration.md`

---

**最終更新:** 2025-11-02
**Phase:** 1.1
**ステータス:** ✅ 完了
