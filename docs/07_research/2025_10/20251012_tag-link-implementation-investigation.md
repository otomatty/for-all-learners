# タグリンク機能 詳細調査レポート

**作成日**: 2025-10-12  
**カテゴリ**: 調査・研究  
**対象機能**: UnifiedLinkMark - タグリンク (`#tag`) 機能  
**ステータス**: 調査完了

---

## エグゼクティブサマリー

Phase 4 完了後、タグリンク機能の実装状況を詳細調査しました。結果、**基本実装は完了しているが、いくつかの問題と未実装機能が存在**することが判明しました。

### 重要な発見

1. ✅ **InputRule は実装済み**: `tag-rule.ts` でタグ検出が実装されている
2. ⚠️ **正規表現に問題**: 日本語タグが正しく検出されない可能性
3. ✅ **resolver-queue は対応済み**: `variant: "tag"` の処理が実装されている
4. ❌ **サジェスト機能未対応**: ブラケットリンクのみ対応
5. ✅ **searchPages は動作する**: タグページの検索は可能
6. ❓ **タグページのフォーマット不明**: title が `#タグ名` か `タグ名` か要確認

---

## 詳細調査結果

### 1. config.ts - パターン定義

**ファイル**: `lib/tiptap-extensions/unified-link-mark/config.ts`

```typescript
export const PATTERNS = {
  bracket: /\[([^\[\]]+)\]$/,
  tag: /\B#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\uAC00-\uD7AF]{1,50})$/,
  externalUrl: /^https?:\/\//,
} as const;
```

#### 評価

| 項目           | 状態        | 詳細                           |
| -------------- | ----------- | ------------------------------ |
| **日本語対応** | ✅ 実装済み | Unicode 範囲で日本語をカバー   |
| **境界検出**   | ⚠️ 問題あり | `\B` と `$` の組み合わせに課題 |
| **長さ制限**   | ✅ 適切     | 1-50 文字                      |

#### 問題点

**Pattern 1: 行末 `$` の制約**

```typescript
tag: /\B#([...]{1,50})$/;
//                      ^^
```

- `$` は行末（段落末）を意味
- **問題**: 文中のタグが検出されない
- **例**: `これは#タグです` → マッチしない

**Pattern 2: `\B` (非単語境界) の制約**

```typescript
tag: /\B#([...]{1,50})$/;
//     ^^
```

- `\B` は ASCII 文字の単語境界以外を意味
- **問題**: 日本語の後に `#` がある場合、予期しない動作
- **例**: `これは#タグ` → 動作が不安定

#### 推奨される修正

```typescript
tag: /(?:^|\s)#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\uAC00-\uD7AF]{1,50})(?=\s|$|[^\p{Letter}\p{Number}])/u,
```

**改善点**:

- `(?:^|\s)`: 行頭またはスペースの後
- `(?=\s|$|[...])`: スペース、行末、または記号の前（先読み）
- 文中のタグも検出可能
- 日本語対応の境界検出

---

### 2. tag-rule.ts - InputRule の実装

**ファイル**: `lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts`

```typescript
export function createTagInputRule(context: { editor: Editor; name: string }) {
  return new InputRule({
    find: PATTERNS.tag,
    handler: ({ state, match, range, chain }) => {
      if (isInCodeContext(state)) {
        return null;
      }

      const raw = match[1]; // "タグ名" from "#タグ名"
      const text = raw; // ⚠️ Display without #
      const key = normalizeTitleToKey(raw);
      const markId = generateMarkId();

      const attrs: UnifiedLinkAttributes = {
        variant: "tag",
        raw,
        text, // "タグ名"
        key, // "たぐめい" (normalized)
        pageId: null,
        href: "#",
        state: "pending",
        exists: false,
        markId,
      };

      // Apply mark and enqueue resolution
      chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent({
          type: "text",
          text: text, // ⚠️ # が表示されない
          marks: [{ type: context.name, attrs }],
        })
        .run();

      enqueueResolve({ key, markId, editor: context.editor, variant: "tag" });
    },
  });
}
```

#### 評価

| 項目               | 状態        | 詳細                              |
| ------------------ | ----------- | --------------------------------- |
| **InputRule 実装** | ✅ 完了     | PATTERNS.tag を使用               |
| **コード文脈抑制** | ✅ 実装済み | isInCodeContext で判定            |
| **マーク生成**     | ✅ 実装済み | UnifiedLinkAttributes 準拠        |
| **resolver 連携**  | ✅ 実装済み | enqueueResolve で解決キューに追加 |
| **表示テキスト**   | ⚠️ 問題あり | `#` が消える                      |

