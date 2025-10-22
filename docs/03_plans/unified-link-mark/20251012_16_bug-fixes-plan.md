# UnifiedLinkMark バグ修正計画書

**作成日**: 2025-10-12  
**カテゴリ**: 実装計画  
**対象機能**: UnifiedLinkMark - バグ修正と機能改善  
**ステータス**: 計画中

---

## エグゼクティブサマリー

タグリンク機能とサジェスト UI の実装完了後、以下の問題が発見されました。本ドキュメントはこれらの問題の修正計画を記述します。

### 発見された問題

1. 🔴 **リンク解決が完了しない**: pending 状態のままになり、リンク先ページへの遷移ができない
2. 🔴 **既存データが表示されない**: エディタを開くと白紙で表示される
3. 🟡 **空クエリでサジェストが表示されない**: `[` や `#` だけ入力しても候補が出ない

---

## 目次

1. [問題の詳細分析](#問題の詳細分析)
2. [修正アプローチ](#修正アプローチ)
3. [実装計画](#実装計画)
4. [テスト戦略](#テスト戦略)
5. [リスク管理](#リスク管理)

---

## 1. 問題の詳細分析

### 問題 1: リンク解決が完了しない 🔴

#### 現象

- ユーザーが `[ページタイトル]` や `#タグ` を入力
- リンクマークは作成されるが、pending 状態のまま
- `exists` や `missing` に遷移しない
- クリックしてもページ遷移しない

#### 推定原因

**原因 A: キー正規化の不一致**

```typescript
// resolver-queue.ts (Line 92)
const exact = results.find((r) => normalizeTitleToKey(r.title) === key);
```

**問題点**:

- `normalizeTitleToKey(r.title)` とクエリの `key` が一致しない可能性
- タグページの場合、DB の title が `#タグ名` か `タグ名` か不明
- 正規化関数が `#` を削除するため、フォーマットによっては一致しない

**例**:

```typescript
// ケース1: DBのtitleが "#JavaScript"
normalizeTitleToKey("#JavaScript"); // => "javascript"
key = normalizeTitleToKey("JavaScript"); // => "javascript"
// ✅ 一致する

// ケース2: DBのtitleが "JavaScript"
normalizeTitleToKey("JavaScript"); // => "javascript"
key = normalizeTitleToKey("JavaScript"); // => "javascript"
// ✅ 一致する

// ケース3: 検索結果に含まれない
// ❌ 一致しない
```

**原因 B: 検索クエリの問題**

```typescript
// resolver-queue.ts (Line 80)
const results = await searchPagesWithRetry(key);
```

**問題点**:

- `searchPages(key)` に渡される `key` が正規化済み
- DB 検索で `ILIKE '%javascript%'` となり、正しく検索できない可能性
- 元のタイトル（`#JavaScript` や `JavaScript`）で検索すべき

**原因 C: キャッシュの問題**

```typescript
// resolver-queue.ts (Line 75-82)
const cachedPageId = getCachedPageId(key);
if (cachedPageId) {
  updateMarkState(editor, markId, {
    state: "exists",
    exists: true,
    pageId: cachedPageId,
    href: `/pages/${cachedPageId}`,
  });
  return;
}
```

**問題点**:

- 古いキャッシュが残っている可能性
- ページが削除されてもキャッシュが残る
- キャッシュキーの正規化が不適切

---

### 問題 2: 既存データが表示されない 🔴

#### 現象

- 既存のページをエディタで開く
- コンテンツが白紙で表示される
- リンクマークが消える
- コンソールにエラーが出る可能性

#### 推定原因

**原因 A: parseHTML 関数の問題**

```typescript
// rendering.ts (Line 42-64)
{
  tag: "a[data-page-id]:not([data-variant])",
  getAttrs: (node: HTMLElement | string) => {
    if (typeof node === "string") return false;
    // ... 変換ロジック
  }
}
```

**問題点**:

- レガシーフォーマット（PageLinkMark）からの変換が不完全
- 必要な属性が欠落している
- `data-mark-id` や `data-state` が設定されていない
- エラーが発生してもフォールバックがない

**原因 B: データ移行の問題**

```typescript
// 既存データのフォーマット例
<a data-page-id="abc-123" data-page-title="React入門">React入門</a>

// 期待される新フォーマット
<a
  data-variant="bracket"
  data-raw="React入門"
  data-text="React入門"
  data-key="react入門"
  data-page-id="abc-123"
  data-href="/pages/abc-123"
  data-state="exists"
  data-exists="true"
  data-mark-id="unifiedlink-..."
>React入門</a>
```

**問題点**:

- すべての必須属性が設定されていない
- `data-mark-id` が生成されていない
- `data-state` が設定されていない

**原因 C: エディタ初期化の問題**

```typescript
// usePageEditorLogic.ts
const editor = useEditor({
  extensions: [
    UnifiedLinkMark,
    // ...
  ],
  content: initialContent, // ← ここでparseHTMLが呼ばれる
});
```

**問題点**:

- parseHTML 時にエラーが発生
- エラーハンドリングがない
- コンテンツ全体が読み込まれない

---

### 問題 3: 空クエリでサジェストが表示されない 🟡

#### 現象

- `[` だけ入力してもサジェストが出ない
- `#` だけ入力してもサジェストが出ない
- 1 文字以上入力すると表示される

#### 現在の実装

```typescript
// suggestion-plugin.ts (Line 148-178)
if (query.length > 0) {
  // サジェスト表示ロジック
} else if (state.active) {
  // サジェストクリア
}
```

**問題点**:

- `query.length === 0` の場合は即座にクリア
- ユーザーが候補を見る機会がない
- UX が低下

#### 期待される動作

```
ユーザー入力: [
   ↓
サジェスト表示:
- 最近編集したページ
- よく使われるページ
- すべてのページ（limit 10）

ユーザー入力: #
   ↓
サジェスト表示:
- 最近使用したタグ
- 人気のタグ
- すべてのタグ（limit 10）
```

---

## 2. 修正アプローチ

### アプローチ 1: デバッグファーストアプローチ

**方針**: まず実際の動作を確認し、仮説を検証する

#### Phase 1.1: ログ追加

```typescript
// resolver-queue.ts
console.log("[Resolver] Searching for key:", key);
console.log("[Resolver] Search results:", results);
console.log(
  "[Resolver] Normalized titles:",
  results.map((r) => ({
    original: r.title,
    normalized: normalizeTitleToKey(r.title),
  }))
);
console.log("[Resolver] Match found:", exact);
```

#### Phase 1.2: エディタ初期化のログ

```typescript
// usePageEditorLogic.ts
console.log("[Editor] Initial content:", initialContent);
console.log("[Editor] Parsed content:", editor?.getJSON());
```

#### Phase 1.3: parseHTML のログ

```typescript
// rendering.ts
console.log("[ParseHTML] Node:", node);
console.log("[ParseHTML] Attributes:", node.dataset);
console.log("[ParseHTML] Converted attrs:", attrs);
```

---

### アプローチ 2: 段階的修正

#### Phase 2.1: リンク解決の修正

**修正 1: 柔軟な一致判定**

```typescript
// resolver-queue.ts
private async processItem(item: ResolverQueueItem): Promise<void> {
  const { key, markId, editor, variant = "bracket" } = item;

  try {
    // ... 既存のコード

    // Execute search with original raw text
    const results = await searchPagesWithRetry(item.raw || key);

    // Flexible matching logic
    const exact = results.find((r) => {
      const normalizedTitle = normalizeTitleToKey(r.title);

      // Try exact match first
      if (normalizedTitle === key) return true;

      // For tags, try with/without # prefix
      if (variant === "tag") {
        const withHash = normalizeTitleToKey(`#${r.title}`);
        const withoutHash = normalizedTitle.replace(/^#/, '');
        return withoutHash === key || withHash === key;
      }

      return false;
    });

    // ... 残りのコード
  } catch (error) {
    // ... エラーハンドリング
  }
}
```

**修正 2: 検索クエリの改善**

```typescript
// ResolverQueueItem型を拡張
interface ResolverQueueItem {
  key: string;
  raw: string; // 追加: 正規化前のテキスト
  markId: string;
  editor: Editor;
  variant?: "bracket" | "tag";
}

// enqueueResolve呼び出し時にrawを渡す
enqueueResolve({
  key,
  raw, // 追加
  markId,
  editor: context.editor,
  variant: "bracket",
});
```

**修正 3: キャッシュの改善**

```typescript
// unilink/cache.ts (新規作成)
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  pageId: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedPageId(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check expiration
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.pageId;
}

export function setCachedPageId(key: string, pageId: string): void {
  cache.set(key, {
    pageId,
    timestamp: Date.now(),
  });
}

export function clearCache(): void {
  cache.clear();
}
```

---

#### Phase 2.2: 既存データ表示の修正

**修正 1: parseHTML 関数の改善**

```typescript
// rendering.ts
{
  tag: "a[data-page-id]:not([data-variant])",
  getAttrs: (node: HTMLElement | string) => {
    if (typeof node === "string") return false;

    // Console log for debugging
    console.log('[ParseHTML] Legacy format detected:', node.outerHTML);

    try {
      const pageId = node.dataset.pageId;
      const pageTitle = node.dataset.pageTitle || node.textContent || "";
      const raw = pageTitle;
      const text = pageTitle;
      const key = normalizeTitleToKey(pageTitle);
      const markId = generateMarkId();

      // Determine if it's a tag
      const isTag = pageTitle.startsWith("#");
      const variant = isTag ? "tag" : "bracket";

      const attrs: UnifiedLinkAttributes = {
        variant,
        raw: isTag ? pageTitle.slice(1) : pageTitle,
        text: pageTitle,
        key,
        pageId,
        href: `/pages/${pageId}`,
        state: "exists",
        exists: true,
        markId,
      };

      console.log('[ParseHTML] Converted to UnifiedLink:', attrs);

      return attrs;
    } catch (error) {
      console.error('[ParseHTML] Conversion error:', error);
      return false; // Skip this node
    }
  }
}
```

**修正 2: エラーハンドリングの追加**

```typescript
// usePageEditorLogic.ts
const editor = useEditor({
  extensions: [
    /* ... */
  ],
  content: initialContent,
  onCreate: ({ editor }) => {
    console.log("[Editor] Created successfully");
    console.log("[Editor] Content:", editor.getJSON());
  },
  onError: ({ editor, error }) => {
    console.error("[Editor] Error:", error);
    // Display error to user
    toast.error("エディタの初期化に失敗しました");
  },
});
```

---

#### Phase 2.3: 空クエリサジェストの実装

**修正 1: searchPages 関数の拡張**

```typescript
// lib/utils/searchPages.ts
export async function searchPages(
  query: string,
  options?: {
    limit?: number;
    emptyQuery?: boolean;
  }
): Promise<Array<{ id: string; title: string }>> {
  const supabase = createClient();
  const limit = options?.limit || 5;

  if (!query && options?.emptyQuery) {
    // Return recent pages when query is empty
    const { data, error } = await supabase
      .from("pages")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("searchPages (empty) error:", error);
      return [];
    }
    return (data ?? []).map(({ id, title }) => ({ id, title }));
  }

  // Existing search logic
  const { data, error } = await supabase
    .from("pages")
    .select("id, title, updated_at")
    .ilike("title", `%${query}%`)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("searchPages error:", error);
    return [];
  }
  return (data ?? []).map(({ id, title }) => ({ id, title }));
}
```

**修正 2: suggestion-plugin.ts の修正**

```typescript
// suggestion-plugin.ts
if (detectedRange) {
  const { from: rangeFrom, to: rangeTo, query, variant } = detectedRange;

  // Show suggestions even for empty query
  const shouldShowSuggestions = true; // Always show when pattern detected

  if (shouldShowSuggestions) {
    // Check if state needs update
    if (
      !state.active ||
      !state.range ||
      state.range.from !== rangeFrom ||
      state.range.to !== rangeTo ||
      state.query !== query
    ) {
      // Clear existing timeout
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId);
      }

      // Show loading state immediately
      editorView.dispatch(
        editorView.state.tr.setMeta(suggestionPluginKey, {
          active: true,
          range: { from: rangeFrom, to: rangeTo },
          query,
          results: [],
          selectedIndex: 0,
          variant,
          loading: true,
        } satisfies UnifiedLinkSuggestionState)
      );

      // Debounced search (300ms)
      debounceTimeoutId = window.setTimeout(async () => {
        const results = await searchPages(query, {
          emptyQuery: query.length === 0, // Allow empty query
        });
        editorView.dispatch(
          editorView.state.tr.setMeta(suggestionPluginKey, {
            active: true,
            range: { from: rangeFrom, to: rangeTo },
            query,
            results,
            selectedIndex: 0,
            variant,
            loading: false,
          } satisfies UnifiedLinkSuggestionState)
        );
      }, 300);
    }
  }
}
```

---

## 3. 実装計画

### Phase 1: デバッグと調査（20 分）

#### Step 1.1: ログの追加

- [ ] `resolver-queue.ts` にログ追加
- [ ] `rendering.ts` にログ追加
- [ ] `usePageEditorLogic.ts` にログ追加

#### Step 1.2: 動作確認

- [ ] ブラウザでページを開く
- [ ] コンソールログを確認
- [ ] 実際のデータとロジックの動作を分析

#### Step 1.3: 問題の特定

- [ ] リンク解決が失敗する具体的な原因を特定
- [ ] 既存データが読み込まれない原因を特定

---

### Phase 2: リンク解決の修正（30 分）

#### Step 2.1: 型定義の拡張

- [ ] `ResolverQueueItem` に `raw` フィールドを追加
- [ ] 関連する型定義を更新

#### Step 2.2: 検索ロジックの修正

- [ ] `raw` テキストを使用した検索に変更
- [ ] 柔軟な一致判定の実装

#### Step 2.3: キャッシュの改善

- [ ] TTL 付きキャッシュの実装
- [ ] キャッシュクリア機能の追加

#### Step 2.4: InputRule の更新

- [ ] `bracket-rule.ts` で `raw` を渡すように修正
- [ ] `tag-rule.ts` で `raw` を渡すように修正

---

### Phase 3: 既存データ表示の修正（30 分）

#### Step 3.1: parseHTML 関数の改善

- [ ] より堅牢な属性パース処理
- [ ] エラーハンドリングの追加
- [ ] デバッグログの追加

#### Step 3.2: エディタ初期化の改善

- [ ] `onCreate` ハンドラでログ出力
- [ ] `onError` ハンドラで適切なエラー表示
- [ ] フォールバック処理の追加

#### Step 3.3: データ移行の確認

- [ ] 既存データのフォーマットを確認
- [ ] 必要に応じて再マイグレーション

---

### Phase 4: 空クエリサジェストの実装（20 分）

#### Step 4.1: searchPages 関数の拡張

- [ ] `emptyQuery` オプションの追加
- [ ] 最近更新されたページを返すロジック

#### Step 4.2: suggestion-plugin の修正

- [ ] 空クエリでもサジェストを表示
- [ ] `emptyQuery: true` で検索

#### Step 4.3: UI の調整

- [ ] 空クエリ時のヘッダーテキスト
- [ ] 「最近のページ」などのラベル表示

---

### Phase 5: 統合テストと検証（20 分）

#### Step 5.1: 手動テスト

- [ ] ブラケットリンク `[ページ]` の動作確認
- [ ] タグリンク `#タグ` の動作確認
- [ ] 既存ページの読み込み確認
- [ ] 空クエリサジェストの確認

