# 20251013 調査レポート - サジェスト機能の候補選択時の問題

## 作業概要

ブラケット記法とタグ記法のサジェスト候補選択時に以下の問題が発生:

1. **ブラケット記法**: 候補を選択するとブラケットごと消えてしまう
2. **タグ記法**: 
   - アルファベットや日本語以外の記号を入力すると `##a` のようにシャープが2つ並ぶ
   - 候補を選択すると入力していた内容の前にシャープがもう一つ付く（例: `#ab` → `##ab`）

**作業開始**: 2025-10-13  
**優先度**: 高  
**影響範囲**: UnifiedLinkMark suggestion-plugin.ts

---

## 問題の詳細分析

### 実装の現状

#### ファイル構造

```
lib/tiptap-extensions/unified-link-mark/plugins/
└── suggestion-plugin.ts
    ├── UnifiedLinkSuggestionState (interface)
    ├── createSuggestionPlugin() - メイン関数
    └── insertUnifiedLink() - 候補選択時の挿入処理
```

#### 範囲検出ロジック (lines 77-140)

```typescript
// Detect bracket range: [query]
const openBracketIndex = text.lastIndexOf("[", posInPara - 1);
const hashIndex = text.lastIndexOf("#", posInPara - 1);

// Check bracket pattern
if (openBracketIndex !== -1) {
  const rest = text.slice(openBracketIndex + 1);
  const closeBracketIndex = rest.indexOf("]");
  const endInPara = closeBracketIndex === -1 
    ? text.length 
    : openBracketIndex + 1 + closeBracketIndex;

  if (posInPara > openBracketIndex && posInPara <= endInPara) {
    const rangeFrom = paraStart + openBracketIndex + 1; // ブラケットの次の文字
    const rangeTo = paraStart + endInPara;
    const query = text.slice(openBracketIndex + 1, endInPara);

    detectedRange = {
      from: rangeFrom,  // ブラケット内の開始位置
      to: rangeTo,      // ブラケット内の終了位置
      query,
      variant: "bracket",
    };
  }
}

// Check tag pattern
if (hashIndex !== -1 && (!detectedRange || hashIndex > openBracketIndex)) {
  const rest = text.slice(hashIndex + 1);
  const tagEndMatch = rest.match(/[\s\])}.,;!?]|$/);
  const tagEndIndex = tagEndMatch ? (tagEndMatch.index ?? rest.length) : rest.length;
  const endInPara = hashIndex + 1 + tagEndIndex;

  if (posInPara > hashIndex && posInPara <= endInPara) {
    const rangeFrom = paraStart + hashIndex + 1; // #の次の文字
    const rangeTo = paraStart + endInPara;
    const query = text.slice(hashIndex + 1, endInPara);

    detectedRange = {
      from: rangeFrom,  // #の次の文字
      to: rangeTo,
      query,
      variant: "tag",
    };
  }
}
```

**状態管理の範囲**: `range.from` と `range.to` は**記号を含まない範囲**を指している

---

### 問題1: ブラケット記法 - ブラケットが消える

#### 現在の実装 (lines 464-476)

```typescript
if (variant === "bracket") {
  // Delete bracket range including brackets
  tr.delete(
    from - 1,  // ← ブラケット開始位置から削除
    to + (view.state.doc.textBetween(to, to + 1) === "]" ? 1 : 0),
  );

  // Insert text with UnifiedLink mark
  const markType = view.state.schema.marks.unifiedLink;
  if (markType) {
    const mark = markType.create({
      key,
      title: item.title,
      noteSlug: item.slug,
      resolved: true,
      status: "exists",
      pageId: item.id,
    });

    tr.insert(from - 1, view.state.schema.text(item.title, [mark]));
  }
}
```

#### 問題点

1. **ブラケットを削除している**: `tr.delete(from - 1, to + ...])`でブラケット全体を削除
2. **ブラケットなしでテキスト挿入**: `tr.insert(from - 1, view.state.schema.text(item.title, [mark]))`
3. **結果**: `[テキスト]` → `テキスト` (ブラケットが消える)

#### 期待される動作

- ユーザー入力: `[abc]` → 候補選択
- 期待結果: `[選択したタイトル]` (ブラケットは残る、中身だけ置換)

---

### 問題2: タグ記法 - シャープが重複する

#### 現在の実装 (lines 477-499)

```typescript
} else if (variant === "tag") {
  // Delete # and tag text
  tr.delete(from - 1, to);  // ← #を含めて削除

  // Insert text with UnifiedLink mark (with # prefix)
  const markType = view.state.schema.marks.unifiedLink;
  if (markType) {
    const mark = markType.create({
      variant: "tag",
      raw: item.title,
      text: `#${item.title}`,  // ← #を含めて挿入
      key,
      pageId: item.id,
      href: `/pages/${item.id}`,
      state: "exists",
      exists: true,
      markId: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    });

    tr.insert(from - 1, view.state.schema.text(`#${item.title}`, [mark]));  // ← #を含めて挿入
  }
}
```

#### 問題点の推測

**範囲検出の問題**:

```typescript
// #ab を入力した場合の範囲
const rangeFrom = paraStart + hashIndex + 1;  // #の次の文字 (a の位置)
const rangeTo = paraStart + endInPara;         // (b の次の位置)
```

**削除と挿入の範囲**:

```typescript
tr.delete(from - 1, to);  // from-1 = #の位置, to = bの次の位置
// → #ab を削除

