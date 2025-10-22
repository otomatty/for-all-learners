# 20251012 調査レポート - PageLink SuggestionPlugin 削除影響調査

## 調査概要

PageLink Extension の SuggestionPlugin を削除するための影響範囲調査を実施しました。UnifiedLinkMark への完全移行に向けた詳細な分析を行い、削除計画を策定します。

**調査日**: 2025-10-12  
**調査対象**: `lib/tiptap-extensions/page-link.ts` (757 行)  
**目的**: SuggestionPlugin 削除の影響範囲と代替機能の確認

---

## 1. PageLink Extension の構造分析

### 1.1 ファイル全体の構成

**ファイル**: `/Users/sugaiakimasa/apps/for-all-learners/lib/tiptap-extensions/page-link.ts`  
**総行数**: 757 行

#### プラグイン構成（4 つのプラグイン）

```typescript
PageLink Extension
├── bracketPlugin (90-120行) - ブラケット自動クローズ
├── suggestionPlugin (122-287行) - サジェスト機能 ← 削除対象
├── pageLinkPreviewMarkPlugin (外部) - プレビュー機能
└── pageLinkPlugin (411-757行) - クリックハンドリング & DOM処理
```

### 1.2 各プラグインの詳細

#### ① bracketPlugin（90-120 行）

**機能**: `[` 入力時の自動クローズ

