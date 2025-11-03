# Phase 1.3: Practice Generate Route getUserAPIKey Integration

**日付**: 2025-11-03
**担当**: AI (Grok Code Fast 1.5) + 開発者
**フェーズ**: Phase 1.3 - Practice Generate Route統合

---

## 概要

`app/api/practice/generate/route.ts` に、ユーザーが選択したLLMプロバイダー（Google Gemini, OpenAI, Anthropic）とモデルを指定できる機能を追加しました。

これにより、フロントエンドから `provider` と `model` パラメータを受け取り、ユーザーが設定したAPIキーを使用して練習問題を生成できるようになります。

---

## 実施した作業

### 1. 仕様書作成
- ✅ **ファイル**: `app/api/practice/generate/route.spec.md` (新規作成)
- **内容**: 
  - 要件定義（R-001～R-006）
  - リクエスト/レスポンス仕様
  - テストケース定義（TC-001～TC-012）
  - 実装ノート（バリデーション順序、エラーハンドリング、ロギング）
- **サイズ**: ~600行

### 2. 実装変更（app/api/practice/generate/route.ts）
- ✅ **DEPENDENCY MAP追加**:
  ```typescript
  /**
   * DEPENDENCY MAP:
   *
   * Parents (使用先):
   *   ├─ components/practice/* (練習問題UI)
   *   └─ app/(protected)/practice/page.tsx
   *
   * Dependencies (依存先):
   *   ├─ lib/gemini.ts (generateQuestions)
   *   ├─ lib/supabase/server.ts (createClient)
   *   ├─ lib/logger.ts (logger)
   *   └─ app/_actions/ai/getUserAPIKey.ts (LLMProvider型)
   */
  ```

- ✅ **インターフェース追加**:
  ```typescript
  interface GeneratePracticeRequest {
    cardIds: string[];
    type: QuestionType;
    provider?: LLMProvider;
    model?: string;
  }
  ```

- ✅ **バリデーション強化**:
  - cardIds と type の必須チェック
  - cardIds が空配列でないかチェック
  - provider が有効な値かチェック（google/openai/anthropic）

- ✅ **generateQuestions呼び出し修正**:
  ```typescript
  const qData = await generateQuestions(
    card.front_content as string,
    card.back_content as string,
    type as QuestionType,
    "normal", // difficulty
    provider || model ? { provider, model } : undefined,
  );
  ```

- ✅ **ロギング統合**:
  - リクエスト開始時: cardCount, type, provider, model
  - 各カード処理開始時: cardId, provider
  - 処理完了時: cardCount
  - エラー時: cardIds, type, provider, error

### 3. テストコード作成
- ✅ **ファイル**: `app/api/practice/generate/__tests__/route.test.ts` (新規作成)
- **テストケース数**: 12
- **カバー範囲**:
  - TC-001: 基本的な問題生成（デフォルトプロバイダー）
  - TC-002: Googleプロバイダー指定
  - TC-003: OpenAIプロバイダー指定
  - TC-004: Anthropicプロバイダー指定
  - TC-005: カスタムモデル指定
  - TC-006: バリデーションエラー（cardIds未指定）
  - TC-007: バリデーションエラー（type未指定）
  - TC-008: バリデーションエラー（空のcardIds）
  - TC-009: バリデーションエラー（不正なprovider）
  - TC-010: APIキー未設定エラー
  - TC-011: データベースエラー
  - TC-012: LLM API呼び出しエラー

---

## 変更ファイル

| ファイルパス | 変更内容 | ステータス |
|-------------|---------|-----------|
| `app/api/practice/generate/route.spec.md` | 新規作成（要件・テスト定義） | ✅ 完了 |
| `app/api/practice/generate/route.ts` | provider/model統合、バリデーション強化、logging追加 | ✅ 完了 |
| `app/api/practice/generate/__tests__/route.test.ts` | 12テストケース実装 | ✅ 完了 |

---

## テスト結果

### 最終結果
```
✅ 12/12 tests PASS

Test Files  1 passed (1)
     Tests  12 passed (12)
  Duration  764ms
```

### テストカバレッジ
- ✅ 基本的な問題生成（3つの問題タイプ）
- ✅ 3つのプロバイダー対応（Google, OpenAI, Anthropic）
- ✅ カスタムモデル指定
- ✅ 4種類のバリデーションエラー
- ✅ 3種類のエラーハンドリング（APIキー、DB、LLM API）

---

## 主要な実装詳細

### 1. リクエストボディの型定義

```typescript
interface GeneratePracticeRequest {
  cardIds: string[];        // 必須: カードIDの配列
  type: QuestionType;       // 必須: "flashcard" | "multiple_choice" | "cloze"
  provider?: LLMProvider;   // オプション: "google" | "openai" | "anthropic"
  model?: string;           // オプション: モデル名（例: "gpt-4"）
}
```

### 2. バリデーション順序

```typescript
// 1. 必須パラメータチェック
if (!cardIds || !type) {
  return NextResponse.json(
    { error: "cardIds and type are required" },
    { status: 400 }
  );
}

// 2. 空配列チェック
if (cardIds.length === 0) {
  return NextResponse.json(
    { error: "cardIds must not be empty" },
    { status: 400 }
  );
}

// 3. プロバイダー妥当性チェック
if (provider && !["google", "openai", "anthropic"].includes(provider)) {
  return NextResponse.json(
    { error: "Invalid provider. Must be one of: google, openai, anthropic" },
    { status: 400 }
  );
}
```

### 3. generateQuestions呼び出しパターン

```typescript
const qData = await generateQuestions(
  card.front_content as string,
  card.back_content as string,
  type as QuestionType,
  "normal", // difficulty
  provider || model ? { provider, model } : undefined, // optionsは条件付きで渡す
);
```

