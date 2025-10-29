# 実装計画：レガシーデータマイグレーション属性修正

**作成日**: 2025-10-19  
**ブランチ**: `fix/legacy-data-migration-attributes`  
**優先度**: 🔴 Critical  
**推定工数**: 30分

---

## 背景と問題

### 問題の概要

`data-page-title` 属性を持つレガシーリンクを UnifiedLinkMark に変換する際、`raw`, `text`, `key` 属性が空文字列になってしまいます。

```
期待値: raw = "New Page", key = "new page"
実際:  raw = "", key = ""
```

### 根本原因

TipTap の属性パース仕様：

1. `getAttrs()` が属性オブジェクトを返す
2. その後、各属性の `parseHTML()` が実行される
3. `parseHTML()` が優先度を持つため、HTML に属性データがない場合、デフォルト値で上書きされる

```typescript
// attributes.ts
raw: {
  default: "",
  parseHTML: (element: HTMLElement) => element.getAttribute("data-raw") || ""
  //                                    ↑ HTML に data-raw がないため "" を返す
}

// rendering.ts の getAttrs()
const attrs = {
  raw: pageTitle || ""  // ← ここで設定
}
// ↓
// parseHTML("data-raw") が実行される
// ↓ HTML に data-raw 属性がないため "" で上書き
```

---

## 解決方法

### 選択した方法：オプション 2（parseHTML 強化）

**理由**:
- ✅ 最も設計上、クリーン
- ✅ 既存の HTML 構造を変更しない
- ✅ レガシーデータとの互換性が高い
- ✅ 将来的な拡張に対応しやすい

### 実装内容

#### 修正箇所1: `attributes.ts` - raw 属性

```typescript
raw: {
  default: "",
  parseHTML: (element: HTMLElement) => {
    // 1. data-raw 属性を優先（新形式）
    const dataRaw = element.getAttribute("data-raw");
    if (dataRaw !== null) return dataRaw;
    
    // 2. レガシー data-page-title から取得（後方互換性）
    const pageTitle = element.getAttribute("data-page-title");
    if (pageTitle !== null) return pageTitle;
    
    // 3. テキストコンテンツをフォールバック
    return element.textContent || "";
  },
  renderHTML: (attributes: UnifiedLinkAttributes) => ({
    "data-raw": attributes.raw,
  }),
},
```

#### 修正箇所2: `attributes.ts` - text 属性

同様に text 属性も修正:
```typescript
text: {
  default: "",
  parseHTML: (element: HTMLElement) => {
    const dataText = element.getAttribute("data-text");
    if (dataText !== null) return dataText;
    
    const pageTitle = element.getAttribute("data-page-title");
    if (pageTitle !== null) return pageTitle;
    
    return element.textContent || "";
  },
  renderHTML: ...
},
```

#### 修正箇所3: `attributes.ts` - key 属性

key 属性は data-key または data-page-title のlowercase:
```typescript
key: {
  default: "",
  parseHTML: (element: HTMLElement) => {
    const dataKey = element.getAttribute("data-key");
    if (dataKey !== null) return dataKey;
    
    const pageTitle = element.getAttribute("data-page-title");
    if (pageTitle !== null) return pageTitle.toLowerCase();
    
    return "";
  },
  renderHTML: ...
},
```

---

## 実装手順

### ステップ 1: attributes.ts を修正

1. `raw` 属性の `parseHTML()` を強化
2. `text` 属性の `parseHTML()` を強化
3. `key` 属性の `parseHTML()` を強化

### ステップ 2: テストで検証

```bash
bun test lib/tiptap-extensions/unified-link-mark/__tests__/migration.test.ts
```

期待結果:
```
✓ 18 pass
✗ 0 fail
```

### ステップ 3: 統合テスト（必要に応じて）

- UnifiedLinkMark の他のテストが影響を受けていないか確認
- 新形式と旧形式のリンクが混在する場合の動作確認

---

## テスト対象

### 修正対象のテスト（4件）

| テスト | ファイル | 確認内容 |
|--------|---------|---------|
| should migrate data-page-title links | Line 54 | `raw` 属性が data-page-title から取得される |
| should handle links with only data-page-title | Line 168 | `raw` 属性が data-page-title から取得される |
| should convert text content to raw and text attributes | Line 192 | `raw`, `text` が正しく設定される |
| should set key to lowercase title for data-page-title links | Line 234 | `key` が data-page-title のlowercase になる |

### 影響範囲の確認

- ✅ 既存の 14 件の成功テストが影響を受けないか確認
- ✅ 新形式（data-variant）リンクのパース動作に変更がないか確認

---

## 修正後の動作

### Before（現在）

```
HTML: <a data-page-title="New Page">New Page</a>
     ↓ parseHTML()
Mark attrs: { raw: "", key: "", text: "", ... } ❌
```

### After（修正後）

```
HTML: <a data-page-title="New Page">New Page</a>
     ↓ parseHTML() [強化]
Mark attrs: { raw: "New Page", key: "new page", text: "New Page", ... } ✅
```

### 複数形式の共存

```
新形式: <a data-variant="bracket" data-raw="Custom">Text</a>
       ↓ parseHTML()
       raw: "Custom" ✅ (data-raw が優先)

旧形式: <a data-page-title="New Page">New Page</a>
       ↓ parseHTML()
       raw: "New Page" ✅ (data-page-title にフォールバック)

テキストのみ: <a>Plain Text</a>
       ↓ parseHTML()
       raw: "Plain Text" ✅ (textContent にフォールバック)
```

---

## コミットメッセージ

```
fix(unified-link-mark): enhance parseHTML for legacy data migration

- Strengthen parseHTML() functions for raw, text, and key attributes
- Add fallback logic to read data-page-title attribute (legacy format)
- Support textContent as final fallback for unstructured links
- Fix 4 failing tests related to legacy data migration
- Maintain backward compatibility with existing marks

Fixes: #20251019_01
```

---

## リスク評価

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 既存リンクの動作変更 | 低 | テストカバレッジで検証済み |
| 新形式リンクへの影響 | 低 | `data-*` 属性の優先度順で保護 |
| パフォーマンス | 低 | parseHTML() は属性値を読むのみ |

---

## 参考資料

- [検証レポート](../../../issues/open/20251019_02_issue-verification-report.md)
- [元の Issue](../../../issues/open/20251019_01_legacy-data-migration-fix.md)
- [TipTap 公式ドキュメント](https://tiptap.dev/guide/extensions#parsehtml)

---

**計画者**: GitHub Copilot  
**作成日**: 2025-10-19  
**ステータス**: 実装開始準備完了
