# Issue: タグリンク機能の詳細確認と誤解解決

**優先度**: 🟡 Medium  
**推定難度**: ⭐ 簡単（1-2時間）  
**推奨期限**: 3-4日以内  
**作成日**: 2025-10-19

---

## 概要

タグリンク機能（`#タグ` 形式）の実装は正確に機能していることが検証で確認されました。

ただし、事前レポートに誤解があった部分を明確にし、実装が意図通り動作することを確認する必要があります。

---

## 検証結果

### ✅ 誤解が修正された項目

#### 1. 正規表現の末尾 `$` 問題

**事前レポート**:
> 正規表現の末尾 `$` が文中のタグ検出を阻害することがある

**検証結果**: ❌ **誤解です**

**実装**: `config.ts` Line 47
```typescript
tag: /(?:^|\s)#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\uAC00-\uD7AF]{1,50})(?=\s|$|[^\p{Letter}\p{Number}])/u,
```

**パターン分析**:
- `(?:^|\s)` - 行頭またはスペース
- `#` - ハッシュ文字
- `([a-zA-Z0-9...]{1,50})` - キャプチャグループ（タグ名）
- `(?=\s|$|[^\p{Letter}\p{Number}])` - ルックアヘッド（3つの選択肢）

**末尾処理**:
- `$` は **ルックアヘッド内の3つの選択肢の1つ**
- 「行末 OR スペース OR 非英数字」のいずれか
- 文中のタグ（`"text #tag text"` など）も正常に検出される

**テスト確認**: `config.test.ts:97-107` で文中タグが正しく検出される

---

#### 2. タグテキスト表示の不安定性

**事前レポート**:
> タグテキスト表示が不安定（`#` の有無が不統一）

**検証結果**: ❌ **誤解です**

**実装**: `input-rules/tag-rule.ts` Line 32
```typescript
export function createTagInputRule(context: { editor: Editor; name: string }) {
  return new InputRule({
    find: PATTERNS.tag,
    handler: ({ state, match, range, chain }) => {
      const raw = match[1];
      const text = `#${raw}`; // Tag displays with # prefix ✅ 常に正確
      const key = normalizeTitleToKey(raw);
```

**結果**: タグテキスト表示は **常に** `#` プレフィックス付きで正確に実装されている

---

### ⚠️ 確認が不十分な項目

#### サジェスト UI 問題

**事前レポート**:
> サジェスト UI が空クエリで表示されないケース

**検証状況**: 具体的な根拠が不明確

**確認が必要な点**:
1. 空クエリ（`[` だけ、`#` だけ）での候補表示
2. サジェスト UI の最小文字数チェック
3. 実装とテストの確認

---

## 実施すべき確認

### 1. 正規表現テストの確認

**ファイル**: `lib/tiptap-extensions/unified-link-mark/__tests__/config.test.ts`

**テスト項目** (Lines 97-147):
- ✅ 文中のタグ検出: `"Check this #tag123"`
- ✅ 複数タグ検出
- ✅ 長いタグ検出
- ✅ 行頭のタグ検出

**実行結果確認**:
```bash
bun test lib/tiptap-extensions/unified-link-mark/__tests__/config.test.ts
# 予想: すべて pass
```

---

### 2. タグ入力ルールの動作確認

**ファイル**: `lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts`

**確認項目**:
1. タグが正しく検出される
2. `#` プレフィックスが常に表示される
3. 複数のタグが正しく処理される

**テスト実行**:
```bash
bun test lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/tag-rule.test.ts
```

**ブラウザ確認**:
1. エディタを開く
2. `" #tag"` と入力
3. リンクが作成されることを確認
4. リンクテキストに `#` が表示されることを確認

---

### 3. サジェスト UI の詳細調査

**対象ファイル**: `lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts`

**確認項目**:

```typescript
// サジェスト表示の条件を確認
if (props.query.length < 1) {  // ← このチェック？
  return [];
}
```

**確認内容**:
1. 空クエリでサジェストが表示されるべきか設計を確認
2. 最小文字数チェックが実装されているか確認
3. テストケースで空クエリがテストされているか確認