#### 問題点

**表示テキストから `#` が消える**

```typescript
const raw = match[1]; // "タグ名"
const text = raw; // "タグ名" (# なし)
```

**影響**:

- ユーザーが入力した `#タグ名` が `タグ名` として表示される
- タグであることが視覚的にわからない

#### 推奨される修正

```typescript
const raw = match[1]; // "タグ名"
const text = `#${raw}`; // "#タグ名" (# を含める)
const key = normalizeTitleToKey(raw); // "たぐめい" (# なしで正規化)
```

---

### 3. resolver-queue.ts - ページ解決ロジック

**ファイル**: `lib/tiptap-extensions/unified-link-mark/resolver-queue.ts`

```typescript
private async processItem(item: ResolverQueueItem): Promise<void> {
  const { key, markId, editor, variant = "bracket" } = item;

  try {
    // 1. Check cache
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

    // 2. Search pages
    const results = await searchPagesWithRetry(key);
    const exact = results.find((r) => normalizeTitleToKey(r.title) === key);

    if (exact) {
      setCachedPageId(key, exact.id);
      updateMarkState(editor, markId, {
        state: "exists",
        exists: true,
        pageId: exact.id,
        href: `/pages/${exact.id}`,
      });
    } else {
      updateMarkState(editor, markId, {
        state: "missing",
        exists: false,
        href: "#",
      });
    }
  } catch (error) {
    // Error handling
  }
}
```

#### 評価

| 項目               | 状態        | 詳細                            |
| ------------------ | ----------- | ------------------------------- |
| **variant 対応**   | ✅ 実装済み | `variant` パラメータを受け取る  |
| **キャッシュ機構** | ✅ 実装済み | getCachedPageId/setCachedPageId |
| **検索ロジック**   | ✅ 実装済み | searchPagesWithRetry で検索     |
| **完全一致検索**   | ✅ 実装済み | normalizeTitleToKey で比較      |
| **リトライ機構**   | ✅ 実装済み | 最大 2 回リトライ               |

#### 動作フロー

```
1. enqueueResolve({ key: "タグ名", variant: "tag" })
   ↓
2. getCachedPageId("タグ名") → キャッシュチェック
   ↓
3. searchPages("タグ名") → DB検索 (ILIKE '%タグ名%')
   ↓
4. 完全一致チェック: normalizeTitleToKey(title) === "たぐめい"
   ↓
5. updateMarkState → pending → exists/missing
```

**✅ タグリンクの解決は正しく動作する**

---

### 4. searchPages - データベース検索

**ファイル**: `lib/utils/searchPages.ts`

```typescript
export async function searchPages(
  query: string
): Promise<Array<{ id: string; title: string }>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pages")
    .select("id, title, updated_at")
    .ilike("title", `%${query}%`) // 部分一致
    .order("updated_at", { ascending: true })
    .limit(5);

  if (error) {
    console.error("searchPages error:", error);
    return [];
  }
  return (data ?? []).map(({ id, title }) => ({ id, title }));
}
```

#### 評価

| 項目               | 状態        | 詳細                                  |
| ------------------ | ----------- | ------------------------------------- |
| **検索方式**       | ✅ 部分一致 | ILIKE で大文字小文字区別なし          |
| **タグページ対応** | ✅ 可能     | title に `#` が含まれていても検索可能 |
| **ソート**         | ✅ 実装済み | updated_at でソート                   |
| **件数制限**       | ✅ 実装済み | 5 件まで                              |

#### タグページの検索動作

**Case 1: title が `#タグ名` の場合**

```typescript
searchPages("タグ名");
// SQL: WHERE title ILIKE '%タグ名%'
// Result: title = "#タグ名" → ✅ マッチする
```

**Case 2: title が `タグ名` の場合**

```typescript
searchPages("タグ名");
// SQL: WHERE title ILIKE '%タグ名%'
// Result: title = "タグ名" → ✅ マッチする
```

**Case 3: tag-rule.ts が `#` を含む key で検索する場合**

```typescript
searchPages("#タグ名");
// SQL: WHERE title ILIKE '%#タグ名%'
// Result: title = "#タグ名" → ✅ マッチする
// Result: title = "タグ名" → ❌ マッチしない
```

**結論**: `searchPages` はどちらのフォーマットでも動作するが、**key に `#` を含めるか否かで結果が変わる**

---

### 5. normalizeTitleToKey - キー正規化

