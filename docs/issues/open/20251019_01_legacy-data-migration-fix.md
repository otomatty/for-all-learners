# Issue: レガシーデータマイグレーション修正

**優先度**: 🔴 Critical  
**推定難度**: ⭐ 簡単（15-20分）  
**関連テスト**: 4件失敗（migration.test.ts）  
**作成日**: 2025-10-19

---

## 概要

`data-page-title` 属性から `UnifiedLinkMark` への変換時に、マーク属性が正しく設定されず、テストが 4件失敗しています。

根本原因は TipTap の parseHTML 仕様によるもので、HTML要素に `data-raw`, `data-text`, `data-key` 属性が存在しないため、デフォルト値が使用されます。

---

## 問題の詳細

### テスト失敗（4件）

| テスト | ファイル | 行番号 | 期待値 | 実際の値 |
|--------|---------|--------|--------|----------|
| should migrate data-page-title links | migration.test.ts | 54 | `raw = "New Page"` | `raw = ""` |
| should handle links with only data-page-title | migration.test.ts | 168 | `raw = "Only Title"` | `raw = ""` |
| should convert text content to raw and text attributes | migration.test.ts | 192 | `raw = "Display Text"` | `raw = ""` |
| should set key to lowercase title for data-page-title links | migration.test.ts | 234 | `key = "new page"` | `key = ""` |

### 根本原因

**TipTap の parseHTML 仕様**:

1. **`attributes.ts` (属性定義)**
   - ファイル: `lib/tiptap-extensions/unified-link-mark/attributes.ts`
   - 各属性の `parseHTML()` は HTML要素から **直接** データを読む
   - 例: `raw` 属性定義 (lines 20-25)
   ```typescript
   raw: {
     default: "",
     parseHTML: (element: HTMLElement) => element.getAttribute("data-raw") || "",
     renderHTML: (attributes: UnifiedLinkAttributes) => ({
       "data-raw": attributes.raw,
     }),
   },
   ```

2. **`rendering.ts` (parseHTML 実装)**
   - ファイル: `lib/tiptap-extensions/unified-link-mark/rendering.ts`
   - `getAttrs()` は属性オブジェクトを返す (lines 84-91, 120-137)
   ```typescript
   const attrs = {
     variant: "bracket",
     pageId: null,
     state,
     exists: false,
     href: "#",
     key: pageTitle?.toLowerCase() || "",
     raw: pageTitle || "",
     text: pageTitle || "",
     // ...
   };
   return attrs;
   ```

3. **パース動作**
   - HTML パース時、`attributes.parseHTML()` も実行される
   - HTML要素に `data-raw` 属性がなければ、デフォルト値 `""` が使われる
   - `getAttrs()` で設定した `raw` 値は上書きされない

**結果**: マーク属性が HTML に出力されないため、次のページロード時にも属性が失われる

---

## 解決策

### オプション A: HTML に属性を出力（推奨）

`rendering.ts` の `getAttrs()` で返すオブジェクトの値を HTML 属性として出力する必要があります。

ただし、TipTap の設計上、`getAttrs()` の戻り値は属性オブジェクトの値ではなく、HTML パースの際に使用されるため、HTML 出力には影響しません。

**代替案**: `renderHTML()` 関数で、マーク属性値を HTML 属性として明示的に出力することが必要です。

### オプション B: マイグレーション後に resolver が設定

現在の実装では、マイグレーション後に `resolver-queue` が `raw`, `text`, `key` 属性を設定するため、実用上は問題ありません。

**ただし**: テストでは即座に属性が設定されることを期待しています。

### 推奨修正内容

1. **`rendering.ts` の `renderHTML()` 関数を修正**
   - `raw`, `text`, `key` 属性を HTML データ属性として出力
   - または、マイグレーション処理でこれらの属性値を HTML に埋め込む

2. **テスト期待値の見直し**
   - マイグレーション直後では `raw = ""` でも良い場合、テストを更新
   - resolver 実行後に属性が設定されることをテストする

---

## 検証根拠

### ファイルパス
- `lib/tiptap-extensions/unified-link-mark/rendering.ts` - lines 84-91, 120-137
- `lib/tiptap-extensions/unified-link-mark/attributes.ts` - lines 20-25
- `lib/tiptap-extensions/unified-link-mark/__tests__/migration.test.ts` - lines 54, 168, 192, 234

### テスト実行結果
```bash
bun test lib/tiptap-extensions/unified-link-mark/__tests__/migration.test.ts
# 結果: 4件失敗、raw/text/key が空文字列
```

### 参考ドキュメント
- `docs/08_worklogs/2025_10/20251012/20251012_25_phase3.3-implementation-complete.md` (Lines 178-194)
  - TipTap parseHTML 仕様の既知問題

---

## 実装のヒント

1. **`renderHTML()` 関数を確認**
   - 現在どのようにマーク属性を HTML に変換しているか

2. **`mergeAttributes()` の使用**
   - `renderHTML()` 内で `mergeAttributes()` を使用して属性を統合

3. **テスト更新戦略**
   - マイグレーション直後の属性と
   - resolver 実行後の属性を分けてテスト

---

## 関連ドキュメント

- 📋 [検証報告書](20251019_05_verification-report-memo-link-investigation.md) - 問題B 参照
- 📝 [元のレポート](20251018_04_memo-link-feature-investigation.md) - 問題B 参照
- 🔗 [作業ログ](../../08_worklogs/2025_10/20251012/20251012_25_phase3.3-implementation-complete.md) - TipTap 仕様説明

---

**作成者**: GitHub Copilot  
**作成日**: 2025-10-19  
**最終更新**: 2025-10-19
