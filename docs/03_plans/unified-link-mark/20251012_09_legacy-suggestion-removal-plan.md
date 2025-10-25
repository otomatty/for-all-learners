# 旧サジェスト機能削除計画

**作成日**: 2025-10-12  
**目的**: page-link.ts と tag-link.ts の旧サジェスト機能を削除し、UnifiedLinkMark に統一

---

## 現状分析

### 1. 旧サジェスト機能の実装

#### page-link.ts (ブラケット記法 `[text]`)

**実装箇所**: 行 119-350 付近

**主な機能**:

```typescript
// suggestionPlugin と suggestionPluginKey
const suggestionPluginKey = new PluginKey<SuggestionState>("bracketSuggestion");

const suggestionPlugin = new Plugin<SuggestionState>({
  // ブラケット内入力の検出
  // 300ms debounce検索
  // tippy.jsによるUI表示
  // キーボードナビゲーション
  // PageLinkMark挿入
});
```

**依存関係**:

- tippy.js
- searchPages API
- PageLinkMark

#### tag-link.ts (タグ記法 `#text`)

**実装箇所**: ファイル全体 (244 行)

**主な機能**:

```typescript
// tagSuggestionPlugin と tagSuggestionPluginKey
const tagSuggestionPluginKey = new PluginKey<TagSuggestionState>(
  "tagSuggestion"
);

const tagSuggestionPlugin = new Plugin<TagSuggestionState>({
  // ハッシュタグ入力の検出
  // 300ms debounce検索
  // tippy.jsによるUI表示
  // キーボードナビゲーション
  // タグテキスト挿入
});

export const TagLink = Extension.create({
  name: "tagLink",
  addProseMirrorPlugins() {
    return [tagSuggestionPlugin];
  },
});
```

### 2. 使用箇所の確認

#### PageLink Extension

| ファイル                     | 使用内容                      | 影響      |
| ---------------------------- | ----------------------------- | --------- |
| `useLinkExistenceChecker.ts` | `existencePluginKey`          | ⚠️ 要対応 |
| `usePageEditorLogic.ts`      | `PageLink` Extension (legacy) | ⚠️ 要対応 |
| `rich-content.tsx`           | `PageLink` Extension          | ⚠️ 要対応 |

#### TagLink Extension

検索結果: **使用箇所なし** ✅ 安全に削除可能

---

## 削除計画

### Phase 1: TagLink Extension の削除 (優先度: 高、リスク: 低)

#### 理由

- 使用箇所が見つからない
- UnifiedLinkMark がタグ記法をサポート
- 独立した Extension のため影響範囲が限定的

#### 手順

1. **ファイル削除**

   ```bash
   rm lib/tiptap-extensions/tag-link.ts
   ```

2. **インポート確認**

   ```bash
   grep -r "tag-link" app/ lib/ components/
   ```

3. **動作確認**

   - エディタ起動
   - `#text` 記法の動作確認（UnifiedLinkMark が処理）

4. **テスト実行**
   ```bash
   bun test
   ```

### Phase 2: PageLink Extension のサジェスト機能削除 (優先度: 中、リスク: 中)

#### 理由

- UnifiedLinkMark の suggestion プラグインが同等機能を提供
- PageLink Extension 自体は他の機能（Decoration、プレビュー等）も持つため完全削除は保留

#### 手順

1. **suggestionPlugin 部分のみ削除**

   - 行 119-350 付近の`suggestionPlugin`と関連コードを削除
   - `bracketPlugin`は残す（自動ブラケット閉じ機能）

2. **エクスポートから削除**

   ```typescript
   // Before
   export const PageLink = Extension.create({
     addProseMirrorPlugins() {
       return [
         pageLinkPlugin,
         bracketPlugin,
         suggestionPlugin, // ← 削除
         pageLinkPreviewMarkPlugin,
       ];
     },
   });

   // After
   export const PageLink = Extension.create({
     addProseMirrorPlugins() {
       return [pageLinkPlugin, bracketPlugin, pageLinkPreviewMarkPlugin];
     },
   });
   ```

3. **applySuggestionItem 関数の削除**

   - suggestionPlugin でのみ使用される関数を削除

4. **動作確認**
   - エディタで `[text]` 入力時に UnifiedLinkMark のサジェストが表示されることを確認

### Phase 3: PageLink Extension の完全削除（将来）

#### 前提条件

- UnifiedLinkMark が全機能をカバー
- プレビュー機能の移行完了
- すべての使用箇所の移行完了

#### 影響を受けるファイル

1. **useLinkExistenceChecker.ts**

   ```typescript
   // 現在
   import { existencePluginKey } from "@/lib/tiptap-extensions/page-link";

   // 将来: UnifiedLinkMarkのプラグインキーを使用
   import { unifiedLinkPluginKey } from "@/lib/tiptap-extensions/unified-link-mark";
   ```

2. **usePageEditorLogic.ts**

   ```typescript
   // 現在
   import { PageLink } from "@/lib/tiptap-extensions/page-link";

   extensions: [
     StarterKit,
     PageLink, // legacy
     PageLinkMark,
     UnifiedLinkMark,
     // ...
   ];

   // 将来: PageLinkを削除
   extensions: [
     StarterKit,
     UnifiedLinkMark,
     // ...
   ];
   ```

3. **rich-content.tsx**
   - 同様に PageLink → UnifiedLinkMark に移行

---

## 削除の優先順位

### 即座に実行可能（リスク: 低）

1. ✅ **TagLink Extension の完全削除**
   - 使用箇所なし
   - 独立したファイル
   - UnifiedLinkMark でタグ記法サポート済み

### 段階的実行（リスク: 中）

