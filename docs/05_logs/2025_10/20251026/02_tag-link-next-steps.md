# タグ機能デバッグ - 次のステップ

このドキュメントは、タグリンク問題の調査を継続するための具体的な手順を記載しています。

## 実施済みの準備

### 1. デバッグログの詳細化 ✅

**ファイル**: `lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts`

**変更内容**:
- `DEBUG_TAG_DUPLICATION`フラグを`true`に設定
- ログ出力を大幅に強化:
  - `matchFull`: 正規表現のフルマッチ
  - `matchCaptured`: キャプチャグループ（タグ名）
  - `rangeFrom`, `rangeTo`: マッチ範囲
  - `docTextAtRange`: 範囲のテキスト
  - `docTextBefore`, `docTextAfter`: 前後のコンテキスト
  - `cursorPosition`: カーソル位置
  - トランザクション実行の詳細

### 2. 調査ログの作成 ✅

**ファイル**: `docs/05_logs/2025_10/20251026/01_tag-link-issue-investigation.md`

**内容**:
- これまでの調査内容の詳細記録
- 実施した修正の履歴
- 次に調査すべき7つのポイント
- 推奨される次のステップ（優先順位付き）

---

## 次に実施すべき作業

### ステップ1: 実際のエディタでのデバッグログ確認 🔴 最優先

**手順**:

1. **開発サーバーを起動**
   ```bash
   npm run dev
   ```

2. **ブラウザでノートエディタを開く**
   - URLを開く（例: `http://localhost:3000/notes/new`）
   - ブラウザのDevTools（F12）を開く
   - Consoleタブを表示

3. **ログレベルを調整**
   - Consoleで以下を実行してログレベルを確認:
   ```javascript
   // pinoのログレベルを確認
   localStorage.getItem('logLevel')
   
   // デバッグレベルに設定
   localStorage.setItem('logLevel', 'debug')
   
   // ページをリロード
   location.reload()
   ```

4. **段階的にタグを入力**
   - エディタに移動
   - 以下を1文字ずつゆっくり入力:
     - `#` → ログを確認
     - `a` → ログを確認
     - `a` → ログを確認
     - `a` → ログを確認

5. **各段階で確認すべき項目**
   - InputRuleのhandlerが呼ばれているか？
   - 呼ばれている場合:
     - `matchFull`の値は？
     - `matchCaptured`の値は？
     - `rangeFrom`と`rangeTo`は？
     - 何回呼ばれているか？（`Call #1`, `Call #2`...）
   - 呼ばれていない場合:
     - なぜ呼ばれないのか？（正規表現がマッチしていない？）

6. **ログの記録**
   - Consoleの出力をコピーして保存
   - 特に`[TagRule-DEBUG]`で始まる行に注目

---

### ステップ2: DOM構造の確認 🟡 優先

**手順**:

1. DevToolsの**Elements**タブを開く

2. `#a`を入力後のDOM構造を確認:
   ```html
   <!-- 期待される構造 -->
   <p>
     <a class="unilink" data-variant="tag">#a</a>
   </p>
   ```

3. 次に`a`を追加（`#aa`）:
   - DOM構造がどう変化するか？
   - 新しい`<a>`タグが作られる？
   - 既存の`<a>`タグが拡張される？
   - それとも通常テキストとして追加される？

4. 最後に`a`を追加（`#aaa`）:
   - 同様にDOM構造を確認

5. **スクリーンショットを撮影**
   - 各段階のDOM構造
   - Elements > Inspect element で該当箇所をハイライト

---

### ステップ3: ProseMirrorのドキュメント状態確認 🟡 優先

**手順**:

1. Consoleで以下を実行してエディタインスタンスを取得:
   ```javascript
   // グローバル変数として保存されている可能性
   window.editor
   
   // または、DOMから取得
   document.querySelector('.ProseMirror').__editor
   ```

2. ドキュメント構造を確認:
   ```javascript
   // JSONとして出力
   editor.getJSON()
   
   // または
   editor.state.doc.toJSON()
   ```

3. 各入力段階での構造を記録:
   - `#a`入力後
   - `#aa`入力後
   - `#aaa`入力後

4. **確認すべきポイント**:
   - `marks`配列の内容
   - `text`プロパティの値
   - マークの`attrs`（特に`raw`と`text`）

---

### ステップ4: InputRuleのトリガー条件を調査 🟢 推奨

**調査内容**:

TipTapのInputRuleがいつ実行されるか確認。

**仮説**:
- A: 各文字入力ごとに実行される
- B: スペース/Enter押下時のみ実行される
- C: 特定の条件下でのみ実行される

**検証方法**:

1. `#`だけ入力 → InputRule実行される？
2. `a`を追加 → InputRule実行される？
3. `a`を追加 → InputRule実行される？
4. `a`を追加 → InputRule実行される？

各段階でログの`Call #`番号をチェック。

**期待される動作**:
- 理想: `#aaa`の時点で1回だけInputRuleが実行
- 現実: 各文字ごとに実行される可能性

---

### ステップ5: 既存マークの重複チェックロジックを検証 🟢 推奨

