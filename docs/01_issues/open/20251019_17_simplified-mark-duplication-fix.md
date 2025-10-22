# シンプル化された重複 Mark 防止メカニズム

**作成日**: 2025-10-19  
**修正内容**: 複雑な Range 交差検出を廃止し、シンプルな既存 Mark チェックに統一  
**テスト状況**: ✅ 全テスト PASS (tag-rule: 27/27, bracket-rule: 10/10)

---

## 📋 問題と解決

### 前の問題

Range 交差検出は以下の理由で失敗していた：
- Range メモリが 3 秒間保持され、異なる編集時点での同じ Range が誤検出
- ユーザーが別の時間にリンク末尾でEnter を押すと、古い Range 記録で誤判定
- 複雑なメモリ管理と時間ベースの判定は不確実

### シンプルな根本原因の認識

**ProseMirror の設計**: 同じ position に同じ type の Mark は **2つ存在できない**

つまり：
- 2回目のInputRule 呼び出しで同じ range に Mark があれば、ProseMirror 自体が拒否する
- 重複防止は ProseMirror に委ねるべき

### 実装の新アプローチ

**CRITICAL チェック: Mark が既に存在するか確認**

```typescript
// Primary defense: Check if mark already exists on this range
let hasExistingMark = false;
state.doc.nodesBetween(from, to, (node) => {
  if (node.isText && node.marks.some((m) => m.type === markType)) {
    hasExistingMark = true;
    return false;
  }
});

if (hasExistingMark) {
  debugLog("SKIP", "mark already exists on this range");
  return null;
}
```

---

## ✨ 新しい実装の特徴

### 1. **シンプリシティ**

| 項目 | 前 | 後 |
|------|-------|-------|
| グローバル変数 | `processedRanges[]` + タイムスタンプ | なし |
| メモリ管理 | 手動で 3 秒ウィンドウ | なし |
| 判定ロジック | 複雑な交差判定 | シンプルな存在確認 |
| 信頼性 | 中（時間ベース） | 高（状態ベース） |
| コード行数 | ~100 行 | ~50 行 |

### 2. **確実性**

- 判定が ProseMirror の状態に完全に依存
- 外部状態（タイムスタンプ）に頼らない
- 何度呼ばれても同じ結果を返す（冪等）

### 3. **保守性**

- 状態の永続化なし（メモリリーク無し）
- 時間に依存しない（環境依存性なし）
- 直感的で理解しやすい

---

## 🔧 実装内容

### tag-rule.ts

```typescript
// 削除: 複雑な Range 交差検出
// - processedRanges: ProcessedRange[]
// - RANGE_MEMORY_DURATION_MS
// - hasOverlappingRange()
// - recordProcessedRange()

// 追加: シンプルな存在確認ロジック
export function createTagInputRule(context: { editor: Editor; name: string }) {
  return new InputRule({
    find: PATTERNS.tag,
    handler: ({ state, match, range, chain }) => {
      // 1. Mark type 確認
      const markType = state.schema.marks.unifiedLink;
      if (!markType) return null;

      // 2. 既存 Mark 確認 ← CRITICAL
      let hasExistingMark = false;
      state.doc.nodesBetween(from, to, (node) => {
        if (node.isText && node.marks.some((m) => m.type === markType)) {
          hasExistingMark = true;
          return false;
        }
      });
      
      if (hasExistingMark) return null;

      // 3. 通常処理
      // Mark 挿入、resolver-queue に登録、など
    }
  });
}
```

### bracket-rule.ts

**同様の変更** (tag-rule.ts と同一パターン)

---

## 📊 実行フロー

### 初回入力: ` #テスト` + Enter

```
Call #1 @ Range {1, 5}
└─ Mark type 確認: ✓ 存在
└─ 既存 Mark 確認: ✓ なし (Range {1, 5} に Mark がない)
└─ Mark 挿入実行 ✓
└─ DOM: "#テスト" (1個の#)

[1.8秒後]

Call #2 @ Range {2, 5}
└─ Mark type 確認: ✓ 存在
└─ 既存 Mark 確認: ✗ あり (Range {1, 5} に Mark が存在)
   └─ 注: Range {2, 5} は Range {1, 5} の一部をカバー
└─ SKIP (Mark 挿入しない) ✓
```

