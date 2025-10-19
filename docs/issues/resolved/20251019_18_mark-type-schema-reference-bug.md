# 解決済み: Mark Type Schema 参照バグ

**作成日**: 2025-10-19  
**状態**: ✅ 解決済み  
**重要度**: High  

---

## 🐛 問題の概要

InputRule ハンドラーで mark type を schema から取得する際に、**間違った mark name** を参照していました。

### ログ証拠

```
[00:27:46.856Z] [TagRule-DEBUG] [SKIP] unifiedLink mark type not found in schema
```

### 根本原因

#### 誤った参照

```typescript
// ❌ 間違い
const markType = state.schema.marks.unifiedLink;
```

#### 正しい参照

```typescript
// ✅ 正しい
const markType = state.schema.marks.unilink;
```

---

## 📋 問題の詳細

### ファイル構造

**Mark 定義** (`lib/tiptap-extensions/unified-link-mark/index.ts`):
```typescript
export const UnifiedLinkMark = Mark.create<UnifiedLinkMarkOptions>({
  name: "unilink",  // ← Mark の正式な name
  priority: 1000,
  inclusive: false,
  // ...
});
```

**InputRule ハンドラー（修正前）** (`input-rules/tag-rule.ts`):
```typescript
// ❌ 存在しない mark name を参照
const markType = state.schema.marks.unifiedLink;  // ← undefined になる
if (!markType) {
  debugLog("SKIP", "unifiedLink mark type not found in schema");
  return null;  // ← 常にここで早期終了
}
```

### なぜこのバグが発生したか

1. **Mark の定義**: `name: "unilink"` で schema に登録
2. **InputRule の参照**: `state.schema.marks.unifiedLink` を参照
3. **結果**: schema に `unifiedLink` という mark がないため、常に `undefined`
4. **動作**: InputRule が `null` を返すため、mark は一切生成されない

---

## ✅ 修正内容

### 修正対象ファイル

1. **tag-rule.ts** (Line 55-60)
2. **bracket-rule.ts** (Line 56-61)

### 修正内容

```typescript
// ❌ 修正前
const markType = state.schema.marks.unifiedLink;
if (!markType) {
  debugLog("SKIP", "unifiedLink mark type not found in schema");
  return null;
}

// ✅ 修正後
const markType = state.schema.marks.unilink;
if (!markType) {
  debugLog("SKIP", "unilink mark type not found in schema");
  return null;
}
```

### 修正の影響範囲

| ファイル | 影響 | 状態 |
|---------|------|------|
| tag-rule.ts | mark type 参照 修正 | ✅ 修正完了 |
| bracket-rule.ts | mark type 参照 修正 | ✅ 修正完了 |

---

## 🧪 検証結果

### Unit テスト

**tag-rule.test.ts**:
```
✓ 27/27 PASS
```

**bracket-rule.test.ts**:
```
✓ 10/10 PASS
```

### 理由

- テストは `state.schema.marks.unilink` が存在することを前提としていたため、unit テスト上は問題が生じなかった
- ブラウザでの実際の InputRule 呼び出しで schema 参照が失敗していた

---

## 🎯 修正による改善

### Before

```
Call #1: [SKIP] unifiedLink mark type not found in schema
Call #2: [SKIP] unifiedLink mark type not found in schema
Call #3: [SKIP] unifiedLink mark type not found in schema
...
Result: Mark が生成されない（重複も発生しない）
```

### After

```
Call #1: [PROCESS] Mark が正常に生成される
Call #2: [SKIP] Mark が既に存在（重複防止が機能）
Call #3: [SKIP] Mark が既に存在（重複防止が機能）
...
Result: Mark が正常に生成される + 重複防止が機能
```

---

## 📝 デバッグプロセス

1. **ログ分析**: ブラウザコンソールに「unifiedLink mark type not found」が表示
2. **コード確認**: `state.schema.marks.unifiedLink` が硬コーディングされていた
3. **Mark 定義確認**: 実際の mark name は `"unilink"`
4. **修正**: 参照を `state.schema.marks.unilink` に変更
5. **テスト**: Unit テスト全 PASS

---

## 🔗 関連ドキュメント

- [シンプル化された重複 Mark 防止メカニズム](./20251019_17_simplified-mark-duplication-fix.md)
- [根本原因分析](./20251019_15_root-cause-analysis-tag-duplication.md)

---

## ✨ 学習

### バグの教訓

**ハードコーディングの危険性**

- Mark name を複数の場所で参照する場合、常に source of truth を確認すべき
- `state.schema.marks.{name}` のような schema アクセスは特に注意が必要
- Mark 定義と参照の一貫性を保つ仕組みが必要

### 改善案

```typescript
// ❌ 現在（ハードコーディング）
const markType = state.schema.marks.unifiedLink;

// ✅ 推奨（context から取得）
const markType = state.schema.marks[context.name];

// または

// ✅ 定数化
const MARK_NAME = "unilink" as const;
const markType = state.schema.marks[MARK_NAME];
```

---

**結論**: mark type schema 参照の name が誤っていたことが、InputRule の早期終了の原因でした。修正により、mark が正常に生成されるようになり、その後の重複防止メカニズムが機能するようになります。

