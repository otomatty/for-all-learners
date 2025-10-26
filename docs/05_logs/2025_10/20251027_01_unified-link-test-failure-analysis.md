# UnifiedLinkMark テスト失敗分析

**作成日**: 2025-10-27
**対象ブランチ**: feature/link-group-network-setup
**失敗テスト数**: 61 件

---

## 概要

UnifiedLinkMark 機能の実装において、以下3つの主要な問題により61件のテストが失敗しています。

---

## 問題1: マーク名の不一致

### 現象

`extractLinksFromContent` 関数が TipTap JSON からリンクマークを抽出できない。

### 原因

**実装**:
```typescript
// lib/tiptap-extensions/unified-link-mark/index.ts
export const UnifiedLinkMark = Mark.create<UnifiedLinkMarkOptions>({
  name: "unilink",  // ← 実装は "unilink"
  // ...
});
```

**テスト**:
```typescript
// lib/utils/__tests__/extractLinksFromContent.test.ts
marks: [
  {
    type: "unifiedLink",  // ← テストは "unifiedLink"
    attrs: {
      text: "React Documentation",
      variant: "internal",
    },
  },
]
```

**extractLinksFromContent の実装**:
```typescript
// lib/utils/extractLinksFromContent.ts
if (mark.type === "unifiedLink" && ...) {  // ← "unifiedLink" を期待
  // ...
}
```

### 影響範囲

- `extractLinksFromContent > should extract links from simple content` (✗)
- `extractLinksFromContent > should extract multiple links from content` (✗)
- `extractLinksFromContent > should extract links from nested content` (✗)
- `extractLinksFromContent > should normalize keys correctly` (✗)
- `extractLinksFromContent > should handle external links` (✗)
- `extractLinksFromContent > should handle tag links` (✗)
- `extractLinksFromContent > should extract pageId when present` (✗)
- `countLinksByKey > should count links by key` (✗)
- `countLinksByKey > should return empty object for content without links` (✗)
- `getUniqueLinkKeys > should return unique link keys` (✗)

### 修正方法

**オプション A**: extractLinksFromContent を `unilink` に変更（推奨）
```typescript
// lib/utils/extractLinksFromContent.ts
if (mark.type === "unilink" && ...) {  // ← "unilink" に統一
  // ...
}
```

**オプション B**: UnifiedLinkMark の name を変更（非推奨・大規模な影響）
```typescript
// lib/tiptap-extensions/unified-link-mark/index.ts
export const UnifiedLinkMark = Mark.create<UnifiedLinkMarkOptions>({
  name: "unifiedLink",  // ← 変更すると既存データに影響
  // ...
});
```

---

## 問題2: テストデータの属性不足

### 現象

`extractLinksFromContent` がマークを見つけても、必須属性が不足しているため抽出されない。

### 原因

**extractLinksFromContent の要求**:
```typescript
// lib/utils/extractLinksFromContent.ts
if (attrs.key && attrs.text && attrs.markId && attrs.variant) {
  links.push({
    key: attrs.key,        // ← 必須
    text: attrs.text,      // ← 必須
    markId: attrs.markId,  // ← 必須
    position: position++,
    variant: attrs.variant, // ← 必須
    pageId: attrs.pageId || null,
  });
}
```

**テストデータ**:
```typescript
// lib/utils/__tests__/extractLinksFromContent.test.ts
marks: [
  {
    type: "unifiedLink",
    attrs: {
      text: "React Documentation",
      variant: "internal",
      // ❌ key が不足
      // ❌ markId が不足
    },
  },
]
```

### 影響範囲

全ての extractLinksFromContent テスト（10件）が失敗

### 修正方法

**オプション A**: テストデータに必須属性を追加
```typescript
marks: [
  {
    type: "unilink",  // ← 名前も修正
    attrs: {
      text: "React Documentation",
      variant: "bracket",  // ← "internal" → "bracket"
      key: "react documentation",  // ← 追加
      markId: "mark-test-001",     // ← 追加
    },
  },
]
```

**オプション B**: extractLinksFromContent の条件を緩和（非推奨）
```typescript
// 部分的なデータも許可するが、データ品質が下がる
if (attrs.text && attrs.variant) {
  links.push({
    key: attrs.key || normalizeTitleToKey(attrs.text),
    text: attrs.text,
    markId: attrs.markId || "unknown",
    // ...
  });
}
```