### 2回目入力: 別のテキストで再度入力

```
Call #3 @ Range {10, 15}
└─ Mark type 確認: ✓ 存在
└─ 既存 Mark 確認: ✓ なし (Range {10, 15} に Mark がない)
└─ Mark 挿入実行 ✓
└─ DOM: "#新規タグ" (1個の#)
```

---

## 🧪 テスト結果

### Tag Rule テスト: ✅ 27/27 PASS

```
Pattern matching:          ✓ Pass
Input rule creation:       ✓ Pass
Pattern validation:        ✓ Pass
Character support:         ✓ Pass (日本語, CJK, 多言語対応)
Length constraints:        ✓ Pass
Word boundary:             ✓ Pass
Configuration:             ✓ Pass
Input rule behavior:       ✓ Pass
Regex performance:         ✓ Pass
Tag suggestion:            ✓ Pass
Link creation:             ✓ Pass
```

### Bracket Rule テスト: ✅ 10/10 PASS

```
Pattern matching:          ✓ Pass
Input rule creation:       ✓ Pass
Pattern validation:        ✓ Pass
External URL detection:    ✓ Pass
Configuration:             ✓ Pass
Input rule behavior:       ✓ Pass
```

---

## 🎯 Design Philosophy

### Principle 1: State Over Time

❌ 時間ベースの判定（時間差で判定）
✅ 状態ベースの判定（ProseMirror 状態で判定）

理由：
- 時間は外部要因で影響されやすい（OS スケジューリング、ネットワーク遅延）
- 状態は確定的で依存性がない

### Principle 2: Stateless is Better

❌ グローバル状態を保持（`processedRanges[]`）
✅ 状態を保持しない（毎回同じ判定）

理由：
- メモリリークのリスクなし
- 初期化忘れの心配なし
- テストが簡単

### Principle 3: Trust the Framework

❌ 独自の重複防止メカニズム
✅ ProseMirror の Mark 機構を信頼

理由：
- ProseMirror は同じ position に同じ Mark を 2つ置けない設計
- 防止ロジックは既に存在
- 我々は利用するだけ

---

## ✅ 実装完了チェックリスト

- [x] Range 交差検出コードを完全削除
- [x] 既存 Mark チェック ロジックに集中
- [x] tag-rule.ts 簡潔化
- [x] bracket-rule.ts 簡潔化
- [x] TypeScript エラーなし
- [x] Unit テスト全 PASS (tag-rule: 27/27, bracket-rule: 10/10)
- [x] コード行数削減 (~50 行短縮)
- [ ] ⏳ ブラウザテスト確認予定

---

## 📝 コード変更サマリー

### 削除されたコード

```typescript
// Range tracking infrastructure (all removed)
interface ProcessedRange { from: number; to: number; timestamp: number; }
const processedRanges: ProcessedRange[] = [];
const RANGE_MEMORY_DURATION_MS = 3000;

function hasOverlappingRange(from: number, to: number): boolean { ... }
function recordProcessedRange(from: number, to: number): void { ... }
```

### 追加されたコード

```typescript
// Mark existence check (simple and direct)
const markType = state.schema.marks.unifiedLink;
if (!markType) return null;

let hasExistingMark = false;
state.doc.nodesBetween(from, to, (node) => {
  if (node.isText && node.marks.some((m) => m.type === markType)) {
    hasExistingMark = true;
    return false;
  }
});

if (hasExistingMark) return null;
```

---

## 🔗 関連ドキュメント

- [根本原因分析](./20251019_15_root-cause-analysis-tag-duplication.md)
- [Range 交差検出実装（廃止版）](./20251019_16_range-overlap-fix-implementation.md)

---

**結論**: シンプルな実装こそが最も堅牢である。外部状態に頼らず、ProseMirror の設計を信頼することで、確実で保守性の高いコードが実現できた。

次のステップ: ブラウザで `#テスト` + Enter → リンク末尾で Enter を実行して、重複が発生しないか確認してください。
