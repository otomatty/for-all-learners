# Tag 重複問題修正実装ドキュメント

**作成日**: 2025-10-19  
**修正内容**: Range 交差検出ベースの重複 Mark 防止メカニズム実装  
**テスト状況**: ✅ 全テスト PASS (tag-rule: 27/27, bracket-rule: 10/10)

---

## 📋 修正概要

### 問題の再確認

ユーザーが ` #テスト` + Enter を入力すると、`##テスト` が表示される問題が発生していました。

**根本原因**: ProseMirror InputRule が同一テキストに対して 2つの異なる Range 位置でトリガーされ、各回で独立した Mark が挿入されていました：

- Call #1: Range `{from: 1, to: 5}` (compositionend イベント)
- Call #2: Range `{from: 2, to: 5}` (handleKeyDown イベント)

### 修正アプローチ

**時間ベース → Range 交差ベースへの変更**

```typescript
// ❌ 古い方式 (失敗)
const DUPLICATE_DETECTION_WINDOW_MS = 50;  // 任意の時間差で判定
if (currentTime - lastProcessedTime < DUPLICATE_DETECTION_WINDOW_MS) {
  // skip
}

// ✅ 新しい方式 (採用)
if (hasOverlappingRange(from, to)) {
  // Range が交差していれば skip
}
```

---

## 🔧 実装内容

### A. Range 交差判定ロジック

```typescript
interface ProcessedRange {
  from: number;
  to: number;
  timestamp: number;
}

const processedRanges: ProcessedRange[] = [];
const RANGE_MEMORY_DURATION_MS = 3000; // 3秒間 range を記録

/**
 * 2つの Range が重複しているか判定
 * 重複判定: NOT (r2.to <= r1.from OR r1.to <= r2.from)
 */
function hasOverlappingRange(from: number, to: number): boolean {
  const now = Date.now();
  
  // 古い range を削除（3秒以上前）
  while (processedRanges.length > 0 && 
         now - processedRanges[0]!.timestamp > RANGE_MEMORY_DURATION_MS) {
    processedRanges.shift();
  }

  // 重複判定
  const hasOverlap = processedRanges.some(r => 
    !(to <= r.from || from >= r.to)
  );

  return hasOverlap;
}

function recordProcessedRange(from: number, to: number): void {
  processedRanges.push({ from, to, timestamp: Date.now() });
}
```

### B. Handler での使用方法

```typescript
export function createTagInputRule(context: { editor: Editor; name: string }) {
  return new InputRule({
    find: PATTERNS.tag,
    handler: ({ state, match, range, chain }) => {
      const { from, to } = range;

      // 1. Range 交差チェック（最初）
      if (hasOverlappingRange(from, to)) {
        debugLog("DUPLICATE-DETECTED", "Skipping (overlapping range detected)", {
          match: currentMatch,
          range: { from, to },
        });
        return null;  // ← 重複なので処理をスキップ
      }

      // 2. Range を記録（処理を続行するなら記録）
      recordProcessedRange(from, to);

      // 3. 既存 Mark チェック（二次的な安全装置）
      if (hasUnifiedLinkMark) {
        return null;
      }

      // 4. 通常の処理を実行
      // Mark を挿入、resolver-queue に登録、など
      ...
    }
  });
}
```

### C. 修正ファイル

#### ファイル1: `tag-rule.ts`

**変更点:**

1. **定数・変数の置き換え**
   ```typescript
   // 削除: time-window 方式の変数
   // - lastProcessedTime
   // - processedInCurrentWindow
   // - DUPLICATE_DETECTION_WINDOW_MS
   
   // 追加: Range 交差検出の変数
   // - processedRanges: ProcessedRange[]
   // - RANGE_MEMORY_DURATION_MS
   ```

2. **Range 交差判定関数の追加**
   - `hasOverlappingRange(from: number, to: number): boolean`
   - `recordProcessedRange(from: number, to: number): void`

3. **Handler ロジックの更新**
   ```typescript
   // 古い: time-window チェック
   // 新しい: Range 交差チェック
   if (hasOverlappingRange(from, to)) {
     return null;
   }
   recordProcessedRange(from, to);
   ```

#### ファイル2: `bracket-rule.ts`

**変更点:** tag-rule.ts と同様

---

## 📊 Range 交差判定の動作

### 例1: 交差あり (スキップされる)

```
Call #1: Range {1, 5}  ← 記録
Call #2: Range {2, 5}

交差判定:
  NOT (5 <= 1 OR 2 >= 5)
  = NOT (false OR false)
  = NOT false
  = true  ✓ 交差している

結果: Call #2 はスキップ ✓
```

### 例2: 交差なし (処理される)

```
Call #1: Range {1, 5}  ← 記録
Call #2: Range {5, 8}

交差判定:
  NOT (8 <= 1 OR 5 >= 5)
  = NOT (false OR true)
  = NOT true
  = false  ✓ 交差していない

結果: Call #2 は処理される ✓
```

### 例3: 部分的な交差 (スキップされる)

```
Call #1: Range {1, 5}  ← 記録
Call #2: Range {3, 7}

交差判定:
  NOT (7 <= 1 OR 3 >= 5)
  = NOT (false OR false)
  = NOT false
  = true  ✓ 交差している

結果: Call #2 はスキップ ✓
```

---

## 🧪 テスト結果

### Tag Rule テスト

```
✅ 27/27 PASS
   - Pattern matching: 正常に動作
   - Input rule creation: 正常に動作
   - Pattern validation: 正常に動作
   - Character support: 日本語、CJK 対応確認
   - Length constraints: 正常に動作
   - Link creation: 正常に動作
```