---

## 問題3: HTML パースの失敗

### 現象

migration テストで HTML から JSON への変換時にマークが作成されず、`undefined` になる。

### 原因

**テストログ**:
```
{"level":20,"time":1761494688327,"pid":13839,"hostname":"ASmabook.local",
 "msg":"[BracketMonitor] [CHECK] document changed, scanning for brackets"}

{"level":20,"time":1761494688327,"pid":13839,"hostname":"ASmabook.local",
 "from":1,"to":10,"raw":"Test Link","markId":"",
 "msg":"[BracketMonitor] [EXISTING] found existing bracket mark"}

{"level":20,"time":1761494688327,"pid":13839,"hostname":"ASmabook.local",
 "from":1,"to":10,"raw":"Test Link",
 "msg":"[BracketMonitor] [REMOVE] removing incomplete bracket mark"}
```

**問題点**:
1. HTML パーサーがマークを作成
2. BracketMonitor プラグインが「incomplete」として検出
3. マークが削除される
4. 結果として marks が空になる

**テストコード**:
```typescript
// lib/tiptap-extensions/unified-link-mark/__tests__/migration.test.ts
it("should migrate data-page-id links to UnifiedLinkMark", () => {
  const html = '<p><a data-page-id="abc-123" data-state="exists" href="/pages/abc-123">Test Link</a></p>';
  
  editor.commands.setContent(html);
  const json = editor.getJSON();
  
  const mark = json.content?.[0]?.content?.[0]?.marks?.[0];
  expect(mark?.type).toBe("unilink");  // ← mark が undefined
});
```

### 原因分析

**parseHTML 実装の問題**:
```typescript
// lib/tiptap-extensions/unified-link-mark/rendering.ts
export function parseHTML(): ParseRule[] {
  return [
    {
      tag: "a[data-variant]",  // ← data-variant がある場合のみマッチ
      getAttrs: (node) => {
        // ...
      },
    },
    {
      tag: "a[data-page-id]",  // ← レガシーデータ用
      getAttrs: (node) => {
        // マイグレーション処理
        // ❌ しかし BracketMonitor が削除してしまう
      },
    },
  ];
}
```

**BracketMonitor の問題**:
```typescript
// lib/tiptap-extensions/unified-link-mark/plugins/bracket-monitor.ts
// HTML パース後に即座に実行され、markId が空のマークを削除
if (!existingMark.markId) {
  // "incomplete bracket mark" として削除
  removeMarkAtPosition(view, existingMark.from, existingMark.to);
}
```

### 影響範囲

- Migration テスト全般（15件）
- State Manager テスト（3件）
- Commands テスト（insertUnifiedLink, refreshUnifiedLinks 等、30件以上）

### 修正方法

**オプション A**: parseHTML でマイグレーション時に markId を生成（推奨）
```typescript
// lib/tiptap-extensions/unified-link-mark/rendering.ts
{
  tag: "a[data-page-id]",
  getAttrs: (node) => {
    const pageId = node.getAttribute("data-page-id");
    const markId = generateMarkId();  // ← 追加
    
    return {
      variant: "bracket",
      pageId,
      markId,  // ← 追加
      // ...
    };
  },
}
```

**オプション B**: BracketMonitor を無効化（テスト時のみ）
```typescript
// テストで BracketMonitor を無効化
editor = new Editor({
  extensions: [
    StarterKit,
    UnifiedLinkMark.configure({
      enableBracketMonitor: false,  // ← オプション追加
    }),
  ],
});
```

**オプション C**: BracketMonitor のロジック修正
```typescript
// lib/tiptap-extensions/unified-link-mark/plugins/bracket-monitor.ts
// マイグレーション直後のマークは削除しない
if (!existingMark.markId) {
  // マークが作成されたばかりかチェック
  if (isRecentlyCreated(existingMark)) {
    logger.info("[BracketMonitor] [SKIP] skipping recently created mark");
    continue;
  }
  // ...
}
```

---

## 問題4: variant の値の不一致

### 現象

テストデータで `variant: "internal"` や `variant: "external"` を使用しているが、実装では `"bracket"` と `"tag"` のみをサポート。

### 原因