2. ⚠️ **PageLink Extension のサジェスト機能削除**
   - UnifiedLinkMark で代替可能
   - 他の機能（Decoration、プレビュー）は残す
   - 並行稼働期間（1-2 週間）後に実行推奨

### 将来実行（リスク: 高、要計画）

3. 🔮 **PageLink Extension の完全削除**
   - Phase 3-4 で実行
   - 全機能の移行完了が前提
   - 使用箇所の完全な書き換えが必要

---

## 実装手順

### Step 1: TagLink Extension 削除（推奨: 即座）

```bash
# 1. ファイル削除
rm lib/tiptap-extensions/tag-link.ts

# 2. インポート確認
grep -r "tag-link" app/ lib/ components/

# 3. テスト実行
bun test

# 4. 動作確認
# エディタで #text 記法が UnifiedLinkMark で動作することを確認
```

### Step 2: PageLink suggestionPlugin 削除（推奨: Phase 2.1 完了後 1-2 週間）

#### 2.1. suggestionPlugin 関連コードの特定

```typescript
// 削除対象:
// - suggestionPluginKey (行119)
// - SuggestionState interface (行120-126)
// - suggestionPlugin (行127-285)
// - applySuggestionItem 関数 (行287-350)
```

#### 2.2. PageLink Extension 更新

```typescript
// lib/tiptap-extensions/page-link.ts

export const PageLink = Extension.create({
  name: "pageLink",
  addProseMirrorPlugins() {
    return [
      pageLinkPlugin,
      bracketPlugin, // 自動ブラケット閉じは残す
      // suggestionPlugin, // ← 削除
      pageLinkPreviewMarkPlugin,
    ];
  },
});
```

#### 2.3. 不要なインポート削除

```typescript
// Before
import tippy, { type Instance, type Props } from "tippy.js";

// After (プレビューでtippyを使用しない場合)
// import文自体を削除
```

#### 2.4. テストと確認

```bash
# テスト実行
bun test

# 型チェック
bun run type-check

# エディタ起動確認
# - [text] 入力でUnifiedLinkMarkのサジェスト表示
# - ブラケット自動閉じは動作
# - プレビュー機能は動作
```

---

## リスク評価

### TagLink 削除のリスク

| リスク                     | 確率 | 影響 | 対策                         |
| -------------------------- | ---- | ---- | ---------------------------- |
| 使用箇所が見落とされている | 低   | 中   | grep 検索で再確認            |
| タグ記法が動作しない       | 低   | 中   | UnifiedLinkMark のテスト実行 |

### PageLink suggestionPlugin 削除のリスク

| リスク                   | 確率 | 影響 | 対策                                 |
| ------------------------ | ---- | ---- | ------------------------------------ |
| サジェストが表示されない | 低   | 高   | UnifiedLinkMark のサジェスト動作確認 |
| ブラケット機能の破壊     | 低   | 中   | bracketPlugin は残すため影響なし     |
| プレビュー機能への影響   | 低   | 中   | プレビュー機能は別プラグインで独立   |

---

## 削除後の検証項目

### TagLink 削除後

- [ ] `#text` 記法で UnifiedLinkMark が作成される
- [ ] タグ記法のサジェストが表示される（UnifiedLinkMark 提供）
- [ ] キーボードナビゲーションが動作する
- [ ] テスト全件パス
- [ ] 型エラーなし

### PageLink suggestionPlugin 削除後

- [ ] `[text]` 記法で UnifiedLinkMark が作成される
- [ ] ブラケット自動閉じが動作する
- [ ] サジェストが表示される（UnifiedLinkMark 提供）
- [ ] プレビュー機能が動作する
- [ ] テスト全件パス
- [ ] 型エラーなし

---

## 並行稼働期間の監視

### 削除前に確認すべきメトリクス

1. **UnifiedLinkMark のサジェスト成功率**

   - 目標: >95%
   - 現状: 測定中

2. **ユーザーフィードバック**

   - UnifiedLinkMark の UX に問題なし
   - サジェスト速度に不満なし

3. **エラー発生率**
   - UnifiedLinkMark のエラー: <1%
   - 旧実装との差異: なし

### 削除の Go/No-Go 判断基準

**Go 条件**:

- ✅ UnifiedLinkMark のサジェスト成功率 >95%
- ✅ ユーザーフィードバックが良好
- ✅ エラー発生率 <1%
- ✅ 1-2 週間の並行稼働で問題なし

**No-Go 条件**:

- ❌ サジェスト成功率 <90%
- ❌ ユーザーから不満の報告
- ❌ エラー発生率 >5%
- ❌ パフォーマンス劣化

---

## 推奨アクション

### 即座に実行

✅ **TagLink Extension を削除**

- リスク: 低
- 作業時間: 5 分
- 理由: 使用箇所なし、UnifiedLinkMark で代替済み

### 1-2 週間後に実行

⚠️ **PageLink suggestionPlugin を削除**

- リスク: 中
- 作業時間: 30 分
- 前提: UnifiedLinkMark のサジェストが安定稼働
- 理由: 重複機能の削除、コードの簡潔化

### Phase 3-4 で実行

🔮 **PageLink Extension を完全削除**

- リスク: 高
- 作業時間: 2-3 日
- 前提: 全機能の移行完了
- 理由: レガシーコードの完全削除

---

## 次のステップ

1. **TagLink Extension 削除** (推奨: 今すぐ)
2. **動作確認とテスト** (5 分)
3. **コミット**: `chore: remove TagLink extension (replaced by UnifiedLinkMark)`
4. **1-2 週間の監視期間**
5. **PageLink suggestionPlugin 削除** (Phase 2.1 完了後)

---

**作成日**: 2025-10-12  
**ステータス**: 計画書  
**次のアクション**: TagLink Extension 削除の承認待ち
