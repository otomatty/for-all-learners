# ブラケットカーソルプラグインの実装

**日付**: 2025 年 10 月 14 日  
**作業者**: AI Assistant  
**関連機能**: UnifiedLinkMark - ブラケット記法の自動変換

## 作業概要

auto-bracket-close 機能との互換性を確保するため、カーソル移動を監視して閉じた括弧の外にカーソルが移動した時点で UnifiedLinkMark を適用する新しいプラグインを実装しました。

## 背景

### 問題

1. **auto-bracket-close の挙動**:

   - `[` を入力 → 即座に `[]` が作成され、カーソルは括弧内に配置
   - ユーザーが `abc` とテキストを入力 → `[abc]`
   - この時点では `]` が**新たに入力されていない**ため、InputRule は発動しない

2. **既存の InputRule の制約**:

   - InputRule は特定の文字が入力された時にのみ発動
   - `]` がすでに存在する状態では、ユーザーが括弧内でテキストを入力しても InputRule はトリガーされない

3. **パターン修正の限界**:
   - config.ts で `/\[([^[\]]+)\](?=\s|$|[.,!?;:])/` に修正
   - これは空白や句読点の後でのみ機能
   - ユーザーは `[abc]` と入力した直後にリンク化されることを期待

## 実装内容

### 1. bracket-cursor-plugin.ts の作成

**ファイル**: `lib/tiptap-extensions/unified-link-mark/plugins/bracket-cursor-plugin.ts`

#### 主な機能

- カーソル位置の変更を監視
- カーソルが閉じた括弧 `[text]` の外に移動したことを検出
- 自動的に UnifiedLinkMark を適用
- 解決キューに登録してページ ID を非同期で解決

#### コアロジック

```typescript
appendTransaction(_transactions, oldState, newState) {
  // 1. カーソルが移動したかチェック
  if (oldSelection.from === newSelection.from || !newSelection.empty) {
    return null;
  }

  // 2. カーソル位置の前のテキストを取得
  const textBefore = $from.parent.textBetween(
    Math.max(0, $from.parentOffset - 100),
    $from.parentOffset,
    null,
    "\ufffc",
  );

  // 3. 閉じた括弧パターンをマッチング
  const match = textBefore.match(/\[([^[\]]+)\]$/);
  if (!match) return null;

  // 4. 既存のunilinkマークがないか確認
  const existingMark = newState.doc.rangeHasMark(
    matchStart,
    matchEnd,
    newState.schema.marks.unilink,
  );
  if (existingMark) return null;

  // 5. UnifiedLinkMarkを適用
  const markId = nanoid();
  const mark = newState.schema.marks.unilink.create({
    key,
    raw,
    markId,
    variant: "bracket",
    state: "resolving",
  });
  tr.addMark(matchStart, matchEnd, mark);

  // 6. 解決キューに登録
  enqueueResolve({
    key,
    raw,
    markId,
    editor,
    variant: "bracket",
  });

  return tr;
}
```

### 2. プラグインの統合

**ファイル**: `lib/tiptap-extensions/unified-link-mark/plugins/index.ts`

```typescript
import { createBracketCursorPlugin } from "./bracket-cursor-plugin";

export function createPlugins(context: {
  editor: Editor;
  options: UnifiedLinkMarkOptions;
}) {
  return [
    createAutoBracketPlugin(),
    createBracketCursorPlugin(context.editor), // 追加
    createClickHandlerPlugin(context),
    createSuggestionPlugin(context),
  ];
}
```

## 技術的な詳細

### appendTransaction の使用

- ProseMirror の `appendTransaction` フックを使用
- トランザクションの後に追加のトランザクションを生成可能
- カーソル移動のような状態変化を検出するのに最適

### パターンマッチング

```typescript
const match = textBefore.match(/\[([^[\]]+)\]$/);
```

- カーソル位置の直前にある `[text]` パターンをマッチ
- `text` には括弧が含まれないことを保証
- `$` で文字列の終端（カーソル位置）を明示

### 重複適用の防止

```typescript
const existingMark = newState.doc.rangeHasMark(
  matchStart,
  matchEnd,
  newState.schema.marks.unilink
);
```

- 既に unilink マークが適用されている範囲はスキップ
- InputRule やユーザーの手動操作との競合を回避

## デバッグログ

実装には包括的なデバッグログを追加:

1. **カーソル移動検出**: `[BracketCursor] Cursor position changed`
2. **テキスト取得**: `[BracketCursor] Text before cursor`
3. **パターンマッチ失敗**: `[BracketCursor] No bracket pattern found`
4. **括弧検出**: `[BracketCursor] Detected cursor leaving closed bracket`
5. **重複スキップ**: `[BracketCursor] Range already has unilink mark, skipping`
6. **マーク適用**: `[BracketCursor] Applying unilink mark`
7. **解決キュー登録**: `[BracketCursor] Enqueueing resolve`

## 動作フロー

