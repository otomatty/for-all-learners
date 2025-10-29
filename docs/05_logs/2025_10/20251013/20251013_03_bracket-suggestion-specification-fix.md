# 20251013 作業ログ - ブラケット記法サジェスト仕様修正

## 作業概要

ブラケット記法の本来の仕様を理解し、サジェスト機能を補助的な役割に修正しました。

**作業開始**: 2025-10-13  
**優先度**: 最高  
**対象ファイル**: `lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts`

---

## 問題の再定義

### 誤解していた仕様

**誤**: サジェストの候補選択で UnifiedLinkMark を作成し、リンクを確定する

**正**:

1. ブラケット記法 `[ページタイトル]` は、InputRule が自動的に UnifiedLinkMark に変換する
2. サジェストは入力補助の役割で、候補選択時はテキストのみを置き換える
3. ユーザーが `]` を入力してブラケットを閉じたときに、InputRule が発動して Mark に変換される

### ブラケット記法の本来の動作

```
ユーザー入力: [abc
          ↓
サジェスト表示: 「ページA」「ページB」などの候補
          ↓
候補選択: [ページA  ← テキストのみ置き換え（Markは作成しない）
          ↓
ユーザーが ] を入力: [ページA]
          ↓
InputRuleが発動: [ページA] → UnifiedLinkMarkに自動変換
          ↓
リンク状態の判定:
  - 「ページA」が存在 → exists（青色リンク）
  - 「ページA」が未作成 → pending（赤色リンク）
```

---

## 修正内容

### 変更ファイル

`lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts`

### 修正箇所: `insertUnifiedLink()` 関数（ブラケット記法部分）

#### Before (lines 467-487)