**型定義**:
```typescript
// lib/tiptap-extensions/unified-link-mark/types.ts
export type LinkVariant = "bracket" | "tag";
```

**テストデータ**:
```typescript
attrs: {
  variant: "internal",  // ❌ サポートされていない
}
```

### 修正方法

テストデータを修正:
```typescript
attrs: {
  variant: "bracket",  // ← "internal" の代わり
}
```

---

## 問題5: Suggestion Plugin テストの失敗

### 現象

```
✗ Suggestion Plugin - Empty Query Behavior > TC-001: Empty bracket query behavior
✗ Suggestion Plugin - Empty Query Behavior > TC-002: Empty tag query behavior
```

### 原因

Suggestion Plugin の実装が未完成、またはテストが実装を正しく反映していない可能性。

### 要調査

- `lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts` の実装確認
- テストケースの期待値が正しいか確認

---

## 問題6: createInputRules / createPlugins テストの失敗

### 現象

```
✗ createPlugins > should return exactly 4 plugins
✗ createInputRules > Function behavior > should return exactly 2 rules
```

### 原因

プラグイン/ルールの数が変更されたが、テストが更新されていない可能性。

### 要調査

- `lib/tiptap-extensions/unified-link-mark/plugins/index.ts`
- `lib/tiptap-extensions/unified-link-mark/input-rules/index.ts`

---

## 修正優先順位

### 🔴 最優先（P0）

1. **マーク名の統一**: `unifiedLink` → `unilink`
   - 影響: 10 tests
   - ファイル: `lib/utils/extractLinksFromContent.ts`

2. **テストデータの属性追加**
   - 影響: 10 tests
   - ファイル: `lib/utils/__tests__/extractLinksFromContent.test.ts`

3. **variant の修正**
   - 影響: All tests
   - "internal" → "bracket", "external" → 削除 or URL 判定

### 🟡 高優先（P1）

4. **HTML パースの修正**
   - 影響: 45+ tests (migration, commands, state manager)
   - オプション A を推奨: parseHTML で markId 生成

5. **BracketMonitor の調整**
   - マイグレーション時の挙動を改善

### 🟢 中優先（P2）

6. **Suggestion Plugin テストの修正**
   - 影響: 8 tests

7. **createInputRules / createPlugins テストの修正**
   - 影響: 9 tests

---

## 修正手順

### Phase 1: extractLinksFromContent 関連修正

```bash
# 1. マーク名を統一
# lib/utils/extractLinksFromContent.ts
mark.type === "unilink"

# 2. テストデータを修正
# lib/utils/__tests__/extractLinksFromContent.test.ts
type: "unilink"
variant: "bracket" or "tag"
key: "normalized-key"
markId: "test-mark-id"

# 3. テスト実行
bun test lib/utils/__tests__/extractLinksFromContent.test.ts
```

### Phase 2: HTML パース・マイグレーション修正

```bash
# 1. parseHTML で markId 生成
# lib/tiptap-extensions/unified-link-mark/rendering.ts

# 2. テスト実行
bun test lib/tiptap-extensions/unified-link-mark/__tests__/migration.test.ts
```

### Phase 3: Commands・State Manager 修正

```bash
# 1. commands テストのデータ修正
# 2. state manager テストのデータ修正

bun test lib/tiptap-extensions/unified-link-mark/commands/__tests__/
bun test lib/tiptap-extensions/unified-link-mark/__tests__/state-manager.test.ts
```

### Phase 4: Plugins・InputRules 修正

```bash
bun test lib/tiptap-extensions/unified-link-mark/plugins/__tests__/
bun test lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/
```

---

## 関連ドキュメント

- **実装計画**: `docs/03_plans/unified-link-mark/`
- **仕様書**: `lib/tiptap-extensions/unified-link-mark/README.md`
- **Issue**: `docs/01_issues/open/2025_10/20251027_01_unified-link-test-failures.md`

---

## 次のアクション

1. ✅ 問題の分析完了
2. ⬜ Issue を作成
3. ⬜ Phase 1 の修正開始
4. ⬜ Phase 2-4 の順次対応
5. ⬜ 全テスト PASS 確認
6. ⬜ 作業ログ記録

---

**最終更新**: 2025-10-27
**作成者**: AI (GitHub Copilot)
