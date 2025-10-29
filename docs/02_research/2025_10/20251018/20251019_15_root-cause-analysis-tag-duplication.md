# Tag 重複 (`##テスト`) 根本原因分析レポート

**作成日**: 2025-10-19  
**調査対象**: Tag InputRule による `##テスト` 生成問題  
**ステータス**: 根本原因特定完了  

---

## 📌 エグゼクティブサマリー

### 問題
ユーザーが ` #テスト` + Enter キーを入力すると、期待値 `#テスト` ではなく `##テスト` が表示される。

### 根本原因
**ProseMirror InputRule が同一テキストに対して 2 回異なる Range 位置でトリガーされ、各回で独立した Mark が挿入されている。**

### 検出プロセス

1. ユーザー ` #テスト` + Enter 入力
2. **Call #1 (21.023Z - compositionend 時)**
   - Range: `{from: 1, to: 5}`
   - テキスト: ` #テスト` の全体 (スペース+#+テスト)
   - Mark ID: `unilink-mgwxyh6o-fg9a0d` (新規)
   - 結果: `#テスト` (1個の#)

3. **~1.8 秒後に Call #2 (22.824Z - handleKeyDown 時)**
   - Range: `{from: 2, to: 5}`
   - テキスト: `#テスト` (スペース無し)
   - Mark ID: `unilink-mgwxyikp-is1mh2` (新規)
   - 結果: `##テスト` (1個目の#の前に2個目の#が挿入)

### なぜ時間差が問題か
実装していた time-window 方式（50ms）では検出できない。2 つの Call は **1.8 秒以上離れている** ため、別のイベントとして処理された。

---

## 🔍 詳細分析

### A. アーキテクチャコンテキスト

#### ProseMirror InputRule の動作原理

```
テキスト入力
    ↓
InputRule パターンマッチング
    ↓
複数の位置で同じパターンにマッチ
    ↓
各位置で handler() 呼び出し（複数回）
    ↓
各回で Mark 挿入（Range 位置が異なる）
    ↓
複数 Mark = 複数の表示
```

#### なぜ複数の Range で マッチするのか

TextNode のコンテンツが以下のような場合：

```
Position: 0 1 2 3 4 5
Content:  [space] # テ ス ト
```

InputRule パターン `/#([^\s]+)/` は複数の場所でマッチ可能：

| マッチ | From | To | テキスト |
|--------|------|----|-|
| Call #1 | 1 | 5 | `#テスト` |
| Call #2 | 2 | 5 | `テスト`（#は自動付与）|

**重要**: InputRule は同一マッチでも異なる Range 位置でトリガーされることがある。これは特に:
- IME (日本語入力) の確定時
- compositionend → handleKeyDown の遷移時
- ProseMirror の内部最適化による複数回実行

に発生する。

### B. イベントフローの詳細

#### Call #1 の詳細 (compositionend イベント)

```
時刻: 21.023Z
トリガー: compositionend (日本語入力確定)
Range: {from: 1, to: 5}
Stack trace: 
  → compositionend @ InputRule.ts:247
  → run$1 @ InputRule.ts:121
  → handler @ tag-rule.ts:70

処理内容:
1. debugLog("CALL", ...) → Call #1 ログ出力
2. isInCodeContext() → false (コード外)
3. hasUnifiedLinkMark() → false (Mark未存在)
4. chain().insertText(...).setMark(...).run() 実行
   → DOM に Mark 挿入
   → 表示: "#テスト" (正常)
5. enqueueResolve() → resolver-queue に登録
```

#### Call #2 の詳細 (handleKeyDown イベント - Enter キー)

```
時刻: 22.824Z (1.8秒後)
トリガー: handleKeyDown @ InputRule.ts:276 (Enterキー押下)
Range: {from: 2, to: 5}
Stack trace:
  → handleKeyDown @ InputRule.ts:276
  → editHandlers.keydown @ index.js:3155
  → eventHandlers.<computed> @ index.js:3077

処理内容:
1. debugLog("CALL", ...) → Call #2 ログ出力
2. isInCodeContext() → false (コード外)
3. hasUnifiedLinkMark() → false ⚠️ これが重要
   - range {2:5} = "#テスト" テキスト部分
   - 最初の "#" は range 外 (位置1)
   - 1番目の Mark (位置1-5) は検出されない
4. chain().insertText(...).setMark(...).run() 実行
   → 別の Mark が挿入される
   → 表示: "##テスト" (問題)
5. enqueueResolve() → resolver-queue に登録
```

### C. 既存防止メカニズムが失敗した理由

#### 実装された time-window 方式の問題

```typescript
// 実装内容 (tag-rule.ts:50-67)
const DUPLICATE_DETECTION_WINDOW_MS = 50;

if (currentTime - lastProcessedTime < DUPLICATE_DETECTION_WINDOW_MS) {
  processedInCurrentWindow++;
  if (processedInCurrentWindow > 1) {
    return null; // Skip
  }
}
lastProcessedTime = currentTime;
```

**失敗理由:**
- Call #1: 21.023Z で処理
- Call #2: 22.824Z で処理
- 時間差: **1.801 秒 > 50ms**
- 結論: time-window 判定が失敗 ❌

**そもそもの設計誤り:**
- 時間差に基づく重複検出は、イベントループの非決定性により不適切
- compositionend と handleKeyDown は設計上別のイベントとして扱われる
- ProseMirror では同一入力に対する複数トリガーは**一般的**

---

## 🎯 なぜこの問題が起きたのか（根本的な考察）

### 1. **InputRule の設計的制限**

ProseMirror InputRule は pattern-based マッチングを行い、**複数の Range でマッチすることが想定されている**。

```
問題: find パターン /#([^\s]+)/ が複数の位置でマッチする
想定: handler() は各マッチに対して1回ずつ呼ばれる
現実: 同じテキストでも異なる Range で複数回呼ばれる
```

### 2. **IME (日本語入力) の複雑性**

日本語入力では 2 つのステップが存在:

```
ステップ1: compositionend (入力確定)
  → InputRule トリガー (Call #1)
  
ステップ2: handleKeyDown (Enter キー検出)
  → InputRule 再度トリガー (Call #2)
```

両イベント時に同じパターンが再マッチするため、重複が不可避。

### 3. **Mark 存在チェック (hasUnifiedLinkMark) の限界**

```typescript
// 現在の実装
function hasUnifiedLinkMark(state: EditorState, range: { from: number; to: number }): boolean {
  let found = false;
  state.doc.nodesBetween(range.from, range.to, (node) => {
    if (node.marks.some((m) => m.type.name === "unifiedLinkMark")) {
      found = true;
    }
  });
  return found;
}
```

**限界:**
- Call #1: range {1, 5} → Mark 挿入
- Call #2: range {2, 5} → range の **一部だけが被覆** される
  - 位置 1 にある Mark は range {2, 5} 内では検出されない
  - 結果: `hasUnifiedLinkMark()` が false を返す ❌

---

## 📊 状態遷移図

```
┌─────────────────────────────────────────┐
│ ユーザー入力: " #テスト" + Enter        │
└──────────────────┬──────────────────────┘
                   │
                   ▼
      ┌────────────────────────┐
      │ compositionend イベント │
      │ (IME入力確定)          │
      └────────┬───────────────┘
               │
               ▼
      ┌────────────────────────┐
      │ InputRule Call #1      │
      │ Range: {1, 5}          │
      └────────┬───────────────┘
               │
               ▼
      ┌────────────────────────┐
      │ handler() 実行          │
      │ ✓ isInCodeContext=false │
      │ ✓ hasUnifiedLinkMark=false
      │ → setMark() 実行 ✓      │
      │ → "mark-id-1" 生成 ✓   │
      └────────┬───────────────┘
               │
               ▼
      DOM: "#テスト" (1個の#)
      
      [~1.8秒経過]
      
               ▼
      ┌────────────────────────┐
      │ handleKeyDown イベント  │
      │ (Enterキー検出)        │
      └────────┬───────────────┘
               │
               ▼
      ┌────────────────────────┐
      │ InputRule Call #2      │
      │ Range: {2, 5}          │
      └────────┬───────────────┘
               │
               ▼
      ┌────────────────────────┐
      │ handler() 実行          │
      │ ✓ isInCodeContext=false │
      │ ✗ hasUnifiedLinkMark=false ⚠️
      │  (Range {2,5}では検出  │
      │   されない)             │
      │ → setMark() 実行 ✓      │
      │ → "mark-id-2" 生成 ✓   │
      └────────┬───────────────┘
               │
               ▼
      DOM: "##テスト" (2個の#) ❌
```

---

## 🛠️ 既存実装の不十分さ

### A. time-window 方式の根本的な問題

| 問題 | 説明 |
|------|------|
| **時間ベース** | イベントループの非決定性により、時間差に頼った判定は不可靠 |
| **ウィンドウサイズ** | 50ms は arbitrary（恣意的）で、保証がない |
| **イベント独立性** | compositionend と handleKeyDown は ProseMirror では独立したイベント |

### B. Mark 存在チェックの限界

| 問題 | 説明 |
|------|------|
| **部分的マッチ** | 複数の Range がある場合、一部の Range では既存 Mark が検出されない |
| **位置ベース** | Range が異なると、同じ TextNode でも検出失敗 |

---

## ✅ 解決に必要な条件

### 要件1: Range レベルの重複検出

```
同じ TextNode に対して複数回 handler が呼ばれる場合、
Range 位置を比較して重複を判定する必要がある。

例:
  Call #1: Range {1, 5} ← 新規
  Call #2: Range {2, 5} ← 既に {1, 5} が処理済みで、
                           部分的に重複 → SKIP
```

### 要件2: Range 交差判定

```typescript
// 2つの Range が交差しているか判定
function rangesOverlap(r1: Range, r2: Range): boolean {
  return !(r2.to <= r1.from || r1.to <= r2.from);
}

例:
  rangesOverlap({1, 5}, {2, 5})  // true → 交差している
  rangesOverlap({1, 5}, {5, 8})  // false → 交差していない
```

### 要件3: イベント型の区別

```
compositionend と handleKeyDown が異なるタイミングでトリガーされる
ことを認識し、同一イベントサイクル内での重複のみを検出する
必要がある。

または、EventLoop の 1 イテレーション内での実行を追跡する。
```

---

## 📋 関連する ProseMirror ドキュメント

### InputRule の実装

**ファイル**: `node_modules/@tiptap/core/dist/InputRule.ts`

InputRule の `handler()` は以下のタイミングで呼ばれる:

1. **compositionend イベント時**
   ```typescript
   // InputRule.ts:247
   if (compositionNode) {
     compositionNode.removeEventListener("compositionend", compositionendHandler);
     compositionendHandler();
   }
   ```

2. **handleKeyDown イベント時**
   ```typescript
   // InputRule.ts:276
   handleKeyDown(event: KeyboardEvent) {
     // ...
     this.run$1();  // ← 再度トリガー
   }
   ```

### ProseMirror Mark の適用

Mark は **位置を持つ** TextAttribute として扱われる:

```typescript
node.marks  // 同じノードにも複数の Mark を持つ可能性がある

// Mark が重複することはない（同じ type の Mark は1つ）
// しかし、異なる Range での挿入は別のイベントとして扱われる
```

---

## 🎓 得られた知見

### 1. **時間ベースの重複検出は危険**
   - イベントループの非決定性
   - OS スケジューリング影響
   - ネットワーク遅延の影響

### 2. **Range ベースの比較が必須**
   - InputRule は複数 Range でマッチする
   - 各 Range は独立した handler 呼び出しを引き起こす
   - Range 交差判定で重複を識別できる

### 3. **IME 入力の複雑性**
   - compositionend と handleKeyDown は 別イベント
   - 両者が同じパターンを再マッチする可能性がある
   - 日本語入力環境では必ず2段階の処理が発生

### 4. **Mark 存在チェックの改善が必要**
   - 現在の `nodesBetween()` は Range 限定的
   - 全体の TextNode を走査し、既存 Mark を確認すべき

---

## 📌 次のステップ

### 1. Range 交差検出の実装
```typescript
// tag-rule.ts に追加
const processedRanges: { from: number; to: number }[] = [];

function hasOverlappingRange(from: number, to: number): boolean {
  return processedRanges.some(r => 
    !(to <= r.from || from >= r.to)
  );
}

// handler で使用
if (hasOverlappingRange(range.from, range.to)) {
  return null; // Skip
}
processedRanges.push(range);
```

### 2. Mark 存在チェックの強化
```typescript
function hasUnifiedLinkMarkInNode(
  state: EditorState, 
  pos: number
): boolean {
  const node = state.doc.nodeAt(pos);
  return node?.marks.some(m => m.type.name === 'unifiedLinkMark') ?? false;
}
```

### 3. テスト追加
- Range 交差ケースのユニットテスト
- IME 入力シミュレーション
- 複数 Range マッチシナリオ

---

## 参考: ブラウザコンソール出力

```
[00:01:21.023Z] [TagRule-DEBUG] [CALL] Call #1 | {"match":"#テスト","range":{"from":1,"to":5},"windowCall":1}
[00:01:21.024Z] [TagRule-DEBUG] [PROCESS] applying mark | {"text":"#テスト"}
[00:01:21.025Z] [TagRule-DEBUG] [COMPLETE] mark applied | {"markId":"unilink-mgwxyh6o-fg9a0d"}

[時間差: 1.8秒]

[00:01:22.824Z] [TagRule-DEBUG] [CALL] Call #2 | {"match":"#テスト","range":{"from":2,"to":5},"windowCall":1}
[00:01:22.825Z] [TagRule-DEBUG] [PROCESS] applying mark | {"text":"#テスト"}
[00:01:22.826Z] [TagRule-DEBUG] [COMPLETE] mark applied | {"markId":"unilink-mgwxyikp-is1mh2"}
```

---

**結論**: ProseMirror InputRule の複数トリガーは設計的に不可避であり、時間ベースではなく **Range 交差ベースの重複検出** が必須である。
