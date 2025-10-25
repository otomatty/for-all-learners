# テスト失敗修正ロードマップ - Executive Summary

**作成日**: 2025 年 10 月 18 日  
**対象**: 33 個のテスト失敗の段階的修正計画

---

## 👥 概要 (Executive Summary)

テストスイートの 33 個の失敗を 5 つのカテゴリに分け、段階的に修正していくロードマップです。

### 修正フェーズの概要

| フェーズ    | 対象            | 失敗数 | 難度   | 時間   | 状態      |
| ----------- | --------------- | ------ | ------ | ------ | --------- |
| **Phase 1** | Critical + High | 5      | ⭐⭐   | 30 分  | 🔴 未開始 |
| **Phase 2** | Medium          | 14     | ⭐⭐   | 50 分  | 🔴 未開始 |
| **Phase 3** | High 統合       | 16     | ⭐⭐⭐ | 90 分+ | 🔴 未開始 |

**総修正時間**: 約 3.5 時間以上

---

## 📋 Phase 1: Critical 優先度 (本日対応 - 30 分)

### 1.1 キャッシュキー正規化修正

**ファイル**: `lib/unilink/utils.ts`

**変更内容**:

```typescript
// 修正前
export const setCachedPageId = (key: string, pageId: string): void => {
  resolvedCache.set(key, {
    // ❌ キーを正規化していない
    pageId,
    timestamp: Date.now(),
  });
  saveCacheToStorage();
  logger.debug({ key, pageId }, "[Cache] Entry set");
};

// 修正後
export const setCachedPageId = (key: string, pageId: string): void => {
  const normalizedKey = normalizeTitleToKey(key); // ✅ 正規化
  resolvedCache.set(normalizedKey, {
    pageId,
    timestamp: Date.now(),
  });
  saveCacheToStorage();
  logger.debug({ key: normalizedKey, pageId }, "[Cache] Entry set");
};
```

**テスト**: `lib/unilink/__tests__/utils.test.ts`

- ✅ `should normalize keys before caching`

**推定時間**: 10 分

---

### 1.2 Handler の null/undefined チェック

**ファイル**: `lib/tiptap-extensions/unified-link-mark/lifecycle.ts`

**変更内容**:

```typescript
// 修正前
export const onCreateHandler = (editor: Editor): void => {
  // editor を直接使用 (null チェックなし)
  // ...
};

// 修正後
export const onCreateHandler = (editor: Editor | null | undefined): void => {
  if (!editor) {
    logger.warn("Editor is null or undefined in onCreateHandler");
    return;
  }
  // ... rest of implementation
};
```

**テスト**: `lib/tiptap-extensions/unified-link-mark/__tests__/lifecycle.test.ts`

- ✅ `should handle null editor gracefully`
- ✅ `should handle undefined editor gracefully`

**推定時間**: 10 分

---

### Phase 1 チェックリスト

- [ ] キャッシュキー正規化修正
- [ ] Handler null チェック追加
- [ ] テスト実行: `bun test -- lib/unilink/__tests__/utils.test.ts` → 全 pass
- [ ] テスト実行: `bun test -- lib/tiptap-extensions/unified-link-mark/__tests__/lifecycle.test.ts` → 全 pass

**期待結果**: 3 個失敗から 0 に削減

---

## 📋 Phase 2: Medium 優先度 (翌日対応 - 50 分)

### 2.1 Logger と console のマッチング

**ファイル**: 複数

- `lib/unilink/__tests__/resolver/mark-operations.test.ts`
- `lib/unilink/__tests__/resolver/broadcast.test.ts`
- `lib/tiptap-extensions/unified-link-mark/__tests__/migration.test.ts`

**問題**: テストが `console.log/error` を期待しているが、実装が `logger` を使用している

**修正方針 A: テスト側を logger 対応に修正**

```typescript
// 修正前 (mark-operations.test.ts)
const consoleLogSpy = vi.spyOn(console, "log");
expect(consoleLogSpy).toHaveBeenCalledWith(
  expect.stringContaining("[UnifiedResolver] Mark updated")
);

// 修正後
vi.mock("@/lib/logger", () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import logger from "@/lib/logger";
const loggerDebugSpy = vi.spyOn(logger, "debug");
expect(loggerDebugSpy).toHaveBeenCalled();
```

**対象テスト数**: 8 個

- `should log success message on update`
- `should handle errors gracefully`
- `should log batch resolution start`
- `should process each mark individually`
- `should handle empty mark array`
- `should handle single mark`
- `should log broadcast event (debug)`
- `should log message for unimplemented feature`

**推定時間**: 30 分

### 2.2 プラグイン数・順序の確認と修正

**ファイル**:

- 実装: `lib/tiptap-extensions/unified-link-mark/plugins/index.ts`
- テスト: `lib/tiptap-extensions/unified-link-mark/plugins/__tests__/index.test.ts`

**修正手順**:

1. `createPlugins()` 実装を確認
2. 実際に返されるプラグイン数を確認
3. テストの期待値を実装に合わせて更新

**対象テスト数**: 6 個

- `should return exactly 3 plugins`
- `should include click-handler plugin`
- `should return plugins in consistent order`
- `should have auto-bracket first, click-handler second`
- `should handle editor without throwing`
- `should create plugins with consistent structure`

**推定時間**: 20 分

---

### Phase 2 チェックリスト

- [ ] logger mock 実装
- [ ] mark-operations テスト修正
- [ ] broadcast テスト修正
- [ ] migration テスト修正
- [ ] プラグイン実装確認
- [ ] プラグインテスト更新
- [ ] テスト実行: `bun test` → 14 個失敗から 0 に削減

