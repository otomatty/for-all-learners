# 解決済み: リンク状態更新のタイミング問題

**作成日**: 2025-10-19  
**状態**: ✅ 解決済み  
**重要度**: High  

---

## 🐛 問題の概要

InputRule でマークが生成されても、resolver-queue で state manager がマークを見つけられず、リンク状態が「pending」のままになっていました。

### ログ証拠

```
[StateManager] No marks found to update
foundMarks: 0
```

結果として、リンク先が見つかったにもかかわらず、UI が "読み込み中" のまま変わりませんでした。

---

## 🔍 根本原因

### 1. **Transaction のタイミング問題**

```typescript
// ❌ 問題のあるパターン
chain()
  .focus()
  .deleteRange({ from, to })
  .insertContent({
    type: "text",
    text: text,
    marks: [{ type: context.name, attrs }]
  })
  .run();

// その直後に
enqueueResolve({ key, raw, markId, editor }); // ← mark がまだ document にない！
```

**理由**: `insertContent` は非同期処理で、直後に `enqueueResolve` を呼ぶ時点では mark がまだ document に反映されていない

### 2. **state.schema.marks の参照間違い**

```typescript
// ❌ 誤り（修正済み）
const markType = state.schema.marks.unifiedLink;

// ✅ 正しい（以前修正）
const markType = state.schema.marks.unilink;
```

### 3. **state manager での state 取得の問題**

```typescript
// ❌ 古い state を参照
const { state, dispatch } = editor.view;

// ✅ 最新の state を取得
const state = editor.state;
```

---

## ✅ 実装の修正

### 修正内容

#### 1. **tag-rule.ts**

```typescript
// 修正前
chain()
  .focus()
  .deleteRange({ from, to })
  .insertContent({
    type: "text",
    text: text,
    marks: [{ type: context.name, attrs }]
  })
  .run();

enqueueResolve({
  key, raw, markId, editor: context.editor, variant: "tag"
});

// 修正後
chain()
  .focus()
  .deleteRange({ from, to })
  .insertContent({
    type: "text",
    text: text,
    marks: [{ type: "unilink", attrs }]  // ← hardcoded "unilink"
  })
  .run();

// queueMicrotask で遅延実行 - transaction が確実に適用されるまで待つ
queueMicrotask(() => {
  enqueueResolve({
    key, raw, markId, editor: context.editor, variant: "tag"
  });
});
```

#### 2. **bracket-rule.ts**

同様の修正

#### 3. **state-manager.ts**

```typescript
// 修正前
const { state, dispatch } = editor.view;

// 修正後
const state = editor.state;
// ...
editor.view.dispatch(tr);
```

---

## 📊 実行フロー の改善

### Before

```
InputRule:insertContent
  ↓
enqueueResolve (mark がまだ document にない)
  ↓
resolver-queue: state.doc.descendants (古い document を参照)
  ↓
mark が見つからない
  ↓
updateMarkState 失敗
```

### After

```
InputRule:insertContent
  ↓
transaction commit (mark が document に反映される)
  ↓
queueMicrotask (次の microtask 実行時に)
  ↓
enqueueResolve (mark が確実に document にある)
  ↓
resolver-queue: state.doc.descendants (最新 document を参照)
  ↓
mark が見つかる
  ↓
updateMarkState 成功 ✓
  ↓
UI が更新される（"exists" / "missing" 状態に反映）
```

---

## 🧪 テスト結果

```
✅ tag-rule.test.ts:       27/27 PASS
✅ bracket-rule.test.ts:   10/10 PASS
✅ utils.test.ts:          32/32 PASS
✅ index.test.ts:          13/13 PASS
━━━━━━━━━━━━━━━━━━━━━
Total: 82/82 PASS
```

---

## 🎯 修正による改善

### UI の動作

| ステップ | Before | After |
|---------|--------|-------|
| ` #テスト` + Enter | ⏳ 読み込み中... | ✅ 即座に更新 |
| キャッシュヒット | ❌ 状態が反映されない | ✅ "exists" に更新 |
| 未見つかり | ❌ pending のまま | ✅ "missing" に更新 |

### パフォーマンス

- **タイミング**: transaction commit 後の次の microtask で実行
- **遅延**: < 1ms （ほぼ即座）
- **信頼性**: transaction が確実に適用されてから resolver-queue が実行

---

## 🔗 関連ドキュメント

- [Mark Type Schema 参照バグ](./20251019_18_mark-type-schema-reference-bug.md)
- [シンプル化された重複 Mark 防止メカニズム](./20251019_17_simplified-mark-duplication-fix.md)

---

## ✨ 学習

### JavaScript のイベントループの重要性

**時系列:**
1. **Synchronous Code** (InputRule handler)
2. **Microtask Queue** (queueMicrotask)
3. **Macrotask Queue** (setTimeout)

`queueMicrotask` を使うことで、Promise.resolve().then() と同じタイミングで実行され、transaction が確実に適用される。

### 改善案

```typescript
// ✅ 推奨: microtas を使う
queueMicrotask(() => {
  // transaction 確実に完了
  updateMarkState(...);
});

// ❌ 非推奨: setTimeout（遅延が大きい）
setTimeout(() => {
  updateMarkState(...);
}, 0);
```

---

**結論**: InputRule から non-blocking で state manager を呼び出す際は、必ず `queueMicrotask` で遅延実行することで、transaction の完了を保証できます。

