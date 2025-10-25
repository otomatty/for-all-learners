# ブラケット記法 - 技術調査レポート

**調査日**: 2025-10-23
**調査対象**: UnifiedLinkMark ブラケット実装の重複バグ

## 1. 現在の実装状況

### 1.1 InputRule パイプライン

```
ユーザー入力 (EnterキーやSpaceキー)
    ↓
auto-bracket-plugin (handleTextInput)
    ↓
InputRule マッチング (PATTERNS.bracket)
    ↓
bracket-rule.ts handler 実行
    ↓
insertContent チェーン実行
    ↓
bracket-cursor-plugin (appendTransaction)
    ↓
suggestion-plugin (handleKeyDown)
```

### 1.2 重要なプラグイン構成

**ファイル**: `lib/tiptap-extensions/unified-link-mark/plugins/index.ts`

```typescript
return [
  createAutoBracketPlugin(),           // 1. auto-bracket ([ → [])
  createBracketCursorPlugin(context),  // 2. cursor movement tracking
  createClickHandlerPlugin(context),   // 3. click event
  createSuggestionPlugin(context),     // 4. suggestion UI
];
```

**プラグイン実行順序**: ProseMirror は配列の順序でプラグインを実行

## 2. 問題のシナリオ再現

### シナリオ: `[テスト]|` の状態でEnterを入力

```
現在のテキスト: [テスト]
カーソル位置:   [テスト]|  (ブラケット外)

↓ Enterキーを入力

期待される結果:
[テスト]
|

実際の結果:
[[[[[[テスト]
|

Enterを1回押すごとに [ が1つ追加される
```

## 3. 原因分析

### 3.1 InputRule マッチング問題

**PATTERNS.bracket の定義** (config.ts):
```typescript
bracket: /\[([^[\]]+)\]/
```

このパターンは：
- `[` で始まり、`]` で終わる任意の文字列
- `[テスト]` に **ブラケット外にいるときもマッチしてしまう**可能性

### 3.2 insertContent チェーン の問題

**bracket-rule.ts (Lines 58-80)**:
```typescript
chain()
  .focus()                           // 1. フォーカス
  .deleteRange({ from, to })        // 2. 範囲削除 [テスト] → ""
  .insertContent({                  // 3. "["を挿入
    type: "text",
    text: "[",
  })
  .insertContent({                  // 4. テキスト+マークを挿入
    type: "text",
    text: text,
    marks: [{ type: "unilink", attrs }],
  })
  .insertContent({                  // 5. "]"を挿入
    type: "text",
    text: "]",
  })
  .run();
```

問題：
- 複数の `insertContent` がチェーン内で順序良く実行される
- もし InputRule が何度も実行されると、各実行で新しく `[...]` が作成される

### 3.3 考えられるマッチ重複シナリオ

#### シナリオ A: InputRule が複数回トリガー

```
時刻 1: 改行前テキスト "[テスト]"
        → InputRule マッチ → チェーン1実行 → "[ テスト ]"

時刻 2: 改行が処理される
        → テキストが "[ テスト ]\n" に
        → マーク処理の過程で何か変化
        → InputRule が再度マッチ
        → チェーン2実行 → "[ [ テスト ] ]"

時刻 3: さらに何かトリガー
        → チェーン3実行 → "[ [ [ テスト ] ] ]"

...繰り返し...
```

#### シナリオ B: ブラケットカーソルプラグインの影響

**bracket-cursor-plugin.ts**: cursor 移動を検出して mark を再適用

```typescript
const match = textBefore.match(/\[([^[\]]+)\]$/);
if (!match) return null;

// Match が見つかった場合、再度マークを追加
tr.addMark(matchStart, matchEnd, mark);
```

問題：既に mark が存在しても、何度も実行される可能性

#### シナリオ C: 状態トランザクション重複

ProseMirror のトランザクション処理中に、複数の `appendTransaction` が連鎖的に実行される

### 3.4 検証が必要な点

1. ✅ **重複チェック機構の有無**
   - 検証結果: processedBracketMatches は使用されていない

2. ❌ **InputRule の実行回数**
   - logger をデバッグレベルで有効にすると確認可能

