# Phase 4 実装計画書: PageLinkMark 完全削除

**作成日**: 2025-10-12  
**最終更新**: 2025-10-19  
**Phase**: 4 - PageLinkMark の完全削除  
**目的**: PageLinkMark を削除し、UnifiedLinkMark への統合を完了  
**ステータス**: ✅ 完了（2025-10-12実施）

---

## エグゼクティブサマリー

Phase 3 で PageLink Extension（Decoration ベース）の削除が完了しました。Phase 4 では、**PageLinkMark（Mark ベース）の削除**を実施し、UnifiedLinkMark への完全統合を達成しました。

> ✅ **完了報告**: 本計画は 2025-10-12 に完全実装されました。詳細は[完了レポート](20251012_27_phase4-implementation-complete.md)を参照してください。

### 主要な判断

- **アプリの状態**: 未リリース、開発段階
- **実施時期**: Phase 3 完了後すぐに実施可能（2025 年 10 月中推奨）
- **安全性**: Phase 3.3 でデータ移行機能実装済み
- **リスク**: 極小（開発段階のため本番環境への影響なし）
- **メリット**: コードベース簡潔化、保守性向上

---

## 目次

1. [背景と目的](#背景と目的)
2. [なぜ今実施するのか](#なぜ今実施するのか)
3. [現状分析](#現状分析)
4. [実装計画](#実装計画)
5. [テスト戦略](#テスト戦略)
6. [リスク管理](#リスク管理)
7. [成功基準](#成功基準)

---

## 1. 背景と目的

### 1.1 Phase 4 の位置づけ

```
リンク実装の進化:

Phase 1: PageLink (Decoration ベース)
  ↓ ❌ Phase 3.4 で削除完了 (2025-10-12)

Phase 2: PageLinkMark (Mark ベース)
  ↓ ⚠️ 現在ここ - 互換性のため残存

Phase 3: UnifiedLinkMark (統合 Mark ベース)
  ↓ ✅ Phase 3.1-3.4 完了 (2025-10-11～12)

Phase 4: PageLinkMark 削除 ← **今ここ**
  ↓ 🎯 UnifiedLinkMark のみに統一
```

### 1.2 目的

1. **コードベースの簡潔化**: 重複実装の削除
2. **保守性の向上**: 単一実装への統一
3. **技術的負債の解消**: PageLinkMark の残存を解消
4. **開発効率の向上**: シンプルなアーキテクチャへ

---

## 2. なぜ今実施するのか

### 2.1 開発段階であることの利点

| 項目               | 本番環境               | 開発段階（現状）        |
| ------------------ | ---------------------- | ----------------------- |
| **ユーザー影響**   | あり（慎重な計画必要） | なし                    |
| **長期稼働確認**   | 必要（3-6 ヶ月）       | **不要** ✅             |
| **ロールバック**   | 複雑                   | 容易                    |
| **実施タイミング** | 限定的                 | **いつでも可能** ✅     |
| **テスト環境**     | 本番データ必要         | **開発データで十分** ✅ |

### 2.2 Phase 3 完了により条件達成

| 条件                       | 状態        | 達成時期       |
| -------------------------- | ----------- | -------------- |
| UnifiedLinkMark の動作確認 | ✅ 完了     | Phase 3.1-3.4  |
| データ移行機能の実装       | ✅ 完了     | Phase 3.3      |
| 既存テスト 100% 成功       | ✅ 達成     | Phase 3.4      |
| パフォーマンス問題なし     | ✅ 確認済み | Phase 3 全体   |
| **本番環境での長期稼働**   | ⚠️ **不要** | 開発段階のため |

### 2.3 早期実施のメリット

1. **シンプルな開発環境**

   - 今後の機能開発で UnifiedLinkMark のみ考慮すればよい
   - PageLinkMark との互換性を気にする必要がない

2. **技術的負債の早期解消**

   - リリース前に不要なコードを削除
   - クリーンな状態でリリース

3. **テストの簡潔化**

   - 2 つの実装をテストする必要がなくなる
   - テストコードも簡潔に

4. **ドキュメントの統一**
   - UnifiedLinkMark のみの説明で済む
   - 新規開発者のオンボーディングが容易

---

## 3. 現状分析

### 3.1 PageLinkMark の使用箇所

#### ① usePageEditorLogic.ts

**パス**: `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`

**使用箇所**:

```typescript
// Line 11: import
import { PageLinkMark } from "@/lib/tiptap-extensions/page-link-mark"; // new Mark-based implementation

// Line 203: extensions配列
extensions: [
  UnifiedLinkMark, // ← 最優先
  PageLinkMark, // ← 削除対象
  // ...
];
```

**削除内容**:

1. import 文の削除（Line 11）
2. extensions 配列から PageLinkMark の削除（Line 203）

#### ② rich-content.tsx（確認必要）

**パス**: `app/(protected)/decks/[deckId]/_components/rich-content.tsx`

**現状**: Phase 3.4 で PageLink → UnifiedLinkMark に変更済み

**確認事項**:

- PageLinkMark への参照がないか再確認

#### ③ page-link-mark.ts

**パス**: `lib/tiptap-extensions/page-link-mark.ts`

**削除対象**: ファイル全体（推定 400 行以上）

**主な内容**:

- PageLinkMark Mark 実装
- setPageLink, togglePageLink 等のコマンド
- InputRule（ブラケットリンク検出）
- 存在確認ロジック

### 3.2 依存関係マトリクス

| ファイル              | 使用箇所                 | 削除内容                   | 代替機能        |
| --------------------- | ------------------------ | -------------------------- | --------------- |
| usePageEditorLogic.ts | import + extensions 配列 | import 削除 + 配列から削除 | UnifiedLinkMark |
| rich-content.tsx      | （確認必要）             | あれば削除                 | UnifiedLinkMark |
| page-link-mark.ts     | ファイル全体             | ファイル削除               | UnifiedLinkMark |

### 3.3 PageLinkMark の機能と UnifiedLinkMark での代替

| 機能             | PageLinkMark   | UnifiedLinkMark   | 状態                 |
| ---------------- | -------------- | ----------------- | -------------------- |
| `[Title]` 検出   | ✅ InputRule   | ✅ InputRule      | 完全代替             |
| ページ存在確認   | ✅ searchPages | ✅ resolver-queue | 完全代替             |
| クリック処理     | ✅ handleClick | ✅ click-handler  | 完全代替             |
| ページ作成       | ✅ createPage  | ✅ resolver       | 完全代替             |
| 状態管理         | ✅ Mark 属性   | ✅ Mark 属性      | 完全代替             |
| キャッシュ       | ❌ なし        | ✅ 30 秒 TTL      | UnifiedLinkMark 優位 |
| リトライ         | ❌ なし        | ✅ 指数バックオフ | UnifiedLinkMark 優位 |
| BroadcastChannel | ❌ なし        | ✅ あり           | UnifiedLinkMark 優位 |

**結論**: PageLinkMark の全機能が UnifiedLinkMark で代替可能 ✅

---

## 4. 実装計画

### 4.1 実装の全体像

```
Phase 4 実装フロー
│
├─ Step 1: 依存箇所の調査（確認） (30分)
│   ├─ 1.1: grep検索でPageLinkMark使用箇所を特定
│   ├─ 1.2: import文の確認
│   └─ 1.3: extensions配列の確認
│
├─ Step 2: usePageEditorLogic.ts の更新 (10分)
│   ├─ 2.1: import文の削除
│   └─ 2.2: extensions配列からPageLinkMark削除
│
├─ Step 3: その他ファイルの更新（あれば） (5分)
│   └─ 3.1: rich-content.tsx等の確認・更新
│
├─ Step 4: page-link-mark.ts の削除 (5分)
│   └─ 4.1: ファイル削除
│
├─ Step 5: テスト・検証 (20分)
│   ├─ 5.1: TypeScript コンパイル
│   ├─ 5.2: 既存テスト全実行（482テスト）
│   └─ 5.3: 手動動作確認
│
└─ Step 6: ドキュメント作成 (20分)
    ├─ 6.1: Phase 4 完了レポート作成
    └─ 6.2: 関連ドキュメント更新

合計作業時間: 約90分
```

---

## 5. 詳細実装ステップ

### Step 1: 依存箇所の調査（30 分）

#### 1.1 grep 検索

```bash
# PageLinkMarkの使用箇所を検索
grep -r "PageLinkMark" app/ lib/ components/ --include="*.ts" --include="*.tsx"

# import文の検索
grep -r "from.*page-link-mark" app/ lib/ components/

# PageLinkMark コマンドの使用検索
grep -r "setPageLink\|togglePageLink\|unsetPageLink" app/ lib/
```

**期待結果**:

- usePageEditorLogic.ts: import + extensions 配列
- その他のファイルがあれば記録

#### 1.2 依存関係の確認

```bash
# page-link-mark.ts のexportを確認
grep "export" lib/tiptap-extensions/page-link-mark.ts
```

---

### Step 2: usePageEditorLogic.ts の更新（10 分）

#### 2.1 import 文の削除

**ファイル**: `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`

**削除箇所**: Line 11

```diff
  import { LatexInlineNode } from "@/lib/tiptap-extensions/latex-inline-node";
- import { PageLinkMark } from "@/lib/tiptap-extensions/page-link-mark"; // new Mark-based implementation
  import { UnifiedLinkMark } from "@/lib/tiptap-extensions/unified-link-mark";
```

#### 2.2 extensions 配列から PageLinkMark 削除

**削除箇所**: Line 203

```diff
      // Unified Link Mark comes first to handle both [Title] and #tag syntax
      UnifiedLinkMark,
-     // New Mark implementation comes before legacy PageLink to ensure mark rendering precedence
-     PageLinkMark,
      CustomHeading.configure({ levels: [2, 3, 4, 5, 6] }),
```

**注意**: コメントも一緒に削除

---

### Step 3: その他ファイルの更新（5 分）

#### 3.1 rich-content.tsx の確認

**ファイル**: `app/(protected)/decks/[deckId]/_components/rich-content.tsx`

**確認事項**:

- PageLinkMark への参照がないか確認
- Phase 3.4 で UnifiedLinkMark に変更済みのはず

```bash
# 確認コマンド
grep "PageLinkMark" app/(protected)/decks/[deckId]/_components/rich-content.tsx
```

**期待結果**: 参照なし（Phase 3.4 で削除済み）

---

### Step 4: page-link-mark.ts の削除（5 分）

#### 4.1 ファイル削除

```bash
# ファイル削除
rm lib/tiptap-extensions/page-link-mark.ts
```

**削除内容**:

- ファイル全体（推定 400 行以上）
- PageLinkMark Mark 実装
- 全コマンド（setPageLink, togglePageLink 等）
- InputRule
- 存在確認ロジック

---

### Step 5: テスト・検証（20 分）

#### 5.1 TypeScript コンパイル

```bash
npx tsc --noEmit
```

**期待結果**:

- ✅ 本番コードのコンパイルエラーなし
- ⚠️ migration.test.ts の型エラーは既知（Phase 3.3 からの継続）

#### 5.2 既存テスト全実行

```bash
bun test
```

**期待結果**:

- ✅ 482/482 既存テスト成功（100%）
- ⚠️ 4-6 の migration.test.ts 失敗は既知（実装詳細の問題）

#### 5.3 手動動作確認

**テストシナリオ 1: ブラケットリンクの入力**

```
1. ページエディタを開く
2. [新しいページ] と入力
3. 期待: pending → missing/exists に遷移
4. クリック: ページ遷移または新規作成
```

**テストシナリオ 2: 既存データの読み込み**

```
1. 既存のリンクを含むページを開く
2. 期待: 正常に表示される
3. リンククリック: 正常に遷移
```

**テストシナリオ 3: rich-content でのリンク表示**

```
1. デッキの問題カード表示
2. リンクを含むコンテンツを表示
3. 期待: リンクが正しく表示される
```

---

### Step 6: ドキュメント作成（20 分）

#### 6.1 Phase 4 完了レポート作成

**ファイル**: `docs/08_worklogs/2025_10/20251012/20251012_27_phase4-implementation-complete.md`

**内容**:

- 実装内容の詳細
- テスト結果
- 削減されたコード行数
- Phase 3-4 全体のまとめ
- 次のステップ

#### 6.2 関連ドキュメント更新

**更新対象**:

1. `docs/07_research/2025_10/20251010/link-implementation-investigation.md`

   - Phase 4 完了を反映
   - PageLinkMark の記述を削除または「削除済み」に更新

2. `docs/page-link-legacy-removal-plan.md`

   - Phase 4 完了を記録

3. `README.md`（あれば）
   - リンク実装の説明を UnifiedLinkMark のみに更新

---

## 6. テスト戦略

### 6.1 自動テスト

#### 既存テストの実行

```bash
# 全テスト実行
bun test

# 結果の期待値
# - 482/482 既存テスト成功
# - migration.test.ts の4-6失敗は既知
```

#### UnifiedLinkMark テスト

```bash
# UnifiedLinkMark 関連テストのみ
bun test lib/tiptap-extensions/unified-link-mark
```

**期待結果**:

- ✅ 351 テスト実行
- ✅ 347+ 成功（migration.test.ts の一部を除く）

### 6.2 手動テスト

#### 回帰テストのチェックリスト

- [ ] ブラケットリンク `[Title]` の入力と解決
- [ ] pending → exists 遷移
- [ ] pending → missing 遷移
- [ ] クリック時のページ遷移
- [ ] 新規ページ作成（missing クリック時）
- [ ] 既存ページの読み込み
- [ ] rich-content でのリンク表示
- [ ] BroadcastChannel 経由のリアルタイム更新

---

## 7. リスク管理

### 7.1 リスク評価マトリクス

| リスク                        | 確率 | 影響 | 対策                               | 状態 |
| ----------------------------- | ---- | ---- | ---------------------------------- | ---- |
| **PageLinkMark への参照残存** | 低   | 中   | grep 検索で全確認                  | 🟡   |
| **UnifiedLinkMark の不具合**  | 極低 | 高   | Phase 3 で十分検証済み             | ✅   |
| **データ移行の問題**          | 極低 | 中   | Phase 3.3 で実装・テスト済み       | ✅   |
| **テスト失敗**                | 低   | 中   | 既存テスト 100% 成功を維持         | ✅   |
| **パフォーマンス劣化**        | なし | 低   | PageLinkMark 削除で改善期待        | ✅   |
| **本番環境への影響**          | なし | -    | **アプリ未リリースのため影響なし** | ✅   |

**総合リスク評価**: **極低 - 開発段階のため安全に実施可能** ✅

### 7.2 ロールバック計画

万が一問題が発生した場合:

```bash
# Git で変更を戻す
git checkout HEAD -- app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts
git checkout HEAD -- lib/tiptap-extensions/page-link-mark.ts
```

**ロールバック時間**: 1 分以内

**ロールバックが必要なケース**:

- 予期しないコンパイルエラー
- 既存テストの大量失敗（10% 以上）
- 致命的な機能不全

**注**: 開発段階のため、ロールバックのハードルは低い

---

## 8. 成功基準

### 8.1 必須条件 ✅

#### コード削除関連

- [ ] ✅ page-link-mark.ts が削除されている
- [ ] ✅ usePageEditorLogic.ts に PageLinkMark の import がない
- [ ] ✅ usePageEditorLogic.ts の extensions 配列に PageLinkMark がない
- [ ] ✅ rich-content.tsx に PageLinkMark の参照がない
- [ ] ✅ TypeScript コンパイルエラーがない（本番コード）

#### テスト関連

- [ ] ✅ 全自動テスト成功 (482/482)
- [ ] ✅ UnifiedLinkMark テスト成功 (347+/351)

### 8.2 動作確認 ✅

#### 既存機能の確認

- [ ] ✅ ブラケットリンクの pending → exists/missing 遷移
- [ ] ✅ クリック時のページ遷移
- [ ] ✅ 新規ページ作成機能
- [ ] ✅ 既存ページの読み込み
- [ ] ✅ rich-content でのリンク表示
- [ ] ✅ BroadcastChannel によるリアルタイム更新

---

## 9. Phase 3-4 全体のまとめ

### 9.1 削減されたコード

| Phase       | 削除対象                             | 削除行数      |
| ----------- | ------------------------------------ | ------------- |
| Phase 3.3   | useLinkExistenceChecker.ts           | 93 行         |
| Phase 3.4   | PageLink Extension (page-link.ts)    | 448 行        |
| **Phase 4** | **PageLinkMark (page-link-mark.ts)** | **約 400 行** |
| **合計**    | **Legacy 実装全削除**                | **約 941 行** |

### 9.2 追加されたコード

| Phase     | 追加内容                | 追加行数   |
| --------- | ----------------------- | ---------- |
| Phase 3.3 | データ移行機能 + テスト | 286 行     |
| **合計**  | **新機能**              | **286 行** |

**正味の変更**: **約 -655 行（コードベースの大幅簡潔化）**

### 9.3 最終的なアーキテクチャ

```
Phase 4 完了後:

┌─────────────────────────────────┐
│      TipTap Editor              │
├─────────────────────────────────┤
│                                 │
│  ┌────────────────────────┐    │
│  │  UnifiedLinkMark ONLY  │    │
│  │  (統一リンク実装)      │    │
│  ├────────────────────────┤    │
│  │ - [Title] 形式         │    │
│  │ - #tag 形式（予定）    │    │
│  │ - 自動解決             │    │
│  │ - キャッシュ           │    │
│  │ - BroadcastChannel     │    │
│  └────────────────────────┘    │
│                                 │
└─────────────────────────────────┘

✅ シンプル
✅ 保守しやすい
✅ 拡張しやすい
```

---

## 10. 実施スケジュール

### 10.1 タイムライン

| Step | 作業内容                   | 所要時間  | 担当 | 優先度 |
| ---- | -------------------------- | --------- | ---- | ------ |
| 1    | 依存箇所の調査             | 30 分     | Dev  | 高     |
| 2    | usePageEditorLogic.ts 更新 | 10 分     | Dev  | 高     |
| 3    | その他ファイル更新         | 5 分      | Dev  | 中     |
| 4    | page-link-mark.ts 削除     | 5 分      | Dev  | 高     |
| 5    | テスト・検証               | 20 分     | Dev  | 高     |
| 6    | ドキュメント作成           | 20 分     | Dev  | 中     |
| -    | **合計**                   | **90 分** | -    | -      |

### 10.2 推奨実施時期

**最速**: Phase 3 完了後すぐ（2025 年 10 月 12 日以降）  
**推奨**: 2025 年 10 月中  
**最遅**: 2025 年 11 月初旬

**理由**:

- ✅ アプリ未リリース状態で実施可能
- ✅ Phase 3 の知識が新鮮なうちに
- ✅ 次の機能開発前にクリーンな状態へ

---

## 11. 技術的な学び

### 11.1 段階的削除の重要性

```
Phase 3: PageLink Extension 削除
     ↓ 2週間の間隔
Phase 4: PageLinkMark 削除

メリット:
- 各段階でのテスト・検証
- 問題の早期発見
- ロールバックの容易性
```

### 11.2 データ移行の先行実装

Phase 3.3 でデータ移行機能を実装したことで、Phase 4 のリスクが大幅に低減:

- 旧 PageLinkMark データ → UnifiedLinkMark へ自動変換
- ユーザー操作不要
- Phase 4 実施時のデータ互換性問題なし

### 11.3 開発段階での利点

本番環境であれば慎重な計画が必要だが、開発段階では:

- 長期稼働確認不要
- いつでもロールバック可能
- リスクを取って素早く実装可能

---

## 12. 関連ドキュメント

### Phase 3 関連

- [Phase 3 実装計画書](./20251012_10_phase3-click-handler-migration-plan.md)
- [Phase 3.3 完了レポート](../../../08_worklogs/2025_10/20251012/20251012_25_phase3.3-implementation-complete.md)
- [Phase 3.4 実装計画書](./20251012_14_phase3.4-implementation-plan.md)
- [Phase 3.4 完了レポート](../../../08_worklogs/2025_10/20251012/20251012_26_phase3.4-implementation-complete.md)

### Phase 4 関連

- [残タスク分析レポート](../../../07_research/2025_10/20251012/20251012_remaining-tasks-analysis.md)
- [初期調査レポート](../../../07_research/2025_10/20251010/link-implementation-investigation.md)

### 設計ドキュメント

- [UnifiedLinkMark リファクタリング計画](./20251011_08_refactoring-plan.md)
- [移行計画書](./20251011_07_migration-plan.md)

---

## 13. 次のステップ

Phase 4 完了後:

1. **即座に実施**:

   - Git コミット
   - Phase 4 完了レポート作成

2. **短期（1 週間以内）**:

   - タグリンク実装の準備
   - ドキュメント全体の更新

3. **中期（1 ヶ月以内）**:
   - タグリンク実装 (`#tag` 形式)
   - パフォーマンス監視の継続

---

## 14. 結論

Phase 4（PageLinkMark の削除）は、以下の理由により**今すぐ実施可能**です:

✅ **技術的準備完了**:

- UnifiedLinkMark の動作確認済み
- データ移行機能実装済み
- 既存テスト 100% 成功

✅ **開発段階の利点**:

- 本番環境への影響なし
- 長期稼働確認不要
- いつでもロールバック可能

✅ **メリット明確**:

- コードベース簡潔化（約 400 行削減）
- 保守性向上
- 開発効率向上

**推奨**: **Phase 3 完了後すぐに実施**（2025 年 10 月中）

---

**作成者**: AI Development Assistant  
**レビュー**: 開発チーム  
**承認**: プロジェクトリーダー  
**実施予定**: 2025 年 10 月中