tr.insert(from - 1, view.state.schema.text(`#${item.title}`, [mark]));
// → #の位置に #タイトル を挿入
```

**問題が発生するケース**:

1. **記号入力時に `##` が表示される**
   - 原因: 範囲検出ロジックが記号を適切に処理できていない可能性
   - `text.slice(hashIndex + 1, endInPara)` が空文字列になる or 記号だけになる

2. **候補選択時に `##` になる**
   - 原因: `tr.delete(from - 1, to)` が正しい範囲を削除できていない
   - または、既に `#` が残っている状態で `#${item.title}` を挿入している

---

## 根本原因の推測

### ブラケット記法

- **設計上の誤り**: ブラケットを削除してリンクマークに置き換える実装になっている
- **期待動作**: ブラケットは残したまま、中身だけをリンクマークに置き換えるべき

### タグ記法

1. **範囲検出の問題**:
   - 記号や特殊文字の処理が不適切
   - `tagEndMatch` の正規表現が記号を誤って検出している可能性

2. **削除/挿入位置の問題**:
   - `from - 1` が正しい位置を指していない
   - 既存の `#` が残った状態で新しい `#` を挿入している

---

## 次のステップ

### 1. ブラケット記法の修正

#### 修正方針

- ブラケットは削除せず、**中身だけ**を置き換える
- 削除範囲: `from` ~ `to` (ブラケット内のテキストのみ)
- 挿入位置: `from` (ブラケット内の開始位置)

#### 修正案

```typescript
if (variant === "bracket") {
  // Delete only the content inside brackets (not the brackets themselves)
  tr.delete(from, to);

  // Insert selected title with UnifiedLink mark
  const markType = view.state.schema.marks.unifiedLink;
  if (markType) {
    const mark = markType.create({
      variant: "bracket",
      key,
      title: item.title,
      noteSlug: item.slug,
      resolved: true,
      status: "exists",
      pageId: item.id,
    });

    tr.insert(from, view.state.schema.text(item.title, [mark]));
  }
}
```

### 2. タグ記法の修正

#### 修正方針

1. **範囲検出ロジックの確認**:
   - `tagEndMatch` の正規表現を見直す
   - 記号や特殊文字の扱いを明確にする

2. **削除/挿入位置の修正**:
   - `#` は削除せず、タグテキストのみ置き換える
   - または、`#` を含めて削除して、`#` を含めて挿入（現在の実装を維持）する場合は範囲を正確に

#### 修正案A: `#` は残す（推奨）

```typescript
} else if (variant === "tag") {
  // Delete only the tag text (not the #)
  tr.delete(from, to);

  // Insert selected title with UnifiedLink mark (without # prefix in text)
  const markType = view.state.schema.marks.unifiedLink;
  if (markType) {
    const mark = markType.create({
      variant: "tag",
      raw: item.title,
      key,
      pageId: item.id,
      href: `/pages/${item.id}`,
      state: "exists",
      exists: true,
      markId: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    });

    tr.insert(from, view.state.schema.text(item.title, [mark]));
  }
}
```

#### 修正案B: `#` を含めて置き換える（現在の実装を維持）

```typescript
} else if (variant === "tag") {
  // Delete # and tag text
  tr.delete(from - 1, to);  // 確実に #から削除

  // Insert text with UnifiedLink mark (with # prefix)
  const markType = view.state.schema.marks.unifiedLink;
  if (markType) {
    const mark = markType.create({
      variant: "tag",
      raw: item.title,
      text: `#${item.title}`,
      key,
      pageId: item.id,
      href: `/pages/${item.id}`,
      state: "exists",
      exists: true,
      markId: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    });

    tr.insert(from - 1, view.state.schema.text(`#${item.title}`, [mark]));
  }
}
```

### 3. デバッグと検証

1. **ログ追加**:
   ```typescript
   logger.debug({
     from,
     to,
     fromMinus1: from - 1,
     variant,
     query: state.query,
     selectedTitle: item.title,
   }, 'insertUnifiedLink called');
   ```

2. **テストケース作成**:
   - `[abc]` → 候補選択 → `[選択タイトル]` になることを確認
   - `#abc` → 候補選択 → `#選択タイトル` になることを確認
   - `#a` + 記号入力 → `##` にならないことを確認

---

## 関連ドキュメント

- [Phase 2.1 サジェスト機能実装](../../../04_implementation/plans/unified-link-mark/20251012_06_phase2.1-suggestion-plugin-implementation.md)
- [Phase 2.1 完了レポート](../20251012/20251012_07_phase2.1-completion-report.md)
- [UnifiedLinkMark 設計書](../../../03_design/features/unified-link-mark-design.md)

---

## 作成日時

- 作成: 2025-10-13
- 最終更新: 2025-10-13