**ファイル**: `lib/unilink/utils.ts` (推測)

```typescript
export function normalizeTitleToKey(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(
      /[^\p{Letter}\p{Number}\p{Mark}\p{Connector_Punctuation}\p{Ideographic}-]/gu,
      ""
    );
}
```

#### 動作テスト

```typescript
normalizeTitleToKey("#タグ名"); // => "タグ名" (# が削除される)
normalizeTitleToKey("タグ名"); // => "タグ名"
normalizeTitleToKey("#Tag Name"); // => "tag-name"
normalizeTitleToKey("Tag Name"); // => "tag-name"
```

#### 評価

| 項目             | 状態    | 詳細                     |
| ---------------- | ------- | ------------------------ |
| **記号削除**     | ✅ 動作 | `#` は削除される         |
| **小文字変換**   | ✅ 動作 | すべて小文字に           |
| **スペース処理** | ✅ 動作 | スペースは `-` に変換    |
| **日本語対応**   | ✅ 動作 | Unicode プロパティで対応 |

#### タグページの正規化動作

**シナリオ 1: タグページの title が `#タグ名`**

```typescript
// DB の title
const dbTitle = "#タグ名";
normalizeTitleToKey(dbTitle); // => "タグ名"

// tag-rule.ts の key (current)
const raw = "タグ名"; // match[1]
const key = normalizeTitleToKey(raw); // => "タグ名"

// 完全一致判定
normalizeTitleToKey(dbTitle) === key; // => true ✅
```

**シナリオ 2: タグページの title が `タグ名`**

```typescript
// DB の title
const dbTitle = "タグ名";
normalizeTitleToKey(dbTitle); // => "タグ名"

// tag-rule.ts の key (current)
const raw = "タグ名";
const key = normalizeTitleToKey(raw); // => "タグ名"

// 完全一致判定
normalizeTitleToKey(dbTitle) === key; // => true ✅
```

**結論**: **現在の実装は両方のフォーマットで動作する** ✅

---

### 6. suggestion-plugin.ts - サジェスト機能

**ファイル**: `lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts`

```typescript
// 現在のトリガーパターン
const openBracketIndex = text.lastIndexOf("[", posInPara - 1);

if (openBracketIndex !== -1) {
  // Find closing bracket or end of text
  const rest = text.slice(openBracketIndex + 1);
  const closeBracketIndex = rest.indexOf("]");
  const endInPara =
    closeBracketIndex === -1
      ? text.length
      : openBracketIndex + 1 + closeBracketIndex;

  // Check if cursor is within bracket range
  if (posInPara > openBracketIndex && posInPara <= endInPara) {
    const rangeFrom = paraStart + openBracketIndex + 1; // After '['
    const rangeTo = paraStart + endInPara; // Before ']' or end
    const query = text.slice(openBracketIndex + 1, endInPara);

    if (query.length > 0) {
      // Show suggestions
      const results = await searchPages(query);
      // ...
    }
  }
}
```

#### 評価

| 項目                     | 状態        | 詳細                |
| ------------------------ | ----------- | ------------------- |
| **ブラケットリンク対応** | ✅ 実装済み | `[query]` を検出    |
| **タグリンク対応**       | ❌ 未実装   | `#tag` を検出しない |
| **デバウンス**           | ✅ 実装済み | 300ms               |
| **キーボード操作**       | ✅ 実装済み | ↑↓Enter で選択      |

#### タグサジェストに必要な対応

**検出ロジックの追加**

```typescript
// 1. タグの検出
const hashIndex = text.lastIndexOf("#", posInPara - 1);

if (hashIndex !== -1) {
  // Find tag end (space or end of text)
  const rest = text.slice(hashIndex + 1);
  const spaceIndex = rest.search(/\s/);
  const endInPara =
    spaceIndex === -1 ? text.length : hashIndex + 1 + spaceIndex;

  // Check if cursor is within tag range
  if (posInPara > hashIndex && posInPara <= endInPara) {
    const rangeFrom = paraStart + hashIndex + 1; // After '#'
    const rangeTo = paraStart + endInPara; // Before space or end
    const query = text.slice(hashIndex + 1, endInPara);

    if (query.length > 0) {
      // Search tag pages
      const results = await searchPages(query);
      // Show suggestions
    }
  }
}
```

**選択時の処理**