**テスト実行**:
```bash
bun test lib/tiptap-extensions/unified-link-mark/plugins/__tests__/suggestion-plugin.test.ts
```

**ブラウザ確認**:
1. エディタで `[` だけ入力 → サジェストが表示されるか
2. エディタで `#` だけ入力 → サジェストが表示されるか
3. サジェスト候補が正しく表示されるか

---

## 実装コード参考

### タグパターン定義

**ファイル**: `lib/tiptap-extensions/unified-link-mark/config.ts`

```typescript
// Line 47
const PATTERNS = {
  tag: /(?:^|\s)#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\uAC00-\uD7AF]{1,50})(?=\s|$|[^\p{Letter}\p{Number}])/u,
};
```

### タグ入力ルール

**ファイル**: `lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts`

```typescript
export function createTagInputRule(context: { editor: Editor; name: string }) {
  return new InputRule({
    find: PATTERNS.tag,
    handler: ({ state, match, range, chain }) => {
      const raw = match[1];
      const text = `#${raw}`;  // ✅ 常に # プレフィックス付き
      const key = normalizeTitleToKey(raw);
      
      const attrs: UnifiedLinkAttributes = {
        variant: "tag",
        raw,
        text,
        key,
        pageId: null,
        href: "#",
        state: "pending",
        exists: false,
        markId: generateMarkId(),
      };
```

---

## ドキュメント更新内容

### 更新対象

1. **`docs/02_requirements/features/unified-link-mark-spec.md`**
   - タグパターンの説明を修正
   - 末尾 `$` の誤解を解決

2. **`docs/04_implementation/plans/unified-link-mark/`**
   - タグ機能の実装状況を「実装完了」に更新
   - 既知の誤解を記載

3. **このドキュメント自体**
   - タグ機能が正確に実装されていることを記載
   - サジェスト UI の詳細確認が必要なことを記載

---

## テストチェックリスト

### 単体テスト

- [ ] `config.test.ts` - タグパターンテスト pass
- [ ] `tag-rule.test.ts` - タグ入力ルールテスト pass
- [ ] `suggestion-plugin.test.ts` - サジェスト UI テスト pass

### ブラウザテスト

- [ ] `" #tag"` 入力 → リンク作成
- [ ] `" #日本語"` 入力 → リンク作成（日本語対応確認）
- [ ] リンクテキストに `#` プレフィックス表示
- [ ] `" #tag1 #tag2"` 複数タグ入力可能
- [ ] サジェストが表示される（最小文字数確認）

### エッジケース

- [ ] `#` だけの入力 → リンク作成されない
- [ ] `#` + スペース → リンク作成されない
- [ ] `no#tag` （スペースなし） → リンク作成されない
- [ ] 長いタグ名（50文字以上） → 正しく制限される

---

## 参考ドキュメント

- 📋 [検証報告書](20251019_05_verification-report-memo-link-investigation.md)
- 📝 [元のレポート](20251018_04_memo-link-feature-investigation.md)
- 🔗 [UnifiedLinkMark 仕様書](../../02_requirements/features/unified-link-mark-spec.md)

---

## 補足: 正規表現の詳細

### パターン: `/(?:^|\s)#([a-zA-Z0-9...]{1,50})(?=\s|$|[^\p{Letter}\p{Number}])/u`

```
(?:^|\s)              # Non-capturing: start of line OR whitespace
#                     # Literal hash
([a-zA-Z0-9...]1,50)  # Capturing: tag characters, 1-50 length
(?=...)               # Lookahead (doesn't consume)
  \s                  # OR: whitespace
  |                   # OR
  $                   # OR: end of line
  |                   # OR
  [^\p{Letter}\p{Number}]  # OR: non-letter, non-digit
```

**結果**: 文中のタグ（`"text #tag text"`）も行末のタグも正しく検出

---

**作成者**: GitHub Copilot  
**作成日**: 2025-10-19  
**最終更新**: 2025-10-19