#### Step 5.2: エッジケースのテスト

- [ ] 存在しないページへのリンク
- [ ] 特殊文字を含むタイトル
- [ ] 日本語タイトル
- [ ] 長いタイトル

#### Step 5.3: パフォーマンステスト

- [ ] 大量のリンクを含むページ
- [ ] サジェストの応答速度
- [ ] キャッシュの効果

---

## 4. テスト戦略

### 4.1 ユニットテスト

#### リンク解決のテスト

```typescript
describe("ResolverQueue", () => {
  it("should resolve bracket links correctly", async () => {
    // Test implementation
  });

  it("should resolve tag links correctly", async () => {
    // Test implementation
  });

  it("should handle tags with/without # prefix", async () => {
    // Test implementation
  });

  it("should use cache when available", async () => {
    // Test implementation
  });
});
```

#### parseHTML のテスト

```typescript
describe("parseHTML", () => {
  it("should parse legacy PageLinkMark format", () => {
    const html = '<a data-page-id="123" data-page-title="Test">Test</a>';
    // Test implementation
  });

  it("should handle tags correctly", () => {
    const html =
      '<a data-page-id="123" data-page-title="#JavaScript">JavaScript</a>';
    // Test implementation
  });

  it("should return false for invalid nodes", () => {
    // Test implementation
  });
});
```