**確認箇所**:
```typescript
// CRITICAL: Check if the range already has this mark
let hasExistingMark = false;
state.doc.nodesBetween(from, to, (node) => {
  if (node.isText && node.marks.some((m) => m.type === markType)) {
    hasExistingMark = true;
    return false;
  }
});

if (hasExistingMark) {
  debugLog("SKIP", "mark already exists on this range", { from, to });
  return;
}
```

**仮説**:
`#a`でマークが作成された後、`#aa`や`#aaa`のInputRuleが実行されても、既存マーク検出により抑制される。

**検証方法**:
1. ログで`"mark already exists"`メッセージが出力されるか確認
2. 出力される場合、どのタイミングで出力されるか
3. `from`と`to`の値を確認

---

### ステップ6: 一時的な回避策のテスト 🔵 検討

**方法1**: 既存マークチェックを一時的に無効化

```typescript
// 以下のコードをコメントアウト
/*
let hasExistingMark = false;
state.doc.nodesBetween(from, to, (node) => {
  if (node.isText && node.marks.some((m) => m.type === markType)) {
    hasExistingMark = true;
    return false;
  }
});

if (hasExistingMark) {
  debugLog("SKIP", "mark already exists on this range", { from, to });
  return;
}
*/
```

**テスト**:
この状態で`#aaa`を入力して動作を確認。

**方法2**: Suggestion Pluginを一時的に無効化

エディタ設定で:
```typescript
extensions: [
  StarterKit,
  UnifiedLinkMark.configure({
    // Suggestionプラグインを無効化
  })
]
```

---

### ステップ7: 最小再現ケースの作成 🔵 検討

**目的**: 
問題を最小限のコードで再現できるかテスト。

**作成するファイル**:
`test-minimal-tag.html`

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/@tiptap/core"></script>
  <script src="https://unpkg.com/@tiptap/starter-kit"></script>
  <style>
    .ProseMirror { border: 1px solid #ccc; padding: 10px; min-height: 200px; }
  </style>
</head>
<body>
  <div id="editor"></div>
  <script>
    // 最小構成のエディタ
    const editor = new Editor({
      element: document.getElementById('editor'),
      extensions: [StarterKit],
      content: '<p>Type here...</p>',
    });
    
    // InputRuleを手動で追加
    // ...
  </script>
</body>
</html>
```

---

## 予想されるシナリオと対策

### シナリオA: InputRuleが各文字ごとに実行される

**症状**:
- `#`入力 → InputRule実行なし（マッチしない）
- `a`追加 → InputRule実行、`#a`がマーク化
- `a`追加 → InputRule実行、しかし既存マーク検出で抑制
- `a`追加 → InputRule実行、しかし既存マーク検出で抑制

**対策**:
既存マークの範囲判定を修正。現在のマッチがより長い場合は、既存マークを削除して新しいマークを適用。

```typescript
// 既存マークの範囲を取得
let existingMarkRange = null;
state.doc.nodesBetween(from, to, (node, pos) => {
  if (node.isText && node.marks.some((m) => m.type === markType)) {
    existingMarkRange = { from: pos, to: pos + node.nodeSize };
    return false;
  }
});

// 新しいマッチの方が長い場合は置き換え
if (existingMarkRange) {
  const newLength = text.length;
  const existingLength = existingMarkRange.to - existingMarkRange.from;
  
  if (newLength > existingLength) {
    // 既存マークを削除して新しいマークを適用
    debugLog("REPLACE", "Replacing shorter mark with longer one", {
      existing: existingMarkRange,
      new: { from, to, length: newLength }
    });
    // 処理を続行
  } else {
    debugLog("SKIP", "Existing mark is same or longer", {
      existing: existingMarkRange,
      new: { from, to, length: newLength }
    });
    return;
  }
}
```

---

### シナリオB: 正規表現が部分的にしかマッチしない

**症状**:
- `#aaa`を入力しても、正規表現が`#a`のみマッチ

**対策**:
正規表現パターンを再確認。現在は修正済みだが、念のため検証。

---

### シナリオC: トランザクションが正しく適用されない

**症状**:
- InputRuleが正しく実行されている
- ログも正常
- しかしDOM/ドキュメントが期待通りに更新されない

**対策**:
トランザクションの実行を確認。`chain().run()`の戻り値をチェック。

```typescript
const result = chain()
  .focus()
  .deleteRange({ from, to })
  .insertContent({ type: "text", text, marks: [{ type: "unilink", attrs }] })
  .run();

debugLog("TRANSACTION_RESULT", "Chain execution result", { 
  success: result,
  from,
  to,
  text
});
```

---

## まとめ

### 現在の状態
- ✅ デバッグログ強化完了
- ✅ 調査ドキュメント作成完了
- 🔴 **次のステップ: 実際のエディタでデバッグログを確認（最優先）**

### 必要な作業時間の見積もり
- ステップ1（ログ確認）: 15-30分
- ステップ2（DOM確認）: 10-15分
- ステップ3（ProseMirror状態確認）: 10-15分
- ステップ4-7: 必要に応じて実施

### 成功の判定基準
以下のいずれかが確認できれば、根本原因が特定できる:
1. InputRuleが各文字ごとに実行され、既存マーク検出で抑制されている
2. InputRuleが1回だけ実行されるが、トランザクションが失敗している
3. 正規表現のマッチが期待と異なる
4. 他のプラグインが干渉している

---

**作成日時**: 2025-10-26 20:50  
**次回更新予定**: デバッグログ確認後
