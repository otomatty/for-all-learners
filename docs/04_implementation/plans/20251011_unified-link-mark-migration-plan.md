# 統合リンクマーク完全移行実装計画書

**作成日**: 2025 年 10 月 11 日  
**対象**: メモ機能のリンク実装統合  
**現在のブランチ**: `fix/preserve-bold-in-links`

---

## 目次

1. [エグゼクティブサマリー](#エグゼクティブサマリー)
2. [現状分析](#現状分析)
3. [実装状況マトリックス](#実装状況マトリックス)
4. [アーキテクチャ概観](#アーキテクチャ概観)
5. [段階的移行計画](#段階的移行計画)
6. [リスク分析と対策](#リスク分析と対策)
7. [スケジュールと優先順位](#スケジュールと優先順位)
8. [完了条件](#完了条件)

---

## エグゼクティブサマリー

### 背景

学習アプリのメモ機能では、ページ間リンクを実現するために 3 つの実装が混在しています：

1. **UnifiedLinkMark** (unilink) - 最新の統合 Mark 実装
2. **PageLinkMark** (pageLinkMark) - 過渡期の Mark 実装
3. **PageLink Extension** - Legacy Decoration ベース実装

現在、UnifiedLinkMark への移行が進行中であり、最終的には単一実装への統合を目指しています。

### 目標

- **主目標**: UnifiedLinkMark に完全統合し、コードの複雑性を削減
- **副目標**: 機能の一貫性向上、保守性の改善、パフォーマンス最適化
- **制約**: 既存コンテンツの互換性維持、段階的移行による安全性確保

### 現在の進捗

- ✅ **P1**: UnifiedLinkMark 基本実装完了
- ✅ **P2**: 非同期解決、キャッシュ、メトリクス実装完了
- ✅ **P3**: リアルタイム自動再解決実装完了
- ⏳ **P4**: Legacy 実装の削除（現在のフェーズ）

---

## 現状分析

### 1. UnifiedLinkMark (`unilink`) - ✅ 完全実装済み

**ファイル**: `lib/tiptap-extensions/unified-link-mark.ts`

#### 実装済み機能

| 機能               | ステータス  | 詳細                           |
| ------------------ | ----------- | ------------------------------ |
| InputRule ([text]) | ✅ 実装済み | ブラケット記法の自動変換       |
| 外部リンク検出     | ✅ 実装済み | http/https URL の自動判定      |
| 非同期ページ解決   | ✅ 実装済み | searchPages API による存在確認 |
| 状態管理           | ✅ 実装済み | pending → exists/missing/error |
| リトライ機能       | ✅ 実装済み | 最大 2 回の指数バックオフ      |
| キャッシュ         | ✅ 実装済み | 30 秒 TTL、メモリベース        |
| バッチ処理         | ✅ 実装済み | 10 件ずつの効率的解決          |
| BroadcastChannel   | ✅ 実装済み | クロスタブ同期                 |
| Realtime 連携      | ✅ 実装済み | Supabase Realtime 統合         |
| AutoReconciler     | ✅ 実装済み | 自動再解決システム             |
| MarkIndex          | ✅ 実装済み | 効率的なマーク検索             |
| メトリクス         | ✅ 実装済み | 専用メトリクス実装             |
| クリック処理       | ✅ 実装済み | exists/missing 別ハンドリング  |

#### 未実装機能

| 機能                 | ステータス  | 優先度 | 備考                             |
| -------------------- | ----------- | ------ | -------------------------------- |
| #タグ記法            | ❌ 未実装   | P5     | 仕様は策定済み、InputRule 未実装 |
| サジェスト機能       | ❌ 未実装   | P4     | PageLink から移植予定            |
| ページ作成ダイアログ | ⚠️ 部分実装 | P4     | resolver.ts に基本機能あり       |
| IndexedDB 永続化     | ❌ 未実装   | P6     | 現在はメモリキャッシュのみ       |
| 差分同期             | ❌ 未実装   | P7     | Collaboration 対応               |

#### サポートファイル

```
lib/unilink/
├── index.ts                   # エクスポート集約
├── utils.ts                   # 正規化、キャッシュ
├── resolver.ts                # ページ作成、ナビゲーション
├── metrics.ts                 # UnifiedLink専用メトリクス
├── broadcast-channel.ts       # クロスタブ通信
├── realtime-listener.ts       # Realtime連携
├── auto-reconciler.ts         # 自動再解決統合ロジック
├── mark-index.ts              # 効率的マーク検索
└── reconcile-queue.ts         # デバウンス付きキュー
```

---

### 2. PageLinkMark (`pageLinkMark`) - ⚠️ 過渡期実装

**ファイル**: `lib/tiptap-extensions/page-link-mark.ts`

#### 現在の役割

- UnifiedLinkMark 移行前の互換性維持
- 既存コンテンツのパース対応
- 一部 UI コンポーネントとの互換性

#### 実装機能

| 機能               | 利用状況              | 備考                    |
| ------------------ | --------------------- | ----------------------- |
| InputRule ([text]) | 🔄 UnifiedLink と重複 | 優先度 1000 で両方登録  |
| 非同期解決         | 🔄 UnifiedLink と重複 | 独自のメトリクス使用    |
| コマンド群         | ⚠️ 一部利用           | UI 層で直接参照の可能性 |
| 位置インデックス   | ✅ 独自実装           | UnifiedLink は別実装    |

#### 廃止方針

- **Phase 1**: エディタでの新規使用停止（UnifiedLink 優先）
- **Phase 2**: 既存マークの段階的変換
- **Phase 3**: コマンド互換レイヤーの提供
- **Phase 4**: 完全削除

---

### 3. PageLink Extension - ⏳ Legacy Decoration 実装

**ファイル**: `lib/tiptap-extensions/page-link.ts`

#### 構成要素の状態

| プラグイン       | ステータス  | 詳細                           |
| ---------------- | ----------- | ------------------------------ |
| bracketPlugin    | 🔄 残存     | 自動ブラケット閉じ機能         |
| suggestionPlugin | 🔄 残存     | サジェスト UI 表示（tippy.js） |
| existencePlugin  | ✅ 削除完了 | Mark 版に統合済み              |
| previewPlugin    | ✅ 削除完了 | Mark 版に移行済み              |
| Decoration 生成  | 🔄 残存     | Mark 優先、未マーク領域のみ    |

#### 削除計画（page-link-legacy-removal-plan.md）

```
Phase A: 機能同等性確保 ✅ 完了
Phase B: Legacy依存縮小 ⏳ 進行中
  ├── ✅ existencePlugin削除完了
  ├── ✅ previewPlugin削除完了
  └── ⏳ bracketPlugin削除予定
Phase C: 安全サンプリング ⏳ 準備中
Phase D: コード除去 ⏳ 未着手
```

#### 残存理由

1. **suggestionPlugin**: 入力補完 UI が UnifiedLink に未実装
2. **bracketPlugin**: 自動ブラケット閉じ機能の移行先未決定
3. **noteSlug 統合**: ノート機能との連携ロジック
4. **互換性レイヤー**: 既存コンテンツの段階的移行

---

## 実装状況マトリックス

### 機能別実装状況

| 機能カテゴリ           | UnifiedLink | PageLinkMark | PageLink   | 統合状況        |
| ---------------------- | ----------- | ------------ | ---------- | --------------- |
| **入力変換**           |
| [text] InputRule       | ✅ 実装     | 🔄 重複      | 🔄 重複    | ⚠️ 優先度で解決 |
| 自動ブラケット閉じ     | ❌          | ❌           | ✅ bracket | ⏳ 移行必要     |
| 外部リンク判定         | ✅ 実装     | ✅ 実装      | ✅ 実装    | ✅ 統合可能     |
| **ページ解決**         |
| 非同期検索             | ✅ 実装     | 🔄 重複      | 🔄 重複    | ⚠️ 統合必要     |
| キャッシュ             | ✅ 30s TTL  | ❌           | ❌         | ✅ Unified のみ |
| リトライ               | ✅ 指数 BO  | ❌           | ❌         | ✅ Unified のみ |
| バッチ処理             | ✅ 10 件    | ❌           | ❌         | ✅ Unified のみ |
| **状態管理**           |
| pending/exists/missing | ✅ 完全     | ✅ 簡易      | ❌         | ⚠️ 統合必要     |
| error 状態             | ✅ 実装     | ❌           | ❌         | ✅ Unified のみ |
| created 属性           | ✅ 実装     | ❌           | ❌         | ✅ Unified のみ |
| **UI 機能**            |
| サジェスト             | ❌          | ❌           | ✅ tippy   | ⏳ 移行必要     |
| ページ作成ダイアログ   | ⚠️ 部分     | ⚠️ 部分      | ✅ 完全    | ⏳ 移行必要     |
| ホバープレビュー       | ✅ Mark 版  | ✅ Mark 版   | ✅ 削除済  | ✅ 統合済み     |
| **リアルタイム**       |
| BroadcastChannel       | ✅ 実装     | ❌           | ❌         | ✅ Unified のみ |
| Realtime 連携          | ✅ 実装     | ❌           | ❌         | ✅ Unified のみ |
| AutoReconciler         | ✅ 実装     | ❌           | ❌         | ✅ Unified のみ |
| **メトリクス**         |
| 基本メトリクス         | ✅ 互換     | ✅ 互換      | ❌         | ✅ 両方対応     |
| 詳細メトリクス         | ✅ 専用     | ❌           | ❌         | ✅ Unified のみ |
| **その他**             |
| noteSlug 統合          | ❌          | ❌           | ✅ 実装    | ⏳ 移行必要     |
| .icon 記法             | ❌          | ❌           | ✅ 実装    | ⏳ 判断必要     |

### 依存関係マップ

```
TipTapEditor (components/tiptap-editor.tsx)
  │
  ├─→ UnifiedLinkMark (優先度1000)
  │     ├─→ lib/unilink/* (全サポートモジュール)
  │     ├─→ searchPages API
  │     └─→ page-link-preview-mark-plugin
  │
  ├─→ PageLinkMark (優先度1000)
  │     ├─→ searchPages API
  │     └─→ 基本メトリクス
  │
  └─→ PageLink Extension (configure: { noteSlug })
        ├─→ bracketPlugin
        ├─→ suggestionPlugin (tippy.js)
        ├─→ PageLinkMark (InputRule委譲)
        └─→ page-link-preview-mark-plugin
```

### 削除予定コードの影響範囲

| コンポーネント    | 削除予定 | 代替実装        | 影響範囲            |
| ----------------- | -------- | --------------- | ------------------- |
| PageLinkMark 全体 | Phase 4  | UnifiedLink     | エディタ設定、UI 層 |
| suggestionPlugin  | Phase 3  | Unified 実装    | 入力補完 UI         |
| bracketPlugin     | Phase 3  | InputRule 拡張  | 自動閉じ機能        |
| Decoration 生成   | Phase 3  | なし            | Legacy 互換性       |
| noteSlug 統合     | Phase 2  | Unified 実装    | ノート機能          |
| .icon 記法        | 要検討   | 専用 Extension? | アイコン表示        |

---

## アーキテクチャ概観

### 目標アーキテクチャ（Phase 4 完了後）

```
┌─────────────────────────────────────────────────────┐
│              TipTap Editor                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │    UnifiedLinkMark (unilink)               │   │
│  ├────────────────────────────────────────────┤   │
│  │ InputRules:                                │   │
│  │  - [text]  → bracket variant               │   │
│  │  - #tag    → tag variant (Phase 5)         │   │
│  │  - auto-close brackets                     │   │
│  ├────────────────────────────────────────────┤   │
│  │ State Machine:                             │   │
│  │  pending → exists / missing / error        │   │
│  ├────────────────────────────────────────────┤   │
│  │ Commands:                                  │   │
│  │  - insertUnifiedLink                       │   │
│  │  - refreshUnifiedLinks                     │   │
│  │  - createPageFromMissingLink               │   │
│  └────────────────────────────────────────────┘   │
│              ↓                                     │
│  ┌────────────────────────────────────────────┐   │
│  │    Suggestion Plugin (Phase 3実装)         │   │
│  │  - Floating UI サジェストメニュー          │   │
│  │  - 検索結果リアルタイム表示                │   │
│  └────────────────────────────────────────────┘   │
│              ↓                                     │
│  ┌────────────────────────────────────────────┐   │
│  │    Resolver Queue (非同期バッチ処理)       │   │
│  │  - 10件バッチ、リトライ機能                │   │
│  └────────────────────────────────────────────┘   │
│              ↓                                     │
│  ┌────────────────────────────────────────────┐   │
│  │    Cache Layer (30s TTL)                   │   │
│  └────────────────────────────────────────────┘   │
│              ↓                                     │
│  ┌────────────────────────────────────────────┐   │
│  │    searchPages API (Supabase)              │   │
│  └────────────────────────────────────────────┘   │
│              ↓                                     │
│  ┌────────────────────────────────────────────┐   │
│  │    Mark State Update                       │   │
│  └────────────────────────────────────────────┘   │
│              ↓                                     │
│  ┌────────────────────────────────────────────┐   │
│  │    AutoReconciler (リアルタイム自動更新)    │   │
│  │  - BroadcastChannel (クロスタブ)           │   │
│  │  - Realtime Listener (Supabase)            │   │
│  │  - Visibility/Online復帰                   │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### データフロー（完全統合後）

```
1. ユーザー入力: [Page Title]
   ↓
2. InputRule検出 (UnifiedLinkMark)
   ↓
3. Mark生成 (state: "pending")
   - markId: 一意識別子生成
   - key: normalizeTitleToKey()
   - variant: "bracket"
   ↓
4. Resolver Queue追加
   ↓
5. キャッシュチェック (30s TTL)
   - Hit → state: "exists" (即座に更新)
   - Miss → 次へ
   ↓
6. searchPages(key) バッチ実行
   ↓
7. 結果判定
   - 完全一致 → state: "exists", pageId設定
   - 不一致   → state: "missing"
   - エラー   → state: "error"
   ↓
8. Mark State更新
   ↓
9. メトリクス記録
   ↓
10. BroadcastChannel通知 (他タブ同期)
```

---

## 段階的移行計画

### Phase 1: 互換性レイヤー確立 ✅ 完了

**目標**: UnifiedLinkMark と PageLinkMark の共存環境構築

#### 完了タスク

- [x] UnifiedLinkMark 基本実装（P1）
- [x] 非同期解決とキャッシュ（P2）
- [x] リアルタイム自動再解決（P3）
- [x] priority: 1000 設定（Mark 順序制御）
- [x] 両 Mark の同時登録

#### 検証結果

- ✅ 両 Mark 共存時の動作確認
- ✅ priority 設定による順序制御
- ✅ bold/italic との組み合わせ

---

### Phase 2: 機能移植（現在のフェーズ）

**目標**: PageLink Extension から UnifiedLinkMark への機能移植

#### タスク一覧

##### 2.1 サジェスト機能の移植 ⏳ 優先度: 高

**現状**: PageLink の suggestionPlugin が tippy.js 依存

**実装計画**:

```typescript
// lib/tiptap-extensions/unified-link-suggestion.ts (新規)

import { Plugin, PluginKey } from "prosemirror-state";
import Tippy from "tippy.js";
import { searchPages } from "@/lib/utils/searchPages";

interface SuggestionState {
  active: boolean;
  range: { from: number; to: number } | null;
  query: string;
  results: Array<{ id: string; title: string }>;
  selectedIndex: number;
}

export const unifiedLinkSuggestionPlugin = new Plugin<SuggestionState>({
  key: new PluginKey("unifiedLinkSuggestion"),

  state: {
    init: () => ({
      active: false,
      range: null,
      query: "",
      results: [],
      selectedIndex: 0,
    }),

    apply: (tr, prev) => {
      // 1. ブラケット検出
      // 2. debounce検索
      // 3. 結果更新
    },
  },

  view: (editorView) => {
    // Tippy.js UIの制御
    // キーボードナビゲーション
    // 選択時のMark挿入
  },
});
```

**移行ステップ**:

1. 新プラグイン実装
2. UnifiedLinkMark への統合
3. PageLink suggestionPlugin との並行稼働
4. 機能検証完了後、PageLink 版削除

**工数見積**: 2-3 日

---

##### 2.2 自動ブラケット閉じ機能の移植 ⏳ 優先度: 中

**現状**: PageLink の bracketPlugin が実装

**実装計画**:

```typescript
// UnifiedLinkMark内に統合

addInputRules() {
  return [
    // 既存の [text] 変換ルール
    bracketRule,

    // 新規: 自動閉じルール
    new InputRule({
      find: /\[$/,
      handler: ({ state, range, match }) => {
        const $pos = state.selection.$from;
        const paraEnd = $pos.end($pos.depth);
        const after = state.doc.textBetween(range.to, paraEnd);

        if (/^\s*$/.test(after)) {
          // 末尾なら自動閉じ
          const tr = state.tr.insertText("[]", range.from, range.to);
          tr.setSelection(TextSelection.create(tr.doc, range.from + 1));
          return tr;
        }
      },
    }),
  ];
}
```

**工数見積**: 0.5 日

---

##### 2.3 ページ作成ダイアログの完全実装 ⏳ 優先度: 高

**現状**: resolver.ts に基本機能あり、UI が不完全

**実装計画**:

```typescript
// components/create-page-dialog.tsx (新規または拡張)

interface CreatePageDialogProps {
  title: string;
  onCreated: (pageId: string) => void;
  onCancel: () => void;
}

export function CreatePageDialog({
  title,
  onCreated,
  onCancel,
}: CreatePageDialogProps) {
  // 1. タイトル編集UI
  // 2. 初期コンテンツ選択
  // 3. 公開/非公開設定
  // 4. ノートへの関連付け（noteSlug統合）
  // 5. 作成実行
}
```

**統合先**: `lib/unilink/resolver.ts`の`handleMissingLinkClick`

**工数見積**: 1-2 日

---

##### 2.4 noteSlug 機能の統合 ⏳ 優先度: 中

**現状**: PageLink Extension の configure オプションとして noteSlug を受け取り

**実装計画**:

```typescript
// UnifiedLinkMarkのオプション拡張

export interface UnifiedLinkMarkOptions {
  HTMLAttributes: Record<string, any>;
  autoReconciler?: AutoReconciler | null;
  noteSlug?: string | null; // 新規追加
}

// resolver.tsでnoteSlug考慮

export async function createPageFromMark(
  editor: Editor,
  markId: string,
  title: string,
  userId?: string,
  noteSlug?: string // 新規追加
): Promise<string | null> {
  // ページ作成時にnoteSlugがあればnote_pagesテーブルに関連付け
}
```

**工数見積**: 1 日

---

##### 2.5 .icon 記法のサポート判断 ⏳ 優先度: 低

**現状**: PageLink が`[title.icon]`をサポート

**選択肢**:

1. **UnifiedLinkMark に統合**: `variant: "icon"`を追加
2. **専用 Extension 化**: 別 extension として分離
3. **廃止**: 使用頻度が低ければ削除

**推奨**: 使用頻度調査後に判断

**工数見積**: 調査 0.5 日 + 実装 1-2 日（統合の場合）

---

### Phase 3: PageLinkMark 廃止準備

**目標**: PageLinkMark への新規依存を停止

#### タスク一覧

##### 3.1 エディタ設定の更新 ⏳

```typescript
// components/tiptap-editor.tsx

extensions: [
  // PageLinkMarkをコメントアウトまたは削除
  // PageLinkMark,

  UnifiedLinkMark.configure({
    noteSlug, // Phase 2.4で追加
  }),

  // PageLink ExtensionはPhase 4まで残す
  PageLink.configure({
    noteSlug,
  }),
];
```

**工数見積**: 0.5 日

---

##### 3.2 UI 層の更新 ⏳

既存の PageLinkMark コマンドを使用しているコンポーネントを調査・更新

```bash
# 調査コマンド
grep -r "setPageLink\|togglePageLink\|refreshPageLinkMarks" components/
```

**工数見積**: 調査 0.5 日 + 修正 1 日

---

##### 3.3 既存マークの変換スクリプト ⏳

```typescript
// scripts/migrate-page-link-marks.ts (新規)

import { createClient } from "@/lib/supabase/client";

async function migratePageLinkMarks() {
  // 1. 全ページのcontent_tiptapを取得
  // 2. pageLinkMarkをunilinkに変換
  // 3. 更新
}
```

**工数見積**: 1 日（実装） + テスト期間

---

### Phase 4: Legacy Extension 削除

**目標**: PageLink Extension の完全削除

#### 削除可能条件

- [ ] Phase 2 の全機能移植完了
- [ ] Phase 3 の既存マーク変換完了
- [ ] 本番環境で 1 週間の安定稼働
- [ ] メトリクスで missing 比率 < 5%

#### タスク一覧

##### 4.1 suggestionPlugin 削除 ⏳

- UnifiedLink 版実装完了後
- 並行稼働期間: 2 週間
- 削除前にメトリクス確認

##### 4.2 bracketPlugin 削除 ⏳

- UnifiedLinkMark への統合完了後
- 自動閉じ機能の動作検証

##### 4.3 Decoration 生成コード削除 ⏳

- Mark 変換完了後
- Legacy 互換性が不要になった時点

##### 4.4 PageLink Extension 完全削除 ⏳

- 上記すべて完了後
- エディタからの登録削除
- ファイル削除

**工数見積**: 1 日

---

### Phase 5: 拡張機能実装（将来）

**目標**: 新機能の追加

#### 5.1 #タグ記法のサポート

- `#タグ` InputRule の実装
- `variant: "tag"`の完全サポート

#### 5.2 IndexedDB 永続キャッシュ

- メモリキャッシュ →IndexedDB への拡張
- オフライン対応強化

#### 5.3 Collaboration 対応

- Yjs 統合
- 差分同期実装

---

## リスク分析と対策

### 高リスク項目

#### R1: 既存コンテンツの互換性喪失

**リスク**: PageLinkMark 削除時にパース不可

**対策**:

- 段階的変換スクリプトの実装
- ロールバック可能なマイグレーション
- 変換前のバックアップ

**検証方法**:

```typescript
// テストケース
const oldContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Link",
          marks: [
            {
              type: "pageLinkMark",
              attrs: {
                /* ... */
              },
            },
          ],
        },
      ],
    },
  ],
};

// 変換後もパース可能か検証
expect(editor.setContent(oldContent)).not.toThrow();
```

---

#### R2: サジェスト機能の性能劣化

**リスク**: 新実装がレスポンス遅延を起こす

**対策**:

- debounce 時間の調整（300ms 推奨）
- キャッシュの活用
- バッチ検索の実装

**メトリクス**:

- サジェスト表示時間 < 500ms
- キーストローク遅延 < 50ms

---

#### R3: Mark 優先順位の競合

**リスク**: bold/italic 等との組み合わせでレンダリング不具合

**現状**: priority: 1000 で解決済み

**継続監視**: 新 Extension 追加時に再評価

---

### 中リスク項目

#### R4: noteSlug 統合の不完全実装

**リスク**: ノート機能との連携不具合

**対策**:

- 既存の PageLink 実装を参考に慎重に移植
- ノート機能の包括的テスト

---

#### R5: メトリクスの欠落

**リスク**: 移行後の問題検出が遅れる

**対策**:

- 両実装で共通メトリクスを継続
- ダッシュボードでの継続監視

---

## スケジュールと優先順位

### 推奨実装順序

```
Week 1-2: Phase 2.1 サジェスト機能移植
  ├─ 実装: 5日
  ├─ テスト: 2日
  └─ 並行稼働開始

Week 3: Phase 2.2, 2.3, 2.4 並行実装
  ├─ 自動閉じ: 0.5日
  ├─ ダイアログ: 2日
  └─ noteSlug: 1日

Week 4: Phase 2.5調査 + Phase 3.1-3.2
  ├─ .icon調査: 0.5日
  ├─ エディタ更新: 0.5日
  └─ UI層更新: 1.5日

Week 5: Phase 3.3 マーク変換
  ├─ スクリプト実装: 1日
  ├─ テスト: 2日
  └─ 段階的実行

Week 6-7: Phase 4準備期間
  ├─ 本番監視: 1週間
  ├─ メトリクス評価
  └─ 削除判断

Week 8: Phase 4 削除実行
  ├─ Plugin削除: 0.5日
  ├─ Extension削除: 0.5日
  ├─ ドキュメント更新: 1日
  └─ リリース
```

### マイルストーン

| マイルストーン         | 完了条件                             | 目標日        |
| ---------------------- | ------------------------------------ | ------------- |
| M1: サジェスト移植完了 | 新 UI が動作、並行稼働開始           | Week 2 終了時 |
| M2: 全機能移植完了     | Phase 2 完了、UnifiedLink が機能完全 | Week 4 終了時 |
| M3: PageLinkMark 廃止  | Phase 3 完了、新規依存なし           | Week 5 終了時 |
| M4: Legacy 削除完了    | Phase 4 完了、単一実装化             | Week 8 終了時 |

---

## 完了条件（Definition of Done）

### 技術的要件

- [ ] UnifiedLinkMark が全機能を実装
- [ ] PageLinkMark への新規依存ゼロ
- [ ] PageLink Extension 完全削除
- [ ] エディタが UnifiedLinkMark のみ登録
- [ ] 既存コンテンツが正常にパース
- [ ] TypeScript コンパイルエラーゼロ
- [ ] ESLint エラーゼロ

### 機能的要件

- [ ] [text]形式の入力変換が動作
- [ ] 外部リンクの自動判定が動作
- [ ] サジェスト UI が表示され選択可能
- [ ] ページ作成ダイアログが動作
- [ ] missing→exists の自動更新が動作
- [ ] クロスタブ同期が動作
- [ ] ホバープレビューが表示

### 品質要件

- [ ] サジェスト表示 < 500ms
- [ ] ページ解決 < 2 秒（90 パーセンタイル）
- [ ] missing 比率 < 5%
- [ ] エラー発生率 < 1%
- [ ] クラッシュゼロ

### ドキュメント要件

- [ ] 実装ドキュメント更新
- [ ] API ドキュメント作成
- [ ] マイグレーションガイド作成
- [ ] CHANGELOG 更新
- [ ] コードコメント充実

### テスト要件

- [ ] ユニットテスト: カバレッジ > 80%
- [ ] 統合テスト: 主要フロー全カバー
- [ ] E2E テスト: ユーザーシナリオ検証
- [ ] 性能テスト: ベンチマーク達成
- [ ] 互換性テスト: 既存コンテンツ検証

---

## 付録

### A. 関連ドキュメント

- [統合リンクマーク仕様書](../03_design/specifications/unified-link-mark-spec.md)
- [Legacy 削除計画](../03_design/features/page-link-legacy-removal-plan.md)
- [P3 実装サマリー](./unified-link-mark-p3-summary.md)
- [リンク実装調査レポート](../../07_research/2025_10/20251010/link-implementation-investigation.md)

### B. 主要ファイルリスト

```
実装ファイル:
├── lib/tiptap-extensions/
│   ├── unified-link-mark.ts          # メイン実装
│   ├── page-link-mark.ts             # 廃止予定
│   ├── page-link.ts                  # 廃止予定
│   └── page-link-preview-mark-plugin.ts
├── lib/unilink/
│   ├── index.ts
│   ├── utils.ts
│   ├── resolver.ts
│   ├── metrics.ts
│   ├── broadcast-channel.ts
│   ├── realtime-listener.ts
│   ├── auto-reconciler.ts
│   ├── mark-index.ts
│   └── reconcile-queue.ts
└── components/
    └── tiptap-editor.tsx

テストファイル（作成予定）:
├── __tests__/
│   ├── unified-link-mark.test.ts
│   ├── unilink-resolver.test.ts
│   └── unilink-integration.test.ts

マイグレーション:
└── scripts/
    └── migrate-page-link-marks.ts
```

### C. メトリクス定義

```typescript
// 収集すべきメトリクス

interface LinkMetrics {
  // 解決メトリクス
  resolutionTime: number; // 解決時間（ms）
  cacheHitRate: number; // キャッシュヒット率（%）
  missingRate: number; // missing比率（%）
  errorRate: number; // エラー発生率（%）

  // サジェストメトリクス
  suggestionLatency: number; // サジェスト表示時間（ms）
  suggestionAcceptRate: number; // 受け入れ率（%）

  // ページ作成メトリクス
  pageCreationRate: number; // missingからの作成率（%）
  creationSuccessRate: number; // 作成成功率（%）

  // パフォーマンスメトリクス
  markUpdateLatency: number; // マーク更新時間（ms）
  editorLagTime: number; // エディタ遅延時間（ms）
}
```

---

## 改訂履歴

| 版  | 日付       | 変更内容 | 作成者       |
| --- | ---------- | -------- | ------------ |
| 1.0 | 2025-10-11 | 初版作成 | AI Assistant |

---

## 承認

| 役割               | 氏名 | 承認日 | 署名 |
| ------------------ | ---- | ------ | ---- |
| 技術リード         | -    | -      | -    |
| プロダクトオーナー | -    | -      | -    |
| QA リード          | -    | -      | -    |

---

**END OF DOCUMENT**