---

### 4.2 統合テスト

#### シナリオ 1: 新規リンク作成

```gherkin
Given ユーザーがエディタを開いている
When ユーザーが "[React入門]" と入力する
Then リンクマークが作成される
And pending状態が表示される
And 数秒後にexists状態に遷移する
And クリックでページに遷移できる
```

#### シナリオ 2: 既存ページの読み込み

```gherkin
Given リンクを含むページが存在する
When ユーザーがそのページを開く
Then すべてのコンテンツが正しく表示される
And リンクが正しくレンダリングされる
And リンクがクリック可能である
```

#### シナリオ 3: 空クエリサジェスト

```gherkin
Given ユーザーがエディタを開いている
When ユーザーが "[" を入力する
Then サジェストが表示される
And 最近のページが候補として表示される
When ユーザーが候補を選択する
Then リンクが挿入される
```

---

## 5. リスク管理

### 5.1 リスク評価

| リスク                    | 確率 | 影響 | 優先度 | 対策                         |
| ------------------------- | ---- | ---- | ------ | ---------------------------- |
| DB スキーマが想定と異なる | 高   | 高   | 高     | まずクエリで確認             |
| 既存データが破損する      | 中   | 高   | 高     | バックアップ確認、段階的適用 |
| パフォーマンスが低下する  | 低   | 中   | 中     | キャッシュ・デバウンス維持   |
| 新たなバグが発生する      | 中   | 中   | 中     | 段階的実装、十分なテスト     |
| タイムライン超過          | 低   | 低   | 低     | Phase 単位で進捗確認         |