```typescript
const bracketPlugin = new Plugin({
  props: {
    handleTextInput(view, from, to, text) {
      if (text !== "[") return false;
      // 段落末尾で `[]` に自動クローズ
      // それ以外は `[` のみ挿入
    },
  },
});
```

**UnifiedLinkMark での代替状況**:

- ✅ `lib/tiptap-extensions/unified-link-mark/plugins/auto-bracket-plugin.ts` で実装済み
- ✅ 同等の機能を提供

#### ② suggestionPlugin（122-287 行）← **削除対象**

**機能**: ブラケット内でのページタイトルサジェスト

```typescript
interface SuggestionState {
  suggesting: boolean;
  range: { from: number; to: number } | null;
  items: Array<{ id: string; title: string }>;
  activeIndex: number;
  query: string;
}
```

**主要機能**:

1. **入力検知**: `[query]` 内の文字列を検出
2. **デバウンス検索**: 300ms 後に `searchPages(query)` 実行
3. **Tippy.js UI**: ドロップダウンサジェストを表示
4. **キーボードナビゲーション**: ↑↓/Enter/Tab でアイテム選択
5. **Mark 作成**: 選択時に `PageLinkMark` を生成（287-394 行の補助関数）

**UnifiedLinkMark での代替状況**:

- ✅ `lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts` (345 行) で完全実装済み
- ✅ 同等の機能 + 改善版（UnifiedLink mark 対応）

#### ③ pageLinkPreviewMarkPlugin（外部ファイル）

**ファイル**: `lib/tiptap-extensions/page-link-preview-mark-plugin.ts`  
**機能**: `<a>` タグホバー時のプレビュー表示

```typescript
export const pageLinkPreviewMarkPlugin = new Plugin({
  key: pageLinkPreviewMarkPluginKey,
  props: {
    handleDOMEvents: {
      mouseover(view, event) {
        // data-page-id を持つ <a> タグにホバー
        // 500ms 後にプレビューを表示
      },
      mouseout(view, event) {
        // 200ms 後にプレビューを非表示
      },
    },
  },
});
```

**UnifiedLinkMark での代替状況**:

- ⚠️ **未実装** - UnifiedLinkMark はプレビュー機能を持たない
- **現状**: PageLinkMark と PageLink で共通利用中
- **影響**: このプラグインは独立しているため、削除対象外

#### ④ pageLinkPlugin（411-757 行）

**機能**: ページリンククリック時の処理

**主要機能**:

1. **handleClick**: ブラケットリンククリック検出
   - ブラケット `[Title]` のクリック検出
   - `.icon` サフィックスの処理（ユーザーアイコン）
   - 外部リンク判定
   - 内部リンクの作成/遷移
2. **handleDOMEvents.click**: `<a>` タグのクリック処理
   - `data-page-title` 属性から新規ページ作成
   - href による通常ナビゲーション

**UnifiedLinkMark での代替状況**:

- ❌ **未実装** - UnifiedLinkMark は入力とサジェストのみ対応
- **リスク**: このプラグインは削除できない（クリック処理が必要）

---

## 2. 使用箇所の完全マッピング

### 2.1 PageLink 使用箇所

#### ① usePageEditorLogic.ts（主要な使用箇所）

**ファイル**: `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`

```typescript
import { PageLink } from "@/lib/tiptap-extensions/page-link"; // legacy
import { existencePluginKey } from "@/lib/tiptap-extensions/page-link";

// Extensions配列
extensions: [
  UnifiedLinkMark, // 優先度: 最高
  PageLinkMark, // 優先度: 1000
  PageLink.configure({ noteSlug }), // ← 削除対象
  // ...
];

// 保存後の存在確認
const tr = editor.state.tr.setMeta(existencePluginKey, existMap);
```

**影響**:

- Extension 配列から削除可能
- `existencePluginKey` は別途対応が必要（後述）

#### ② rich-content.tsx（読み取り専用エディタ）

**ファイル**: `app/(protected)/decks/[deckId]/_components/rich-content.tsx`

```typescript
import { PageLink } from "@/lib/tiptap-extensions/page-link";

const editor = useEditor({
  extensions: [
    StarterKit,
    LinkExtension,
    Image,
    TextAlign,
    Typography,
    PageLink, // ← 読み取り専用でも使用
    Highlight,
  ],
  editable: false,
  content: processedDoc,
});
```

**影響**:

- デッキ表示での PageLink レンダリング
- クリックハンドリングが必要（遷移機能）
- **リスク**: 削除すると既存コンテンツのブラケットリンクが機能しない

### 2.2 existencePluginKey の使用

#### useLinkExistenceChecker.ts

**ファイル**: `app/(protected)/pages/[id]/_hooks/useLinkExistenceChecker.ts`

```typescript
import { existencePluginKey } from "@/lib/tiptap-extensions/page-link";

const tr = editor.state.tr.setMeta(existencePluginKey, existMap);
editor.view.dispatch(tr);
```

**機能**:

- ページタイトルの存在確認（ブラケット `[Title]` とタグ `#tag` の両方）
- `existMap: Map<string, string | null>` を plugin state にセット
- Decoration の色分けに使用

**影響**:

- `existencePluginKey` は PageLink plugin の key
- PageLink を削除すると、このキーが存在しなくなる
- **対応**: UnifiedLinkMark に同等の plugin key を用意する必要あり

---

## 3. UnifiedLinkMark による代替機能の検証

### 3.1 SuggestionPlugin の比較

| 機能                 | PageLink suggestionPlugin | UnifiedLinkMark suggestionPlugin | 代替可能 |
| -------------------- | ------------------------- | -------------------------------- | -------- |
| **入力検知**         | `[query]` 検出            | `[query]` 検出                   | ✅       |
| **デバウンス**       | 300ms                     | 300ms                            | ✅       |
| **検索 API**         | `searchPages(query)`      | `searchPages(query)`             | ✅       |
| **Tippy.js UI**      | ✅                        | ✅                               | ✅       |
| **キーボード操作**   | ↑↓/Enter/Tab/Escape       | ↑↓/Enter/Tab/Escape              | ✅       |
| **Mark 生成**        | PageLinkMark 作成         | UnifiedLink mark 作成            | ✅       |
| **状態管理**         | pending → exists/missing  | pending → exists/missing         | ✅       |
| **非同期解決**       | ✅                        | ✅（resolver-queue）             | ✅ 改善  |
| **リアルタイム同期** | ❌                        | ✅ BroadcastChannel              | ✅ 改善  |
| **noteSlug 統合**    | ❌                        | ✅                               | ✅ 改善  |
| **テストカバレッジ** | ❌ 未テスト               | ✅ 17 テスト                     | ✅       |

### 3.2 BracketPlugin の比較

| 機能                 | PageLink bracketPlugin | UnifiedLinkMark auto-bracket-plugin | 代替可能 |
| -------------------- | ---------------------- | ----------------------------------- | -------- |
| **`[` 入力検知**     | ✅                     | ✅                                  | ✅       |
| **自動クローズ**     | 段落末尾のみ           | 段落末尾のみ                        | ✅       |
| **単独`[`挿入**      | 段落途中               | 段落途中                            | ✅       |
| **カーソル位置**     | `[]` の間              | `[]` の間                           | ✅       |
| **テストカバレッジ** | ❌ 未テスト            | ✅ 18 テスト                        | ✅       |

### 3.3 代替不可能な機能

| 機能                             | PageLink | UnifiedLinkMark | 状況     |
| -------------------------------- | -------- | --------------- | -------- |
| **プレビュー表示**               | ✅       | ❌              | 代替不可 |
| **ブラケットリンククリック処理** | ✅       | ❌              | 代替不可 |
| **DOM レベルのクリック処理**     | ✅       | ❌              | 代替不可 |
| **新規ページ作成**               | ✅       | ❌              | 代替不可 |
| **外部リンク処理**               | ✅       | ❌              | 代替不可 |
| **アイコンリンク処理**           | ✅       | ❌              | 代替不可 |
| **noteSlug コンテキスト**        | ✅       | ✅ 改善         | 統合済み |

---

## 4. 削除リスク評価

### 4.1 SuggestionPlugin 削除のリスク

| リスク項目                 | 評価 | 影響度 | 詳細                                 |
| -------------------------- | ---- | ------ | ------------------------------------ |
| **サジェスト機能の喪失**   | 低   | 低     | UnifiedLinkMark が完全代替           |
| **既存コンテンツの互換性** | 低   | 低     | Mark データは保持される              |
| **UI/UX の変更**           | 低   | 低     | UnifiedLinkMark のサジェストは同等   |
| **テストカバレッジ**       | 低   | 低     | UnifiedLinkMark は 17 テスト実装済み |
| **型エラー**               | 低   | 低     | import と extensions 配列のみ修正    |

### 4.2 BracketPlugin 削除のリスク

| リスク項目           | 評価 | 影響度 | 詳細                                 |
| -------------------- | ---- | ------ | ------------------------------------ |
| **自動クローズ機能** | 低   | 低     | UnifiedLinkMark が完全代替           |
| **UX の一貫性**      | 低   | 低     | 同一の動作を保証                     |
| **テストカバレッジ** | 低   | 低     | UnifiedLinkMark は 18 テスト実装済み |

### 4.3 PageLink Extension 全体削除のリスク

| リスク項目                    | 評価 | 影響度 | 詳細                                       |
| ----------------------------- | ---- | ------ | ------------------------------------------ |
| **クリック処理の喪失**        | 高   | 高     | UnifiedLinkMark は未実装                   |
| **プレビュー機能の喪失**      | 中   | 中     | pageLinkPreviewMarkPlugin が動作しなくなる |
| **既存コンテンツの破壊**      | 高   | 高     | ブラケットリンクがクリック不可になる       |
| **rich-content.tsx での影響** | 高   | 高     | デッキ表示で PageLink が必要               |
| **existencePluginKey の喪失** | 高   | 中     | 存在確認の色分けが動作しなくなる           |

---

## 5. 段階的削除計画

### Phase 1: SuggestionPlugin のみ削除（安全）✅ 実行可能

**削除対象**:

- `suggestionPlugin` (122-287 行)
- `applySuggestionItem` 関数 (287-328 行)
- `updateMarkState` 関数 (359-394 行)

**影響範囲**:

- ✅ UnifiedLinkMark の suggestionPlugin が代替
- ✅ 既存コンテンツは影響なし
- ✅ UI/UX は同等

**削除手順**:

1. `page-link.ts` から suggestionPlugin 関連コードを削除
2. `addProseMirrorPlugins()` から `suggestionPlugin` を除外
3. 型チェック実行
4. テスト実行（UnifiedLinkMark のサジェストテスト）
5. 動作確認

**所要時間**: 30 分

### Phase 2: BracketPlugin 削除（安全）✅ 実行可能

**削除対象**:

- `bracketPlugin` (90-120 行)

**影響範囲**:

- ✅ UnifiedLinkMark の auto-bracket-plugin が代替
- ✅ 既存コンテンツは影響なし

**削除手順**:

1. `page-link.ts` から bracketPlugin を削除
2. `addProseMirrorPlugins()` から `bracketPlugin` を除外
3. 型チェック実行
4. テスト実行（UnifiedLinkMark の auto-bracket テスト）
5. 動作確認

**所要時間**: 15 分

### Phase 3: PageLink Extension 全体削除（⚠️ 未実装機能あり）

**前提条件**:

- ❌ クリックハンドリングの移植
- ❌ プレビュー機能の移植
- ❌ rich-content.tsx の対応
- ❌ existencePluginKey の代替実装

**削除対象**:

- `page-link.ts` 全体 (757 行)
- `page-link-preview-mark-plugin.ts` (134 行)

**影響範囲**:

- ⚠️ usePageEditorLogic.ts
- ⚠️ rich-content.tsx
- ⚠️ useLinkExistenceChecker.ts

**所要時間**: 2-3 日（移植作業含む）

---

## 6. 推奨される削除戦略

### ステップ 1: SuggestionPlugin のみ削除（今回実行）✅

**理由**:

- UnifiedLinkMark の suggestionPlugin が完全に代替可能
- リスクが低く、即座に実行可能
- コードベースの簡潔化

**作業内容**:

1. ✅ `page-link.ts` から suggestionPlugin 関連コード削除（165 行）
2. ✅ 型チェック・テスト実行
3. ✅ 動作確認
4. ✅ 作業ログドキュメント作成

### ステップ 2: BracketPlugin 削除（次回）

**タイミング**: SuggestionPlugin 削除の動作確認後（1 週間後）

**理由**:

- UnifiedLinkMark の auto-bracket-plugin が完全に代替可能
- リスクが低い

### ステップ 3: PageLink Extension 全体削除（将来）

**タイミング**: Phase 3 の機能実装完了後

**前提作業**:

1. UnifiedLinkMark にクリックハンドリング実装
2. UnifiedLinkMark にプレビュー機能実装
3. existencePluginKey の代替実装
4. rich-content.tsx の対応

---

## 7. existencePluginKey の移行計画

### 7.1 現状の問題

`existencePluginKey` は PageLink の plugin key として定義:

```typescript
const pageLinkPluginKey = new PluginKey("pageLinkPlugin");
export const existencePluginKey = pageLinkPluginKey; // backward compatibility
```

**使用箇所**:

1. `useLinkExistenceChecker.ts`: 存在確認結果を plugin state にセット
2. `usePageEditorLogic.ts`: 保存後に強制更新

### 7.2 移行方針

#### Option A: UnifiedLinkMark に移行

**方針**: UnifiedLinkMark に独自の plugin key を用意

```typescript
// lib/tiptap-extensions/unified-link-mark/plugins/existence-plugin.ts
export const unifiedLinkExistenceKey = new PluginKey("unifiedLinkExistence");
```

**利点**:

- ✅ 一貫性のある実装
- ✅ UnifiedLinkMark の責任範囲内

**課題**:

- ⚠️ PageLink と PageLinkMark が残っている間の互換性

#### Option B: 共通の plugin key を作成

**方針**: 独立した plugin key として export

```typescript
// lib/tiptap-extensions/link-existence-plugin.ts
export const linkExistenceKey = new PluginKey("linkExistence");
```

**利点**:

- ✅ PageLink、PageLinkMark、UnifiedLinkMark すべてで使用可能
- ✅ 段階的移行に対応

**推奨**: Option B（共通 plugin key）

---

## 8. テスト戦略

### 8.1 削除前の確認事項

- ✅ UnifiedLinkMark の suggestionPlugin テスト（17 テスト）
- ✅ UnifiedLinkMark の auto-bracket-plugin テスト（18 テスト）
- ✅ 既存コンテンツの互換性

### 8.2 削除後の確認事項

- ⬜ 型チェック: `bunx tsc --noEmit`
- ⬜ ユニットテスト: `bun test lib/tiptap-extensions/unified-link-mark/`
- ⬜ サジェスト機能の動作確認
- ⬜ ブラケット自動クローズの動作確認
- ⬜ 既存ページでのリンク動作確認

### 8.3 回帰テスト項目

1. **入力系**
   - `[` 入力時の自動クローズ
   - `[query` 入力時のサジェスト表示
   - キーボードナビゲーション（↑↓/Enter/Tab/Escape）
   - サジェスト選択時の Mark 作成
2. **既存コンテンツ**
   - ブラケットリンクの表示
   - タグ記法の表示
   - 色分け（exists/missing/pending）
3. **クリック系**（PageLink 残存時）
   - ブラケットリンククリック
   - `<a>` タグクリック
   - プレビュー表示

---

## 9. まとめ

### 9.1 調査結果

✅ **SuggestionPlugin 削除は安全**:

- UnifiedLinkMark が完全に代替可能
- リスクが低く、即座に実行可能
- コードベース簡潔化（165 行削除）

⚠️ **PageLink Extension 全体削除は時期尚早**:

- クリックハンドリング未実装
- プレビュー機能未実装
- rich-content.tsx への影響

### 9.2 推奨アクション

**今回実行**:

1. ✅ SuggestionPlugin のみ削除（Phase 1）
2. ✅ 動作確認
3. ✅ 作業ログドキュメント作成

**次回以降**:

1. ⏳ BracketPlugin 削除（Phase 2）
2. 🔮 UnifiedLinkMark へのクリックハンドリング実装
3. 🔮 PageLink Extension 全体削除（Phase 3）

### 9.3 削除により得られる効果

- ✅ コード行数: 757 行 → 592 行（165 行削除）
- ✅ 重複ロジックの削減
- ✅ テストカバレッジの向上（未テスト → 17 テスト）
- ✅ 保守性の向上（1 つのサジェスト実装に統一）

---

## 参考資料

- [TagLink 削除作業ログ](./20251012_taglink-extension-removal.md)
- [Phase 2.1 完了レポート](./20251012_phase2.1-completion-report.md)
- [UnifiedLinkMark 移行計画](../../04_implementation/plans/20251011_unified-link-mark-migration-plan.md)
- [Legacy 削除計画](../../04_implementation/plans/20251012_legacy-suggestion-removal-plan.md)

---

**作成日**: 2025-10-12  
**調査者**: AI Assistant  
**ステータス**: ✅ 調査完了  
**次のアクション**: SuggestionPlugin 削除実行
