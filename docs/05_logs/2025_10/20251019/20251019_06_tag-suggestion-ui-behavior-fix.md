# Issue: タグ機能のサジェスト UI 動作修正

**優先度**: 🔴 High  
**推定難度**: ⭐⭐ 中程度（3-4時間）  
**推奨期限**: 本日中  
**作成日**: 2025-10-19  
**ブラウザテスト**: 確認済み

---

## 概要

ブラウザテストでタグ機能の以下の問題が確認されました：

1. **サジェスト UI の表示タイミング**: 現在 `#` 入力後に表示されていない
2. **初期選択状態**: 表示時に最初のアイテムが自動選択されている（改善が必要）
3. **Enter キー挙動**: 入力文字をそのままリンク化する動作が不安定

---

## 現在の仕様（修正前）

### 実装状況
- `#` 入力後、サジェスト UI が表示されない
- 入力時に最初のアイテムが自動選択される
- Enter キー押下時の動作が不明確

**関連ファイル**:
- `lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts` - Line 155
- `lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts` - Tag InputRule

---

## 新しい仕様（修正後）

### 要件 1: `#` 入力時点でサジェスト UI を表示

**条件**:
- ユーザーが `#` を入力した直後にサジェスト UI を表示開始
- サジェスト内容は**更新順が新しいもの**から表示（最新順）

**実装箇所**:
- `suggestion-plugin.ts` - サジェスト検出ロジック
- 空クエリ（`query.length === 0`）の場合も表示

**テスト項目**:
```
✅ " #" 入力後、サジェスト UI が表示される
✅ サジェスト内容が更新順で並ぶ（新しい順）
✅ " #a" 入力後、フィルタリングされたサジェストが表示
```

### 要件 2: 初期選択状態を廃止（ユーザー操作で選択）

**現在の問題**:
- サジェスト表示時に最初のアイテムが自動選択される
- ユーザーが明示的に選択するまで何も選択されていない状態が分かりづらい

**修正内容**:
- サジェスト表示時は **何も選択しない**（`selectedIndex: -1` または `null`）
- ユーザーが **矢印キー ↑↓** で手動選択
- ユーザーが **Enter キー** で選択確定

**実装箇所**:
- `suggestion-plugin.ts` - State 初期化時の `selectedIndex`
- `suggestion-plugin.ts` - キーボードハンドラー

**テスト項目**:
```
✅ サジェスト表示時、選択状態がない（-1）
✅ ↓ キーで最初のアイテムを選択可能
✅ ↑ キーで前のアイテムに移動
✅ 選択中のアイテムがハイライトされる
```

### 要件 3: Enter キー挙動の明確化

**入力 → Enter キーのフロー**:

1. **サジェストが選択されていない場合**:
   - 入力した文字をそのまま**リンク化**
   - タグ名として使用（例: `#MyTag` → `MyTag` で未設定リンク作成）

2. **サジェストが選択されている場合**:
   - 選択されたアイテムにリンク
   - 既存ページリンクまたは未設定リンクに応じて処理

**フロー図**:
```
ユーザー入力: " #MyTag"
    ↓
サジェスト UI 表示（何も選択されていない）
    ↓
ユーザーが Enter キーを押す
    ↓
選択状態 → -1 または null ?
    ├─ YES → "MyTag" をそのまま使用してリンク化
    └─ NO → 選択アイテムのページにリンク
```

**実装箇所**:
- `suggestion-plugin.ts` - `handleKeyDown` の Enter キー処理
- タグ入力ルールまたはサジェストプラグインでの最終確定処理

**テスト項目**:
```
✅ " #Test" 入力後、Enter キー → "Test" でリンク化
✅ " #Test" 入力後、↓ でアイテム選択、Enter キー → 選択アイテムにリンク
✅ 既存ページがある場合は exists フラグが true
✅ 既存ページがない場合は missing フラグ
```

---

## テスト修正マップ

### 修正すべきテスト

| ファイル | テスト | 修正内容 |
|---------|--------|--------|
| `suggestion-plugin.test.ts` | Bracket input pattern | `query.length === 0` でも表示テスト追加 |
| `suggestion-plugin.test.ts` | Suggestion list UI | 初期 `selectedIndex` が `0` ではなく `-1` に |
| `suggestion-plugin.test.ts` | Keyboard handling | Enter キー時の選択状態別テスト追加 |
| `tag-rule.test.ts` | Tag input handling | 入力文字そのままのリンク化テスト |

### 新規テスト

```typescript
describe("Tag Suggestion Behavior", () => {
  describe("Empty query handling", () => {
    it("should show suggestions when query is empty (#)", () => {
      // query.length === 0 で表示確認
    });

    it("should display results in latest-first order", () => {
      // 更新順が新しいもの → 古いもの
    });
  });

  describe("Selection state", () => {
    it("should not select any item initially", () => {
      // selectedIndex === -1
    });

    it("should allow arrow key selection", () => {
      // ↓ キーで items[0] を選択
    });

    it("should not auto-select on display", () => {
      // 表示時に self-selection がない
    });
  });

  describe("Enter key behavior", () => {
    it("should use input text when nothing selected", () => {
      // selectedIndex === -1 の場合、入力文字をそのまま使用
    });

    it("should use selected item when selected", () => {
      // selectedIndex >= 0 の場合、選択アイテムを使用
    });

    it("should create link with input text", () => {
      // " #MyTag" + Enter → MyTag でリンク化
    });
  });
});
```

---

## 実装修正の流れ

### ステップ 1: テストケースを修正

**ファイル**: `lib/tiptap-extensions/unified-link-mark/plugins/__tests__/suggestion-plugin.test.ts`

修正項目:
- [ ] 空クエリテスト追加（`query.length === 0` で表示）
- [ ] 初期選択状態テスト修正（`selectedIndex: 0` → `-1`）
- [ ] Enter キー動作テスト追加（選択状態別）

### ステップ 2: 実装を修正

**ファイル**: `lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts`

修正項目:
- [ ] サジェスト表示条件を `query.length > 0` → `query.length >= 0` に変更
- [ ] 初期 `selectedIndex` を `0` → `-1` に変更
- [ ] Enter キーハンドラーで選択状態をチェック

**ファイル**: `lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts`

修正項目:
- [ ] サジェスト非選択時の処理を明確化

### ステップ 3: テスト実行と確認

```bash
bun test lib/tiptap-extensions/unified-link-mark/plugins/__tests__/suggestion-plugin.test.ts
bun test lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/tag-rule.test.ts
```

### ステップ 4: ブラウザ確認

- [ ] `" #"` 入力 → サジェスト表示
- [ ] `" #a"` 入力 → フィルタ表示
- [ ] `" #MyTag"` + Enter → MyTag でリンク化
- [ ] ↓ キーで選択 → Enter → 選択アイテムにリンク

---

## 補足: サジェスト結果の順序

**現在**: おそらく作成順（古い順）
**修正後**: 更新順（新しい順）

**実装箇所**:
- `searchPages()` の戻り値順序
- `lib/utils/searchPages.ts` を確認

---

## 関連ドキュメント

- 📋 [元のレポート](20251019_04_tag-feature-verification.md)
- 🔗 [UnifiedLinkMark 仕様書](../../02_requirements/features/unified-link-mark-spec.md)
- 🔧 [実装計画](../../04_implementation/plans/unified-link-mark/)

---

**作成者**: GitHub Copilot  
**作成日**: 2025-10-19  
**ステータス**: 要対応