---

### 5.2 ロールバック計画

各 Phase の実装後、問題が発生した場合:

```bash
# 変更をコミットしてから次のPhaseに進む
git add .
git commit -m "feat: Phase N - 説明"

# 問題が発生した場合
git revert HEAD
# または
git reset --hard HEAD~1
```

---

## 6. 成功基準

### 6.1 必須条件

- [x] リンク解決が正しく動作する
  - pending → exists/missing に正しく遷移
  - クリックでページ遷移可能
- [x] 既存データが正しく表示される
  - すべてのコンテンツが読み込まれる
  - リンクが正しくレンダリングされる
- [x] 空クエリサジェストが動作する
  - `[` 入力時に候補表示
  - `#` 入力時に候補表示

### 6.2 パフォーマンス基準

- [ ] サジェスト表示: 300ms 以内
- [ ] リンク解決: 2 秒以内
- [ ] ページ読み込み: 1 秒以内

### 6.3 品質基準

- [ ] コンソールエラーがない
- [ ] メモリリークがない
- [ ] すべてのテストが成功

---

## 7. スケジュール

| Phase    | 作業内容             | 所要時間   | 担当 | 期限     |
| -------- | -------------------- | ---------- | ---- | -------- |
| Phase 1  | デバッグと調査       | 20 分      | Dev  | Day 1    |
| Phase 2  | リンク解決の修正     | 30 分      | Dev  | Day 1    |
| Phase 3  | 既存データ表示の修正 | 30 分      | Dev  | Day 1    |
| Phase 4  | 空クエリサジェスト   | 20 分      | Dev  | Day 1    |
| Phase 5  | 統合テスト           | 20 分      | Dev  | Day 1    |
| **合計** | **全体**             | **2 時間** | -    | **1 日** |