```typescript
// タグサジェスト選択時
if (selectedPage) {
  const { from, to } = state.range;

  // Insert as tag mark
  chain()
    .deleteRange({ from: from - 1, to }) // Delete '#' and query
    .insertContent({
      type: "text",
      text: `#${selectedPage.title}`,
      marks: [
        {
          type: "unilink",
          attrs: {
            variant: "tag",
            raw: selectedPage.title,
            text: `#${selectedPage.title}`,
            key: normalizeTitleToKey(selectedPage.title),
            pageId: selectedPage.id,
            href: `/pages/${selectedPage.id}`,
            state: "exists",
            exists: true,
            markId: generateMarkId(),
          },
        },
      ],
    })
    .run();
}
```

---

### 7. データベーススキーマの確認

**確認が必要な点**:

1. **pages テーブルの構造**

   ```sql
   CREATE TABLE pages (
     id UUID PRIMARY KEY,
     title TEXT NOT NULL,
     content TEXT,
     updated_at TIMESTAMP,
     -- ...
   );
   ```

2. **タグページの title フォーマット**

   - `#タグ名` で保存されているか
   - `タグ名` で保存されているか

3. **既存のタグページの有無**
   ```sql
   SELECT id, title FROM pages WHERE title LIKE '#%';
   ```

**推奨されるアプローチ**:

- タグページの title は `#タグ名` で統一
- 検索時は `normalizeTitleToKey` で `#` を削除して比較
- 表示時は常に `#` を含める

---

## 問題点の整理

### 問題 1: PATTERNS.tag の正規表現 (中優先度)

**現状**:

```typescript
tag: /\B#([...]{1,50})$/;
```

**問題**:

- 行末 `$` のため、文中のタグが検出されない
- `\B` のため、日本語の後のタグが不安定

**影響**:

- ユーザーが文中に `#タグ` を入力しても検出されない
- 段落の最後にタグを入力した時のみ動作

**推奨される修正**:

```typescript
tag: /(?:^|\s)#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\uAC00-\uD7AF]{1,50})(?=\s|$|[^\p{Letter}\p{Number}])/u;
```

---

### 問題 2: text 属性から `#` が消える (高優先度)

**現状**:

```typescript
const raw = match[1]; // "タグ名"
const text = raw; // "タグ名" (# なし)
```

**問題**:

- 表示時に `#` が消える
- タグであることが視覚的にわからない

**影響**:

- ユーザーが入力した `#タグ名` が `タグ名` として表示される
- タグとページリンクの区別がつかない

**推奨される修正**:

```typescript
const raw = match[1]; // "タグ名"
const text = `#${raw}`; // "#タグ名"
const key = normalizeTitleToKey(raw); // "たぐめい"
```

---

### 問題 3: サジェスト機能未実装 (高優先度)

**現状**:

- ブラケットリンク `[text]` のみサジェスト対応
- タグリンク `#tag` のサジェストなし

**影響**:

- ユーザーがタグを入力する際、既存ページの候補が表示されない
- ユーザビリティの低下

**必要な対応**:

1. タグ検出ロジックの追加
2. タグページの検索・表示
3. サジェスト選択時のマーク挿入

---

### 問題 4: タグページの title フォーマット不明 (低優先度)

**現状**:

- タグページの title が `#タグ名` か `タグ名` か不明

**影響**:

- フォーマットが統一されていない場合、検索に失敗する可能性
- ユーザーがページ作成時に混乱する可能性

**推奨される対応**:

1. データベースクエリで既存のタグページを確認
2. title は `#タグ名` で統一することを推奨
3. CreatePageDialog でタグページ作成時の処理を追加

---

## 実装タスクの優先順位

### Phase 1: 基本機能の修正 (高優先度)

#### Task 1.1: text 属性に `#` を含める

- **ファイル**: `lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts`
- **変更内容**: `const text = `#${raw}`;`
- **見積もり**: 5 分
- **影響**: タグの表示が正しくなる

#### Task 1.2: PATTERNS.tag の修正

- **ファイル**: `lib/tiptap-extensions/unified-link-mark/config.ts`
- **変更内容**: 正規表現を修正して文中のタグを検出
- **見積もり**: 15 分
- **影響**: 文中のタグが検出されるようになる

#### Task 1.3: 動作確認

- **内容**: `#タグ` 入力時の動作確認
- **確認項目**:
  - 文中でタグが検出されるか
  - `#` が表示されるか
  - pending → exists/missing 遷移が正しいか
- **見積もり**: 20 分

---

### Phase 2: サジェスト機能の実装 (高優先度)

#### Task 2.1: タグ検出ロジックの追加