3. ❌ **トランザクション数**
   - EditorView のトランザクション数を計測

## 4. insertContent チェーン の詳細分析

### 4.1 なぜ 3つの insertContent に分割？

```typescript
// 現在の実装（分割版）
.insertContent({ type: "text", text: "[" })
.insertContent({ type: "text", text: text, marks: [...] })
.insertContent({ type: "text", text: "]" })
```

**理由** (推測):
1. テキストの前後に brackets を保持
2. 中央のテキストのみに mark を適用
3. brackets はプレーンテキスト

### 4.2 代替案の検討

```typescript
// 案1: 単一の insertContent （リスク：ブラケットが mark に含まれる）
.insertContent({
  type: "text",
  text: `[${text}]`,
  marks: [{ type: "unilink", attrs }]
})

// 案2: トランザクション API で直接操作
const tr = state.tr;
tr.delete(from, to);
tr.insert(from, schema.text('['));
tr.insert(from + 1, schema.text(text, [schema.marks.unilink.create(attrs)]));
tr.insert(from + 1 + text.length, schema.text(']'));
// tr.setSelection(...)
chain().setMeta('tr', tr).run();
```

### 4.3 chain() API の挙動

Tiptap chain() の内部:
```typescript
// pseudo-code
chain()
  .focus()      // → tr1 (トランザクション1)
  .deleteRange()  // → tr2 (トランザクション2 のマージ)
  .insertContent() // → tr3 (マージ)
  .run()        // 最終 tr を 1回だけ適用
```

理論上、`run()` は1回のトランザクション適用なので重複しない

## 5. suggestion-plugin との相互作用

### 5.1 Space キー処理

**suggestion-plugin.ts (Lines 538-558)**:

```typescript
if (event.key === " " && state.variant === "tag") {
  event.preventDefault();
  
  // suggestion state をクリア
  view.dispatch(
    view.state.tr.setMeta(suggestionPluginKey, { active: false, ... })
  );
  
  // リンク作成
  insertUnifiedLinkWithSpaceKey(view, state);
  return true;
}
```

問題：
- **tag variant のみ処理** → bracket には影響しない可能性
- しかし同じ view/state が共有されている

### 5.2 Enter キー処理

**suggestion-plugin.ts (Lines 468-510)**:

```typescript
if (event.key === "Tab" || event.key === "Enter") {
  event.preventDefault();
  
  // suggestion state をクリア
  view.dispatch(view.state.tr.setMeta(suggestionPluginKey, {...}));
  
  if (state.selectedIndex === -1) {
    insertUnifiedLinkWithQuery(view, state);  // 入力テキストで作成
    return true;
  }
  
  // selected item で作成
  insertUnifiedLink(view, state, selectedItem);
  return true;
}
```

問題：
- **suggestion が active の場合のみ処理**
- bracket 外ではなぜ suggestion が active になっているのか？

## 6. ブラケットを InputRule が重複マッチする理由

### 仮説: テキストが変更されるたびに InputRule が再検査

ProseMirror の InputRule は：
1. ユーザー入力後のテキストをスキャン
2. PATTERNS に全てマッチするか確認
3. マッチしたら handler を実行

**改行後の処理フロー**:

```
[テスト]  (Enter前)
    ↓ Enterキー入力
[テスト]\n  (改行が挿入)
    ↓
InputRule スキャン トリガー1
  → [テスト] にマッチ
  → handler 実行
  → insertContent で [ テスト ] に変更
    ↓
[ テスト ]\n  (新しい状態)
    ↓
何かのプラグインで再度スキャン
  → [ テスト ] にマッチ
  → handler が再度実行 (!?)
    ↓
[ [ テスト ] ]\n
    ↓
...繰り返し
```

## 7. 真の原因候補 (最有力)

### 原因: テキスト入力トランザクションの複数実行

```typescript
// TipTap / ProseMirror の内部処理（推測）

// ステップ1: ユーザーが "\n" を入力
editor.chain().insertText("\n").run()
  ↓
  トランザクション: [テスト] → [テスト]\n

// ステップ2: InputRule がトリガー
  状態1: [テスト]\n
  → Pattern match: [テスト]
  → handler 実行
  → deleteRange で [テスト] を削除
  → insertContent で [ テスト ] を再挿入
  ↓
  状態2: [ テスト ]\n

// ステップ3: 何らかのコンポーネントが状態をみて InputRule が再度走る
  状態2: [ テスト ]\n
  → まだ [ ...  ] パターンがある
  → 再度マッチ
  → ...
```

