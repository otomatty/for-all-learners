# Web テスト結果分析と修正計画 (2025-10-19)

**作成日**: 2025-10-19  
**目的**: Web テストの実測結果から InputRule の問題を特定し、修正方針を決定する

---

## 🔍 Web テスト結果の分析

### テスト実行条件

- `ENABLE_SUGGESTION_FEATURE = false` (サジェスト機能を完全オフ)
- 入力: " #テスト" + Enter キー
- 期待: "#テスト"（単一の#）

### ✅ 観測された現象

#### 1. **## が継続して発生**

```
入力: " #テスト" + Enter
結果: "##テスト"（重複した#が表示）
```

**重要**: サジェスト機能をオフにしても、問題が解決しない
→ **原因は InputRule の double-trigger にある**

#### 2. **# のみが表示される現象は解消**

```
Before: " #テスト" + Enter → "##テスト" その後 "#" のみ修正される
After (with ENABLE_SUGGESTION_FEATURE=false): "#" のみ現象は発生しない
```

**重要**: サジェスト機能が関連していた
→ **Suggestion Plugin の処理が一部の現象の原因だった**

---

## 🎯 原因の特定

### 確定: InputRule の Double-Trigger

**証拠**:
- サジェスト完全オフでも ## が発生
- つまり、`tag-rule.ts` の `createTagInputRule()` が複数回トリガーされている

**現在の実装の問題**:

```typescript
// tag-rule.ts L20-21
let lastProcessedKey = "";
let processedMatches = new Set<string>();
```

この `processedMatches` は:
- **グローバル変数**で、ページロード時に初期化されたら永続化
- **セッション中に全 InputRule 呼び出しで共有**
- しかし、**同じ position で複数回マッチした場合**を正確に検出できていない

---

## 🔧 根本原因の仮説

### 仮説: InputRule が position の異なるマッチで複数回実行

```
Call #1: range { from: 1, to: 5 } で " #テスト" を検出
  matchId = "テスト:1:5"
  → processedMatches に追加
  → "#テスト" を挿入

Call #2: range { from: 2, to: 5 } で同じテキストを再検出
  matchId = "テスト:2:5" ← 異なる from 値！
  → processedMatches.has("テスト:2:5") = false
  → **重複検出が失敗する**
  → "#テスト" を再度挿入 → "##テスト"
```

**ProseMirror の動作**:
- IME 確定後、入力バッファを再スキャン
- 同じパターンが異なる position でマッチすることがある
- InputRule handler が複数回呼ばれる

---

## ✅ 修正方針

### 方針 1: matchId の生成ロジックを改善（推奨）

**問題**: `${key}:${from}:${to}` では、position が異なるだけで別のマッチとして扱われる

**改善案**: テキスト内容のみで判定して、連続した呼び出しを検出

```typescript
// 修正前: position 依存
const matchId = `${currentKey}:${range.from}:${range.to}`;

// 修正後: position 非依存
const matchId = `${currentKey}`;  // テキストのみ

// ただし、複数の異なるタグが入力される場合を考慮して
// 時間ウィンドウや呼び出し回数で判定する必要がある
```

### 方針 2: Transaction Meta に状態を記録（より堅牢）

**コンセプト**: 同じ transaction 内での重複を検出

```typescript
// handler 内
const tr = view.state.tr;
const processedInTr = tr.getMeta("inputRuleProcessed") || {};

if (processedInTr[matchId]) {
  return null;  // 既に処理済み
}

// 処理実行

processedInTr[matchId] = true;
tr.setMeta("inputRuleProcessed", processedInTr);
```

### 方針 3: 既に Mark が付いているかチェック（現在は部分的に実装）

**現在の実装** (tag-rule.ts L77-88):
```typescript
// Check if the matched text already has UnifiedLink mark
const markType = state.schema.marks.unifiedLink;
let hasUnifiedLinkMark = false;

if (markType) {
  state.doc.nodesBetween(..., (node) => {
    if (node.marks.some((mark) => mark.type === markType)) {
      hasUnifiedLinkMark = true;
      return false;
    }
  });
}

if (hasUnifiedLinkMark) {
  return null;
}
```

**問題**: 
- 複数のノードをスキャンするため、効率が低い
- タイミングによっては、2 回目の呼び出し時にまだマークが付いていない可能性

---

## 📋 修正実装手順

### Step 1: 時間ウィンドウ + カウンタで検出（最短）

```typescript
// グローバル変数に追加
let lastProcessedTime = 0;
let processedCountInWindow = 0;
const DUPLICATE_DETECTION_WINDOW = 100;  // ms

// handler 内
const now = Date.now();
if (now - lastProcessedTime < DUPLICATE_DETECTION_WINDOW) {
  processedCountInWindow++;
  if (processedCountInWindow > 1) {
    return null;  // 同じウィンドウ内での2回目以降
  }
} else {
  processedCountInWindow = 1;
}
lastProcessedTime = now;
```

### Step 2: Transaction Meta による厳密な検出（推奨）

```typescript
// tag-rule.ts の handler で

// 1. Transaction Meta から処理済みリストを取得
const processedInTransaction = chain().state.tr.getMeta("tagRuleProcessed") || new Set();

// 2. マッチ ID で既に処理済みか確認
if (processedInTransaction.has(matchId)) {
  return null;
}

// 3. 処理を実行
// ... existing code ...

// 4. 処理済みマッチを Meta に記録
tr.setMeta("tagRuleProcessed", new Set([...processedInTransaction, matchId]));
```

### Step 3: 検証（ブラウザテスト）

1. 修正を適用
2. `DEBUG_TAG_DUPLICATION = true` でデバッグログ出力
3. " #テスト" + Enter で Call #1, Call #2 の動作を確認
4. matchId と isDuplicate の値をチェック
5. エディタに "#テスト"（単一の#）のみ表示されることを確認

---

## 🗑️ 削除したドキュメント

以下は仮説段階のドキュメントで、実装が進んでいない段階での記述だったため削除しました:

- `docs/issues/open/20251019_09_current-implementation-analysis.md`
- `docs/04_implementation/plans/unified-link-mark/20251019_10_tag-rule-validation.md`
- `docs/issues/open/20251019_07_summary.md`

理由: サジェスト機能の無効化をテストする前の「仮説」に基づいていたが、Web テスト結果で状況が明確になったため

---

## 📝 実装対象ファイル

1. **lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts**
   - `processedMatches` の重複検出ロジックを改善
   - 推奨: Transaction Meta ベースの実装

2. **lib/tiptap-extensions/unified-link-mark/input-rules/bracket-rule.ts**
   - 同様の改善を適用
   - `processedBracketMatches` も同じロジックで修正

---

## 🎯 次のステップ

### 推奨順序

1. **tag-rule.ts に時間ウィンドウ検出を追加**（最短で動作確認）
2. **ブラウザテストで確認**
3. **bracket-rule.ts にも適用**
4. **テストケース追加**
5. **本番環境での確認**

---

## 関連 Issue

- `20251019_08_duplicate-tag-resolution.md` - 解決策の初期提案
- `20251019_06_tag-suggestion-ui-fix-completion.md` - サジェスト UI 修正（完了）
- `20251019_07_tag-duplication-on-enter-space-keys.md` - 初期問題報告