```typescript
if (variant === "bracket") {
  // Delete only the content inside brackets (keep the brackets themselves)
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

**問題点**:

- サジェストの候補選択時に UnifiedLinkMark を作成している
- これにより、InputRule の自動変換が動作しない
- ユーザーが `]` を入力する前にリンクが確定してしまう

#### After

```typescript
if (variant === "bracket") {
  // For bracket notation, only replace the text content
  // The InputRule will handle the Mark conversion when user closes the bracket with ]
  tr.delete(from, to);
  tr.insertText(item.title, from);
}
```

**改善点**:

- サジェストの候補選択時は**テキストのみ**を置き換える
- UnifiedLinkMark は作成しない
- ユーザーが `]` を入力したときに InputRule が自動的に発動して Mark に変換される

---

## 動作フロー

### Before（問題のある動作）

```
1. ユーザー: [abc と入力
2. サジェスト: 候補表示
3. 候補選択: [ページA] ← UnifiedLinkMarkを作成（確定）
4. InputRule: 発動しない（既にMarkが作成されているため）
5. 結果: ブラケットが消える、テキストが表示されないなどの問題
```

### After（修正後の動作）

```
1. ユーザー: [abc と入力
2. サジェスト: 候補表示
3. 候補選択: [ページA ← プレーンテキストのみ置き換え
4. ユーザー: ] を入力
5. InputRule: [ページA] を検出 → UnifiedLinkMarkに変換
6. Resolver: ページの存在確認 → exists/pending 状態を設定
7. 結果: 正しくリンクが表示される（青色 or 赤色）
```

---

## InputRule の役割

### 既存の実装（正常動作）

`lib/tiptap-extensions/unified-link-mark/input-rules/bracket-rule.ts`

```typescript
return new InputRule({
  find: PATTERNS.bracket, // /\[([^\]]+)\]/ パターン
  handler: ({ state, match, range, chain }) => {
    const raw = match[1]; // ブラケット内のテキスト
    const key = normalizeTitleToKey(raw);
    const markId = generateMarkId();

    // Check if external link
    const isExternal = PATTERNS.externalUrl.test(raw);

    const attrs: UnifiedLinkAttributes = {
      variant: "bracket",
      raw,
      text: raw,
      key,
      pageId: null,
      href: isExternal ? raw : "#",
      state: isExternal ? "exists" : "pending",
      exists: isExternal,
      markId,
    };

    // ブラケットを削除して、UnifiedLinkMarkを適用したテキストを挿入
    chain()
      .focus()
      .deleteRange({ from, to })
      .insertContent({
        type: "text",
        text: raw,
        marks: [{ type: "unifiedLink", attrs }],
      })
      .run();

    // 非外部リンクの場合、resolverキューに追加
    if (!isExternal) {
      enqueueResolve({
        key,
        raw,
        markId,
        editor: context.editor,
        variant: "bracket",
      });
    }
  },
});
```

**InputRule の動作**:

1. `[テキスト]` パターンを検出
2. ブラケットを削除
3. テキストに UnifiedLinkMark を適用
4. Resolver キューにエンキューしてページ ID を解決

---

## サジェスト機能の役割

### 修正後の役割（明確化）

1. **入力補助**:

   - `[abc` と入力中に、候補のページタイトルを表示
   - ユーザーが選択すると、ブラケット内のテキストを候補で置き換える

2. **Mark の作成はしない**:

   - サジェストはテキストの置き換えのみ行う
   - UnifiedLinkMark の作成は InputRule に任せる

3. **ブラケットは残す**:
   - ユーザーが `]` を入力してブラケットを閉じるまで、ブラケットは残る

---

## テスト

### 手動テストシナリオ

#### シナリオ 1: サジェストなしでブラケット入力

1. `[` を入力 → 自動で `[]` に補完（auto-bracket plugin）
2. ブラケット内に `テストページ` と入力
3. カーソルを `]` の後ろに移動（または右矢印キー）
4. **期待結果**: InputRule が発動し、`[テストページ]` が UnifiedLinkMark に変換される
5. **確認**: ページが存在する場合は青色、存在しない場合は赤色で表示

#### シナリオ 2: サジェストで候補選択

1. `[` を入力 → 自動で `[]` に補完
2. `テス` と入力
3. サジェストに「テストページ」が表示される
4. 候補を選択（Enter または Click）
5. **期待結果**: `[テストページ` に置き換わる（プレーンテキスト、ブラケットは残る）
6. `]` を入力
7. **期待結果**: InputRule が発動し、UnifiedLinkMark に変換される
8. **確認**: ページが存在する場合は青色で表示

#### シナリオ 3: 存在しないページへのリンク

1. `[存在しないページ]` と入力
2. **期待結果**: InputRule が発動し、UnifiedLinkMark に変換される
3. **確認**: 赤色（pending 状態）で表示される
4. リンクをクリック
5. **期待結果**: ページ作成ダイアログが表示される

---

## 残課題

### タグ記法の修正

タグ記法 `#テキスト` については、以下の修正が必要です:

1. **シャープの重複問題**の修正
2. **候補選択時の動作**の改善

タグ記法の仕様を明確にした上で、別途修正を行います。

---

## 設計上の学び

### サジェスト機能の位置づけ

**重要**: サジェスト機能は**入力補助**であり、**Mark 作成機能ではない**

- InputRule: ユーザーがパターン（`[text]`）を完成させたときに自動変換
- Suggestion: ユーザーの入力を補助し、候補を提示してテキスト入力を効率化

この役割分担を明確にすることで、以下のメリットがあります:

1. **一貫性**: InputRule が Mark 変換の唯一の責任を持つ
2. **保守性**: サジェスト機能がシンプルになり、バグが減る
3. **拡張性**: 新しいパターンを追加する際に、InputRule を追加するだけで済む

---

## 関連ドキュメント

- [調査レポート: サジェスト候補選択時の問題](./20251013_01_suggestion-bug-investigation.md)
- [前回の修正: ブラケット記法サジェスト修正](./20251013_02_bracket-suggestion-fix.md)
- [InputRule 実装](../../../lib/tiptap-extensions/unified-link-mark/input-rules/bracket-rule.ts)
- [UnifiedLinkMark 設計書](../../../03_design/features/unified-link-mark-design.md)

---

## 作成日時

- 作成: 2025-10-13
- 最終更新: 2025-10-13