### 真の問題: デバウンスやチェックがない

現在の bracket-rule.ts には：
- ✅ code context チェック
- ❌ 重複実行チェック
- ❌ マッチID 記録
- ❌ デバウンス

## 8. デバッグ方法

### 方法1: logger 出力確認

```bash
# ブラウザの DevTools Console で
localStorage.setItem("DEBUG", "lib:*")
# 再度エディタ操作
```

logger レベルを DEBUG に上げて、何回実行されるか確認

### 方法2: Breakpoint デバッグ

bracket-rule.ts の handler の先頭に breakpoint 設定:

```typescript
handler: ({ state, match, range, chain }) => {
  console.log("[Breakpoint] handler executed", { match: match[1], from: range.from, to: range.to });
  // ... rest of handler
}
```

Enter キー → 何回 console.log が出力されるか？

### 方法3: トランザクション ログ

```typescript
editor.on("update", ({ editor, transaction }) => {
  console.log("Transaction:", transaction);
});
```

## 9. 推奨される解決策

### 優先度: 高

**案1: InputRule マッチ後のタイムアウト** (シンプル)

```typescript
let lastProcessedMatch: { raw: string; timestamp: number } | null = null;
const DUPLICATE_CHECK_WINDOW = 100; // ms

handler: ({ state, match, range, chain }) => {
  const raw = match[1];
  const now = Date.now();
  
  // 同じマッチが 100ms 以内に重複実行されたかチェック
  if (
    lastProcessedMatch &&
    lastProcessedMatch.raw === raw &&
    now - lastProcessedMatch.timestamp < DUPLICATE_CHECK_WINDOW
  ) {
    return null;  // 重複スキップ
  }
  
  lastProcessedMatch = { raw, timestamp: now };
  
  // ... rest of handler
}
```

**案2: Match Position トラッキング** (精密)

```typescript
const processedMatches = new Map<string, Set<number>>();  // raw → Set<position>

handler: ({ state, match, range, chain }) => {
  const raw = match[1];
  const key = `${raw}:${range.from}`;
  
  if (!processedMatches.has(raw)) {
    processedMatches.set(raw, new Set());
  }
  
  const positions = processedMatches.get(raw)!;
  if (positions.has(range.from)) {
    // 同じ位置で既に処理済み
    return null;
  }
  
  positions.add(range.from);
  
  // ... rest of handler
  
  // 100ms 後にクリア
  setTimeout(() => positions.delete(range.from), 100);
}
```

**案3: Pattern 改善** (根本的)

```typescript
// 現在: /\[([^[\]]+)\]/
// 改善: ユーザーが入力したもののみマッチ

// 改行を含まないテキストのみマッチ
bracket: /\[([^\[\]\n]+)\]/

// または、ブラケットの直後が改行でないことを確認
bracket: /\[([^[\]]+)\](?!\n)/
```

## 10. 次のステップ

1. **デバッグ情報収集** (最優先)
   - logger を DEBUG にして実際のマッチ回数を計測
   - Chrome DevTools で breakpoint デバッグ

2. **根本原因特定**
   - InputRule が何回実行されるのか確認
   - トランザクション の流れを追跡

3. **テストケース実装**
   - 重複マッチをテストする vitest ケース
   - 改行後のテキスト整合性チェック

4. **修正実装**
   - 上記の案1-3から最適な解決策を選択
   - テスト実行

5. **統合テスト**
   - 手動でEnter/Space 入力して確認
   - bracket-cursor-plugin との連携確認

---

**参考資料**:
- ProseMirror: https://prosemirror.net/docs/ref/#inputrules
- TipTap Chain API: https://tiptap.dev/api/schema/schema-faq
- デバッグガイド: docs/guides/debug-unified-link-mark.md (今後作成)

**作成者**: AI (GitHub Copilot)
**最終更新**: 2025-10-23