**コマンド:**
```bash
bun test lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/tag-rule.test.ts --no-coverage
```

### Bracket Rule テスト

```
✅ 10/10 PASS
   - Pattern matching: 正常に動作
   - Input rule creation: 正常に動作
   - External URL detection: 正常に動作
```

**コマンド:**
```bash
bun test lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/bracket-rule.test.ts --no-coverage
```

---

## 📈 改善ポイント

### 1. **信頼性の向上**

| 項目 | 改善前 | 改善後 |
|------|-------|--------|
| 判定ロジック | 時間ベース（不安定） | Range ベース（確定的） |
| 誤検知 | 多い（タイミング依存） | ほぼ無し（Range で確定） |
| 文化的制限 | 50ms ウィンドウ（恣意的） | 3秒メモリ（十分） |

### 2. **メモリ管理**

- **古い Range の削除**: 3秒以上前の range は削除
- **メモリリーク防止**: 無限増加を防止
- **スケーラビリティ**: IME で複数 range が発生しても対応

### 3. **デバッグの容易さ**

```typescript
debugLog("DUPLICATE-DETECTED", "Skipping (overlapping range detected)", {
  match: currentMatch,
  range: { from, to },
  processedRanges: processedRanges.map(r => ({ from: r.from, to: r.to })),
});
```

ブラウザコンソールで処理済み range 一覧が表示されるため、デバッグが容易。

---

## 🎯 検証手順

### ステップ1: 開発サーバー起動

```bash
bun dev
```

### ステップ2: ブラウザで確認

1. `http://localhost:3000` を開く
2. 編集画面に移動
3. F12 でコンソール開く
4. Filter: "TagRule-DEBUG"

### ステップ3: テストケース実行

```bash
# Case 1: Tag 入力
入力: " #テスト" + Enter
期待: "#テスト" のみ表示（`##テスト` ではない）
```

**コンソール出力の確認**

```
[HH:MM:SS.xxx] [TagRule-DEBUG] [CALL] Call #1 | {"match":"#テスト","range":{"from":1,"to":5}}
[HH:MM:SS.yyy] [TagRule-DEBUG] [PROCESS] applying mark and text insertion | {"raw":"テスト","text":"#テスト"}
[HH:MM:SS.zzz] [TagRule-DEBUG] [COMPLETE] mark applied and text inserted | {"text":"#テスト","markId":"..."}

[~1.8秒後]

[HH:MM:SS.aaa] [TagRule-DEBUG] [CALL] Call #2 | {"match":"#テスト","range":{"from":2,"to":5}}
[HH:MM:SS.bbb] [TagRule-DEBUG] [DUPLICATE-DETECTED] Skipping (overlapping range detected) | {...}
```

**期待される動作:**
- Call #1: 処理実行 ✓
- Call #2: スキップ ✓ (DUPLICATE-DETECTED ログが出現)

---

## 🔒 エッジケース対応

### ケース1: 同一トランザクション内での複数 Call

```
t=0ms: Call #1 @ Range {1, 5}  → 記録
t=5ms: Call #2 @ Range {2, 5}  → スキップ（交差検出）
```

✅ 対応: Range 交差判定により検出

### ケース2: 全く異なる range での処理

```
t=0ms:   Call #1 @ Range {1, 5}   → 記録
t=1800ms: Call #2 @ Range {10, 15} → 処理（交差なし）
t=3000ms: Call #3 @ Range {1, 5}   → スキップ（古い記録でも交差）
t=3100ms: Call #4 @ Range {1, 5}   → 処理（記録削除後）
```

✅ 対応: メモリ管理により適切に削除・判定

### ケース3: 連続入力

```
"テスト" と "実装" を連続入力
```

✅ 対応: 各単語の range は異なるため、重複検出されず正常に処理

---

## 📝 コード変更サマリー

### tag-rule.ts

**削除**
```typescript
// Time-window based variables (不要)
let lastProcessedTime = 0;
let processedInCurrentWindow = 0;
const DUPLICATE_DETECTION_WINDOW_MS = 50;

// Time-window based logic in handler
if (currentTime - lastProcessedTime < DUPLICATE_DETECTION_WINDOW_MS) {
  // ... skip logic
}
```

**追加**
```typescript
// Range-based variables and functions
interface ProcessedRange { from: number; to: number; timestamp: number; }
const processedRanges: ProcessedRange[] = [];
const RANGE_MEMORY_DURATION_MS = 3000;

function hasOverlappingRange(from: number, to: number): boolean { ... }
function recordProcessedRange(from: number, to: number): void { ... }

// In handler
if (hasOverlappingRange(from, to)) return null;
recordProcessedRange(from, to);
```

### bracket-rule.ts

**同様の変更** (tag-rule.ts と同一パターン)

---

## ✅ 修正完了チェックリスト

- [x] Range 交差判定ロジック実装
- [x] tag-rule.ts 修正
- [x] bracket-rule.ts 修正
- [x] TypeScript コンパイルエラーなし
- [x] Unit テスト全 PASS (tag-rule: 27/27, bracket-rule: 10/10)
- [x] デバッグログの改善
- [ ] ⏳ ブラウザテストで `##テスト` 問題が解決したか確認予定

---

## 🔗 関連ドキュメント

- [根本原因分析ドキュメント](./20251019_15_root-cause-analysis-tag-duplication.md)
- [デバッグログ実装ガイド](./20251019_14_debug-log-implementation.md)

---

**次のステップ**: ブラウザで ` #テスト` + Enter を入力し、`#テスト`（単一の#）のみが表示されることを確認してください。