**重要**: `provider` または `model` が指定されている場合のみ options オブジェクトを渡します（後方互換性のため）

### 4. エラーハンドリング

```typescript
catch (err: unknown) {
  logger.error(
    {
      cardIds,
      type,
      provider: provider || "google",
      error: err instanceof Error ? err.message : String(err),
    },
    "Failed to generate practice questions"
  );

  if (err instanceof Error) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  return NextResponse.json(
    { error: "An unknown error occurred" },
    { status: 500 }
  );
}
```

### 5. ロギング戦略

```typescript
// リクエスト開始
logger.info(
  {
    cardCount: cardIds.length,
    type,
    provider: provider || "google",
    model: model || "default",
  },
  "Starting practice question generation"
);

// 各カード処理
logger.info(
  { cardId: card.id, provider: provider || "google" },
  "Generating question for card"
);

// 処理完了
logger.info(
  { cardCount: questions.length },
  "Practice question generation completed"
);
```

---

## 後方互換性

既存のフロントエンドコード（provider/model未指定）は引き続き動作します：

```typescript
// ✅ 既存コード（後方互換）
const response = await fetch("/api/practice/generate", {
  method: "POST",
  body: JSON.stringify({
    cardIds: ["card-1"],
    type: "flashcard",
  }),
});

// ✅ 新しいコード（provider指定）
const response = await fetch("/api/practice/generate", {
  method: "POST",
  body: JSON.stringify({
    cardIds: ["card-1"],
    type: "flashcard",
    provider: "openai",
    model: "gpt-4",
  }),
});
```

---

## 影響範囲

### 使用先（Parents）
以下のコンポーネントは `/api/practice/generate` を使用しています：

1. **components/practice/\*** (練習問題UI)
   - 影響: フロントエンドから provider を選択可能にする拡張が可能

2. **app/(protected)/practice/page.tsx**
   - 影響: 練習ページでプロバイダー選択UIを追加可能

**対応方針**: 現在はバックエンドのみの対応。次のフェーズでフロントエンドUIを追加予定。

---

## 学び・気づき

### 1. スコープの管理
- `try-catch` ブロック内で宣言した変数は、`catch` ブロックでアクセス不可
- エラーログに必要な変数は、`try` の外で宣言する必要がある
```typescript
// ✅ Good
let cardIds: string[] | undefined;
try {
  ({ cardIds, ... } = await request.json());
  // ...
} catch (err) {
  logger.error({ cardIds, ... }); // アクセス可能
}
```

### 2. Supabaseモックの方法
- `then` メソッドを直接実装するのはlint errorになる
- `Promise.resolve()` を返すことで、`.then()` が自動的に使用可能
```typescript
// ❌ Bad
{
  in: () => ({
    then: (callback) => callback({ data, error }),
  }),
}

// ✅ Good
{
  in: () => Promise.resolve({ data, error }),
}
```

### 3. 早期モックの重要性
- `geminiClient` は module レベルで環境変数チェックを実行
- テストファイルの**最上部**でモックしないとエラーになる
```typescript
// ✅ 最上部でモック
vi.mock("@/lib/gemini/client", () => ({ ... }));

// その後に他のモックとimport
vi.mock("@/lib/gemini");
import { POST } from "../route";
```

### 4. 条件付きoptionsパラメータ
- 後方互換性のため、`provider` または `model` が指定されている場合のみ options を渡す
- これにより、既存の呼び出しコードは影響を受けない

---

## 次回の作業

### Phase 1.4（予定）
次は他のAPI routes（例: `/api/cards/generate`）への拡張、またはフロントエンドUIでのprovider選択実装：

#### オプション A: フロントエンドUI対応
1. **設定画面でのプロバイダー選択UI**
   - 場所: `app/(protected)/settings/page.tsx`
   - 内容: provider選択ドロップダウン、モデル入力フィールド
   - 保存: localStorage または Supabase user preferences

2. **練習ページでのプロバイダー選択**
   - 場所: `app/(protected)/practice/page.tsx`
   - 内容: 問題生成時にproviderを指定

#### オプション B: 他のAPI routes統合
1. **カード生成API**
   - 場所: `app/api/cards/generate/route.ts`
   - 内容: generateCards に provider/model パラメータ追加

2. **ページ情報生成API**
   - 場所: `app/api/pages/info/route.ts`
   - 内容: generatePageInfo に provider/model パラメータ追加

---

## 関連ドキュメント

- **仕様書**: `app/api/practice/generate/route.spec.md`
- **依存関数仕様**: `lib/gemini.spec.md`
- **実装計画**: `docs/03_plans/ai-integration/phase1-implementation-plan.md`
- **前フェーズ**: `docs/05_logs/2025_11/20251102/11_generatequestions-integration.md`

---

## Phase 1.3 完了宣言

✅ **Phase 1.3 完了**

- ✅ 仕様書作成（route.spec.md）
- ✅ 実装変更（provider/model統合、バリデーション、logging）
- ✅ テストコード作成（12/12 PASS）
- ✅ 作業ログ作成

**累計テスト結果**: 
- Phase 0.1-0.4: 12/12 PASS
- Phase 0.5: 51/51 PASS
- Phase 1.0 Day 1-2: 12/12 PASS
- Phase 1.0 Day 3: 14/14 PASS
- Phase 1.1: 19/19 PASS
- Phase 1.2: 17/17 PASS
- **Phase 1.3: 12/12 PASS** ← NEW
- **合計: 137/137 tests PASS** 🎉

---

**作成日**: 2025-11-03
**最終更新**: 2025-11-03
