# マークダウンペースト時の余分な空行問題の修正

**日付**: 2025-10-30  
**作業者**: AI Assistant  
**関連 Issue**: 新規（マークダウンペースト時の空行問題）

## 問題の概要

マークダウンをページエディターにペーストすると、各行の間に余分な空行が挿入されてしまう問題が発生。

### 具体例

**入力マークダウン**:
```markdown
# Heading
This is text
## Another heading
More text
```

**期待される結果**:
```
Heading
This is text
Another heading
More text
```

**実際の結果（バグ）**:
```
Heading

This is text

Another heading

More text
```

## 原因の調査

### 発見した問題

`lib/utils/markdownParser.ts` の `parseMarkdownToNodes` 関数（157-164行目）で、**空行を検出すると空の段落ノードを追加**していた。

#### 問題のコード

```typescript
// Handle empty lines
if (line.trim() === "") {
  flushList();
  // Add empty paragraph to preserve spacing
  if (nodes.length > 0) {
    nodes.push({
      type: "paragraph",
      content: [],
    });
  }
  continue;
}
```

### なぜこれが問題か

マークダウンでは、空行は**ブロック要素の区切り**として機能するべきで、実際の空段落として挿入されるべきではない。

例:
```markdown
## Heading
↓ この空行はセパレータ
Paragraph
```

この空行は「見出しと段落の間の区切り」であり、「空の段落」ではない。

## 実施した修正

### 1. マークダウンパーサーの修正 ✅

**ファイル**: `lib/utils/markdownParser.ts`

```typescript
// Handle empty lines
if (line.trim() === "") {
  flushList();
  // Skip empty lines - they're just separators between blocks
  // Don't create empty paragraphs to avoid extra spacing
  continue;
}
```

**変更内容**:
- 空行を検出したら、リストをフラッシュして次の行へスキップ
- 空の段落ノードを作成しない

### 2. テストケースの修正 ✅

**ファイル**: `lib/utils/__tests__/markdownParser.test.ts`

修正した箇所:
1. `should handle empty lines` テスト
2. `should handle multiple list types` テスト
3. `should parse mixed content` テスト

#### Before:
```typescript
expect(result.length).toBe(3); // paragraph, empty paragraph, paragraph
```

#### After:
```typescript
expect(result.length).toBe(2); // paragraph, paragraph (empty line is just a separator)
```

## テスト結果

```bash
bun test lib/utils/__tests__/markdownParser.test.ts

✓ 27 pass
✓ 0 fail
```

すべてのテストがパスしました！

## 動作確認

### テストケース

以下のマークダウンをペースト:

```markdown
## Heading 1

Paragraph 1

Paragraph 2

- List item 1
- List item 2

## Heading 2
```

**期待される結果**:
- 見出し1
- 段落1
- 段落2
- 箇条書きリスト（2項目）
- 見出し2

（各要素の間に余分な空行なし）

### 確認手順

1. 開発サーバーを再起動: `bun dev`
2. ページエディターを開く
3. 上記のマークダウンをペースト
4. 各行の間に余分な空行がないことを確認

## 影響範囲

### 修正されたファイル

- ✏️ `lib/utils/markdownParser.ts` - 空行処理ロジック
- ✏️ `lib/utils/__tests__/markdownParser.test.ts` - テストケース3箇所

### 影響を受ける機能

- ✅ ページエディターへのマークダウンペースト
- ✅ TipTap エディターへのマークダウンペースト
- ✅ どちらも `MarkdownPaste` 拡張機能を使用

## メリット

### ✅ 解決された問題
- マークダウンペースト時に余分な空行が入らない
- より自然なマークダウン変換

### ✅ 追加のメリット
- コード品質向上: 空行の扱いが明確
- テストカバレッジ: 期待される動作が明確に定義

## 考慮事項

### 複数の空行を保持したい場合

現在の実装では、複数の空行（`\n\n\n`）も単一の区切りとして扱われます。

もし「複数の空行 = 複数の空段落」という動作が必要な場合は、以下のように修正:

```typescript
// Handle empty lines
if (line.trim() === "") {
  flushList();
  // 連続する空行をカウントして、明示的に複数の空段落を挿入
  // (現在は不要だが、将来的に必要なら実装可能)
  continue;
}
```

## 参考資料

- **マークダウン仕様**: https://spec.commonmark.org/
- **TipTap ドキュメント**: https://tiptap.dev/
- **プロジェクト内の実装**: 
  - `lib/tiptap-extensions/markdown-paste.ts`
  - `lib/utils/markdownParser.ts`

## 変更ファイル一覧

- ✏️ `lib/utils/markdownParser.ts` (修正)
- ✏️ `lib/utils/__tests__/markdownParser.test.ts` (修正)
- 📄 `docs/05_logs/2025_10/20251030_02_markdown-paste-spacing-fix.md` (このファイル)

## 次のステップ

### 即座に実施 ✅
- [x] マークダウンパーサーの修正
- [x] テストケースの更新
- [x] テスト実行（全パス）

### 手動確認（推奨）
- [ ] 開発サーバー再起動
- [ ] ページエディターでマークダウンペースト
- [ ] 空行が正しく処理されることを確認

### 将来的な改善（オプション）
- [ ] 複数空行の扱いを設定可能にする
- [ ] マークダウンパーサーのオプション追加
- [ ] より複雑なマークダウン構文のサポート

---

**最終更新**: 2025-10-30
**ステータス**: 修正完了 / テスト済み