### シナリオ: ユーザーが `[テストページ]` と入力

1. **`[` を入力**

   - auto-bracket-plugin が `[]` を作成
   - カーソルは括弧内に配置: `[|]`

2. **`テストページ` と入力**

   - 結果: `[テストページ|]`
   - InputRule は発動しない（`]`を新たに入力していないため）

3. **右矢印キーでカーソルを移動**

   - 結果: `[テストページ]|`
   - カーソル位置が変更される

4. **bracket-cursor-plugin が発動**

   - カーソル移動を検出
   - `[テストページ]` パターンをマッチ
   - UnifiedLinkMark を適用: `markId`, `key: "テストページ"`, `state: "resolving"`

5. **ResolverQueue が処理**
   - ページ検索を実行
   - `state: "linked"` または `state: "unlinked"` に更新
   - StateManager がマークを更新

## 期待される効果

### 修正前

- `[テストページ]` と入力してもリンク化されない
- スペースや句読点を入力するまで InputRule が発動しない
- ユーザーは明示的なアクションを取る必要がある

### 修正後

- `[テストページ]` と入力してカーソルを移動するだけでリンク化
- auto-bracket-close とシームレスに連携
- 自然な入力フローを維持

## コード品質

### Biome チェック

- インポート順序を修正
- フォーマットをプロジェクト標準に統一
- タブインデント（プロジェクト設定に準拠）

### TypeScript

- 適切な型アノテーション
- 未使用パラメータに `_` プレフィックス
- logger を default import として修正

## テスト計画

### 手動テスト項目

1. **基本動作**

   - [ ] `[test]` と入力して右矢印キー → リンク化されるか
   - [ ] `[test]` と入力してスペース → リンク化されるか
   - [ ] `[test]` と入力して Enter → リンク化されるか

2. **既存ページ**

   - [ ] 既存ページタイトルでリンクが `state: "linked"` になるか
   - [ ] 正しいページ ID が設定されるか

3. **未作成ページ**

   - [ ] 存在しないページで `state: "unlinked"` になるか
   - [ ] クリックで作成ダイアログが表示されるか

4. **エッジケース**

   - [ ] `[[nested]]` のような入れ子括弧の処理
   - [ ] `[日本語タイトル]` の処理
   - [ ] `[title with spaces]` の処理
   - [ ] カーソルを戻して編集した場合の挙動

5. **重複防止**
   - [ ] 既にリンク化されている範囲を再度リンク化しないか
   - [ ] InputRule との競合が発生しないか

### ログ確認

ブラウザコンソールで以下のログが出力されることを確認:

```
[BracketCursor] Cursor position changed
[BracketCursor] Text before cursor
[BracketCursor] Detected cursor leaving closed bracket
[BracketCursor] Applying unilink mark
[BracketCursor] Enqueueing resolve
[ResolverQueue] Adding item to queue
[ResolverQueue] Processing batch
[StateManager] Dispatching state update
```

## 関連ドキュメント

- [UnifiedLinkMark 実装計画](../../04_implementation/plans/unified-link-mark/20251011_07_migration-plan.md)
- [作業ログ: 候補表示条件の修正](20251013_01_suggestion-display-fix.md)
- [作業ログ: デバッグログの追加](20251013_02_debug-logging.md)
- [作業ログ: パターン修正の試み](20251013_04_pattern-modification.md)

## 次のステップ

1. **テストの実施**

   - 手動テスト項目を実行
   - ログ出力を確認
   - 問題があれば修正

2. **タグ記法の修正**

   - `#tag` 記法でも同様の問題が発生している可能性
   - tag-cursor-plugin の作成を検討

3. **ドキュメント更新**
   - テスト結果を記録
   - 発見した問題を記録
   - ユーザーガイドの更新

## 学んだこと

### ProseMirror のトランザクションフック

- `appendTransaction` はトランザクション後の状態変化を検出できる
- カーソル移動、選択範囲の変更などを監視可能
- 複数の変更を単一のトランザクションにまとめられる

### InputRule の制約

- InputRule は文字入力時にのみ発動
- 既存の文字列には反応しない
- auto-complete のような機能と併用する場合は別のアプローチが必要

### プラグインアーキテクチャ

- 機能ごとにプラグインを分離することで保守性が向上
- InputRule、Suggestion、Cursor 監視など、それぞれ独立した責務
- デバッグもしやすい

## まとめ

auto-bracket-close 機能との互換性を確保するため、カーソル移動を監視する新しいプラグインを実装しました。これにより、ユーザーが `[title]` と入力してカーソルを移動するだけで自動的にリンク化されるようになります。

実装は以下の点で優れています:

- **シンプル**: 明確な責務、理解しやすいコード
- **堅牢**: 重複適用の防止、エラーハンドリング
- **デバッグ可能**: 包括的なログ出力
- **拡張可能**: tag 記法にも同様のアプローチを適用可能

次は実際のテストを行い、動作を確認する必要があります。