**期待結果**: 14 個失敗から 0 に削減

---

## 📋 Phase 3: High 優先度 統合テスト (計画的対応 - 90 分以上)

### 3.1 Input Rules 統合テスト

**ファイル**:

- `lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/utils.test.ts`
- `lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/tag-rule.test.ts`
- `lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/bracket-rule.test.ts`
- `app/(protected)/pages/[id]/_hooks/__tests__/useLinkSync.test.ts`

**対象テスト数**: 16 個

#### 3.1.1 isInCodeContext テスト (3 個)

```typescript
// 失敗テスト
- should return true at the start of inline code
- should handle multiple inline code in same paragraph
- should handle invalid positions gracefully
```

**修正方針**:

- JSDOM 環境の Range/Selection API のモック強化
- 複雑な DOM 操作のテストを単体テストに分割

#### 3.1.2 createTagInputRule テスト (2 個)

```typescript
// 失敗テスト
- should not match invalid tag patterns
- should only match at word boundaries
```

**修正方針**:

- 正規表現マッチングロジックの単体テスト化
- エッジケースの徹底的なテストカバレッジ

#### 3.1.3 createBracketInputRule テスト (1 個)

```typescript
// 失敗テスト
- should use correct regex pattern
```

**修正方針**:

- ブラケットルール実装の確認
- 正規表現の動作検証

#### 3.1.4 useLinkSync テスト (1 個)

```typescript
// 失敗テスト
- should not crash with undefined editor methods
```

**修正方針**:

- エディターメソッドの null/undefined チェック

### 3.2 環境改善

#### 3.2.1 モック環境の強化

- JSDOM から Playwright への移行検討
- ProseMirror mock の完成度向上
- DOM API の完全性確認

#### 3.2.2 テスト戦略の見直し

- 統合テストと単体テストの分離
- モック環境の最小化

---

### Phase 3 チェックリスト

- [ ] isInCodeContext のロジック確認
- [ ] モック環境の強化
- [ ] createTagInputRule マッチング修正
- [ ] createBracketInputRule 設定確認
- [ ] useLinkSync の null チェック
- [ ] 単体テストへの分割
- [ ] テスト実行: `bun test` → 16 個失敗から 0 に削減

**期待結果**: 16 個失敗から 0 に削減 → **合計 33 個のテスト失敗を完全解決**

---

## 🚀 実装・検証手順

### 事前準備

```bash
# 最新コードを確認
git status
git log --oneline -5

# テスト環境の確認
bun --version
vitest --version
```

### Phase 1 実装

```bash
# ブランチ作成
git checkout -b fix/test-failures-phase-1

# 修正実装
# 1. lib/unilink/utils.ts の setCachedPageId を修正
# 2. lib/tiptap-extensions/unified-link-mark/lifecycle.ts の onCreateHandler を修正

# テスト実行
bun test -- lib/unilink/__tests__/utils.test.ts
bun test -- lib/tiptap-extensions/unified-link-mark/__tests__/lifecycle.test.ts

# 全体確認
bun test

# コミット
git add .
git commit -m "fix: Normalize cache keys and add null/undefined checks"

# PR 作成
git push origin fix/test-failures-phase-1
```

### Phase 2 実装

```bash
# 新ブランチ
git checkout -b fix/test-failures-phase-2

# Logger mock 実装 + テスト修正
# プラグイン実装確認 + テスト更新

# テスト実行
bun test

# コミット
git commit -m "fix: Align logger usage and plugin tests"
git push origin fix/test-failures-phase-2
```

### Phase 3 実装

```bash
# 新ブランチ
git checkout -b fix/test-failures-phase-3

# Input Rules テスト修正
# JSDOM 環境強化

# テスト実行
bun test

# コミット
git commit -m "fix: Strengthen Input Rules tests and mock environment"
git push origin fix/test-failures-phase-3
```

---

## 📊 期待結果

### 修正前

```
✅ 574 pass
❌ 33 fail
⚠️ 2 errors
```

### 修正後

```
✅ 607 pass  (すべてのテスト成功)
❌ 0 fail
⚠️ 0 errors
```

---

## 🔄 進捗追跡

| フェーズ | 状態      | 進捗 | 完了予定 |
| -------- | --------- | ---- | -------- |
| Phase 1  | 🔴 未開始 | 0%   | 本日     |
| Phase 2  | 🔴 未開始 | 0%   | 翌日     |
| Phase 3  | 🔴 未開始 | 0%   | 計画的   |

---

## 📚 関連ドキュメント

- **初期分析**: `docs/issues/open/20251018_test-failures-investigation.md`
- **詳細分析**: `docs/issues/open/20251018_test-failures-detailed-analysis.md`
- **GitHub Issue**: #13

---

## 💡 補足

### テスト実行コマンド参考

```bash
# 全テスト
bun test

# 特定ファイル
bun test -- lib/unilink/__tests__/utils.test.ts

# 特定 describe ブロック
bun test -- --grep "Cache Functionality"

# 詳細出力
bun test -- --reporter=verbose

# カバレッジ
bun test -- --coverage
```

### コミットメッセージフォーマット

```
fix: キャッシュキー正規化バグを修正 (1/33)
- setCachedPageId でキーを正規化
- テスト: should normalize keys before caching を pass
```

---

**最終更新**: 2025-10-18  
**担当**: AI Development Agent  
**次レビュー**: Phase 1 完了時