- **ファイル**: `lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts`
- **変更内容**:
  - `#` の検出ロジック追加
  - カーソル位置の判定
  - クエリ抽出
- **見積もり**: 45 分

#### Task 2.2: サジェスト選択時の処理

- **ファイル**: `lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts`
- **変更内容**:
  - タグマークの挿入処理
  - `variant: "tag"` の設定
- **見積もり**: 30 分

#### Task 2.3: テストの追加

- **ファイル**: `lib/tiptap-extensions/unified-link-mark/plugins/__tests__/suggestion-plugin.test.ts`
- **変更内容**:
  - タグサジェストのテスト追加
- **見積もり**: 45 分

---

### Phase 3: データベース・ページ作成の対応 (低優先度)

#### Task 3.1: データベーススキーマの確認

- **内容**: 既存のタグページの title フォーマット確認
- **見積もり**: 10 分

#### Task 3.2: CreatePageDialog の修正

- **ファイル**: `app/(protected)/pages/_components/CreatePageDialog.tsx`
- **変更内容**: タグページ作成時の title フォーマット (`#タグ名`)
- **見積もり**: 30 分

---

## 推奨される作業順序

### ステップ 1: 基本機能の修正 (40 分)

1. **text 属性の修正** (5 分)

   - `tag-rule.ts` の `const text = `#${raw}`;` に変更

2. **PATTERNS.tag の修正** (15 分)

   - `config.ts` の正規表現を修正

3. **動作確認** (20 分)
   - 手動テスト: `#タグ` 入力
   - 表示確認: `#` が表示されるか
   - 解決確認: pending → exists/missing

---

### ステップ 2: サジェスト機能の実装 (2 時間)

4. **タグ検出ロジックの追加** (45 分)

   - `suggestion-plugin.ts` にタグ検出を追加

5. **サジェスト選択時の処理** (30 分)

   - タグマーク挿入処理を追加

6. **テストの追加** (45 分)
   - タグサジェストのテスト追加

---

### ステップ 3: データベース対応 (40 分)

7. **データベーススキーマの確認** (10 分)

   - 既存のタグページを確認

8. **CreatePageDialog の修正** (30 分)
   - タグページ作成時の処理を追加

---

## 合計見積もり

| Phase                       | タスク数 | 見積もり時間        |
| --------------------------- | -------- | ------------------- |
| **Phase 1: 基本機能**       | 3        | 40 分               |
| **Phase 2: サジェスト**     | 3        | 2 時間              |
| **Phase 3: DB・ページ作成** | 2        | 40 分               |
| **合計**                    | **8**    | **約 3 時間 20 分** |

---

## 次のステップ

### すぐに実施すべきこと

1. **Phase 1 の実装**: 基本機能の修正 (40 分)

   - text 属性の修正
   - PATTERNS.tag の修正
   - 動作確認

2. **Phase 2 の実装**: サジェスト機能 (2 時間)

   - タグ検出ロジック
   - サジェスト選択時の処理
   - テスト追加

3. **Phase 3 の実装**: データベース対応 (40 分)
   - スキーマ確認
   - CreatePageDialog 修正

---

## まとめ

### 調査結果の要約

1. ✅ **基本実装は完了**: InputRule、resolver-queue、searchPages が動作
2. ⚠️ **修正が必要**: PATTERNS.tag と text 属性に問題
3. ❌ **未実装**: サジェスト機能
4. ❓ **確認が必要**: タグページの title フォーマット

### 実装の容易性

- **Phase 1 (基本機能)**: 非常に簡単 (40 分)
- **Phase 2 (サジェスト)**: 中程度の難易度 (2 時間)
- **Phase 3 (DB 対応)**: 簡単 (40 分)

**総合評価**: タグリンク機能は **3-4 時間で完全実装可能** ✅

---

## 関連ドキュメント

### 作業ログ

- [Phase 4 完了レポート](../../08_worklogs/2025_10/20251012/20251012_27_phase4-implementation-complete.md)

### 実装計画

- [UnifiedLinkMark リファクタリング計画](../../04_implementation/plans/unified-link-mark/20251011_08_refactoring-plan.md)
- [移行計画書](../../04_implementation/plans/unified-link-mark/20251011_07_migration-plan.md)

### 設計ドキュメント

- [初期調査レポート](../20251010/link-implementation-investigation.md)

---

**作成日**: 2025-10-12  
**最終更新**: 2025-10-12  
**次のアクション**: Phase 1 の実装開始  
**ステータス**: ✅ 調査完了 - 実装可能