---

## 8. 次のステップ

### 8.1 実装開始前

1. **データベースの確認**

   ```sql
   -- タグページのフォーマット確認
   SELECT id, title FROM pages WHERE title LIKE '#%' LIMIT 10;

   -- すべてのページタイトルの確認
   SELECT id, title FROM pages ORDER BY updated_at DESC LIMIT 20;
   ```

2. **バックアップの確認**

   - 既存データのバックアップがあるか確認
   - テスト環境でまず試す

3. **チームへの共有**
   - 修正計画をレビュー
   - 懸念点の確認

### 8.2 実装中

- Phase 単位でコミット
- 各 Phase で動作確認
- 問題があれば即座にロールバック

### 8.3 実装後

- ドキュメントの更新
- 完了レポートの作成
- 次の改善点の洗い出し

---

## 9. 関連ドキュメント

### 実装計画

- [Phase 4 実装計画書](./20251012_15_phase4-implementation-plan.md)
- [UnifiedLinkMark リファクタリング計画](./20251011_08_refactoring-plan.md)

### 作業ログ

- [タグリンク機能完了レポート](../../../08_worklogs/2025_10/20251012/20251012_29_tag-feature-complete.md)
- [サジェスト UI 実装完了レポート](../../../08_worklogs/2025_10/20251012/20251012_30_suggestion-ui-implementation-complete.md)

### 調査レポート

- [タグリンク実装調査レポート](../../../07_research/2025_10/20251012/20251012_tag-link-implementation-investigation.md)

---

**作成者**: AI Development Assistant  
**作成日**: 2025-10-12  
**最終更新**: 2025-10-12  
**承認**: 未承認  
**ステータス**: 計画中 → 実装待ち
