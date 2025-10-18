# ページエディターロジックのリファクタリング実装計画

## 📋 概要

`usePageEditorLogic.ts` (約 720 行) の巨大なカスタムフックを、責任ごとに分離して保守性とテスタビリティを向上させるリファクタリング。

## 🎯 目的

- **可読性の向上**: 720 行の巨大ファイルを 150 行程度に削減
- **テスタビリティの向上**: ユーティリティ関数を独立してテスト可能に
- **保守性の向上**: 単一責任の原則に基づいた設計
- **パフォーマンスの最適化**: 重複処理の削減

## 🔍 現状の問題点

### 1. 重複した dirty 状態管理

- `usePageEditorLogic`内で 2 箇所で`editor.on("update")`を監視
- `useAutoSave`内部でも同じイベントを監視
- 非効率な二重監視が発生

### 2. リンク同期処理の重複

- `usePageEditorLogic`内の useEffect (626-656 行)
- `savePage`関数内 (569-589 行)
- 保存のたびに 2 回リンク同期が実行される可能性

### 3. 巨大な内部関数

- `sanitizeContent`: 97 行
- `transformDollarInDoc`: 43 行
- `migrateBracketsToMarks`: 137 行
- テストが困難で、再利用もできない

### 4. 複雑な初期化処理

- `onCreate`内で 200 行以上の処理
- 複数の変換処理が連鎖
- 可読性が低く、デバッグが困難

### 5. 不完全な保存中フラグ管理

- `isSavingRef`はあるが、Next.js ルーター遷移のブロックが未実装
- `beforeunload`イベントのみ対応

## 📐 リファクタリング設計

### ファイル構成（Before → After）

#### Before

```
app/(protected)/pages/[id]/_hooks/
├── usePageEditorLogic.ts     (720行) ← 巨大
├── useAutoSave.ts
├── useGenerateContent.ts
├── useSplitPage.ts
└── useSmartThumbnailSync.ts
```

#### After

```
lib/utils/editor/
├── content-sanitizer.ts           (sanitizeContent + tests)
├── latex-transformer.ts           (transformDollarInDoc + tests)
├── legacy-link-migrator.ts        (migrateBracketsToMarks + tests)
└── editor-initializer.ts          (エディター初期化ロジック + tests)

app/(protected)/pages/[id]/_hooks/
├── usePageEditorLogic.ts          (150行程度に削減)
├── useEditorInitializer.ts        (エディター初期化)
├── useLinkSync.ts                 (リンク同期統合)
├── usePageSaver.ts                (保存処理統合)
├── useAutoSave.ts                 (既存、改善)
├── useGenerateContent.ts          (既存)
├── useSplitPage.ts                (既存)
└── useSmartThumbnailSync.ts       (既存)
```

## 🚀 実装フェーズ

### Phase 1: ユーティリティ関数の分離 ⭐ 優先度: 高

**作業時間**: 4-6 時間

#### 1.1 content-sanitizer.ts の作成

- `sanitizeContent`関数を移動
- レガシーリンクマーク(`pageLink`, `link`)を`unilink`に変換
- 空のテキストノードを削除
- ユニットテスト作成

**成果物**:

```typescript
// lib/utils/editor/content-sanitizer.ts
export function sanitizeContent(doc: JSONContent): JSONContent;
export function removeLegacyMarks(node: JSONContent): JSONContent;
export function removeEmptyTextNodes(node: JSONContent): JSONContent;
```

**テストケース**:

- レガシー`pageLink`マークの変換
- レガシー`link`マークの変換（内部リンクのみ）
- 外部リンクの保持
- 空テキストノードの削除
- ネストされたノードの処理

#### 1.2 latex-transformer.ts の作成

- `transformDollarInDoc`関数を移動
- `$...$`構文を`latexInlineNode`に変換
- ユニットテスト作成

**成果物**:

```typescript
// lib/utils/editor/latex-transformer.ts
export function transformDollarInDoc(doc: JSONContent): JSONContent;
export function transformLatexInTextNode(node: JSONTextNode): JSONContent[];
```

**テストケース**:

- 単一 LaTeX 式の変換
- 複数 LaTeX 式の変換
- マークを持つテキストノード内の LaTeX
- ネストされたノード内の LaTeX
- エッジケース（`$$`、空文字列など）

#### 1.3 legacy-link-migrator.ts の作成

- `migrateBracketsToMarks`関数を移動
- `[Title]`と`#tag`構文を`unilink`マークに変換
- ユニットテスト作成

**成果物**:

```typescript
// lib/utils/editor/legacy-link-migrator.ts
export function migrateBracketsToMarks(doc: JSONContent): JSONContent;
export function detectBracketPattern(text: string): BracketMatch[];
export function detectTagPattern(text: string): TagMatch[];
```

**テストケース**:

- `[bracket]`構文の検出と変換
- `#tag`構文の検出と変換
- 外部 URL `[https://...]`の処理
- 既存`unilink`マークのスキップ
- 複数パターンの混在
- ホワイトスペース処理

### Phase 2: エディター初期化処理の分離 ⭐ 優先度: 高

**作業時間**: 3-4 時間

#### 2.1 useEditorInitializer.ts の作成

- `onCreate`内の初期化ロジックを分離
- コンテンツ変換パイプラインの構築
- エラーハンドリングの強化

**成果物**:

```typescript
// app/(protected)/pages/[id]/_hooks/useEditorInitializer.ts
export function useEditorInitializer(
  editor: Editor | null,
  initialDoc: JSONContent,
  userId: string
): void;
```

**処理フロー**:

```
1. preloadPageTitles(userId)
2. sanitizeContent(initialDoc)
3. migrateBracketsToMarks()
4. transformDollarInDoc()
5. transformMarkdownTables()
6. editor.commands.setContent()
7. queuePendingMarksForResolution()
```

**テストケース**:

- 各変換処理の順序検証
- エラー時のフォールバック
- 空ドキュメントの処理
- マークキューへの登録確認

### Phase 3: リンク同期の統合 ⭐ 優先度: 最高

**作業時間**: 3-4 時間

#### 3.1 useLinkSync.ts の作成

- エディター更新時のリンク同期
- 保存時のリンク同期を統合
- 重複排除ロジックの実装

**成果物**:

```typescript
// app/(protected)/pages/[id]/_hooks/useLinkSync.ts
export function useLinkSync(
  editor: Editor | null,
  pageId: string,
  options?: {
    debounceMs?: number;
    syncOnSave?: boolean;
  }
): {
  syncLinks: () => Promise<void>;
  isSyncing: boolean;
};
```

**改善点**:

- エディター更新時の同期と savePage 時の同期を一元管理
- デバウンス処理の統一
- 同期状態の可視化
- エラーハンドリングの強化

**テストケース**:

- デバウンス動作の検証
- 初回即時同期の確認
- 重複同期の防止
- エラー時のリトライ

### Phase 4: 保存処理のリファクタリング ⭐ 優先度: 中

**作業時間**: 2-3 時間

#### 4.1 usePageSaver.ts の作成

- `savePage`関数を独立したフックに
- 保存中フラグの管理
- リンク同期との連携

**成果物**:

```typescript
// app/(protected)/pages/[id]/_hooks/usePageSaver.ts
export function usePageSaver(
  editor: Editor | null,
  pageId: string,
  title: string,
  options?: {
    onSaveSuccess?: () => void;
    onSaveError?: (error: Error) => void;
  }
): {
  savePage: () => Promise<void>;
  isSaving: boolean;
};
```

**改善点**:

- 保存中フラグの一元管理
- Next.js ルーター遷移のブロック実装
- エラーハンドリングの強化
- 保存前後のフックポイント追加

**テストケース**:

- 保存処理の正常系
- エラー時のハンドリング
- 保存中フラグの状態遷移
- H1 削除ロジックの検証

### Phase 5: メインフックのスリム化 ⭐ 優先度: 中

**作業時間**: 2-3 時間

#### 5.1 usePageEditorLogic.ts のリファクタリング

- 各フックの統合のみを担当
- 複雑なロジックは各フックに委譲

**目標行数**: 150 行以下

**成果物**:

```typescript
export function usePageEditorLogic({...}: UsePageEditorLogicProps) {
  // エディター初期化
  const editor = useEditor({...});

  // 各機能フックの呼び出し
  useEditorInitializer(editor, initialDoc, page.user_id);
  useUserIconRenderer(editor);
  const { savePage, isSaving } = usePageSaver(editor, page.id, title);
  const { syncLinks } = useLinkSync(editor, page.id);
  useAutoSave(editor, savePage, isDirty);
  const { manualSync } = useSmartThumbnailSync({...});

  // UI用コールバック
  const handleGenerateContent = useGenerateContent(...);
  const wrapSelectionWithPageLink = useCallback(...);
  const splitPage = useSplitPage(...);

  return {
    editor,
    savePage,
    handleGenerateContent,
    wrapSelectionWithPageLink,
    splitPage,
    manualThumbnailSync: manualSync,
  };
}
```

### Phase 6: 統合テストとドキュメント作成 ⭐ 優先度: 中

**作業時間**: 2-3 時間

#### 6.1 統合テストの作成

- 各フックが連携して動作することを確認
- エッジケースのテスト

#### 6.2 ドキュメント作成

- 各ユーティリティ関数のドキュメント
- アーキテクチャ図の作成
- マイグレーションガイド

## 📊 工数見積もり

| Phase    | 作業内容                   | 見積時間       | 優先度 |
| -------- | -------------------------- | -------------- | ------ |
| Phase 1  | ユーティリティ関数の分離   | 4-6 時間       | 高     |
| Phase 2  | エディター初期化処理の分離 | 3-4 時間       | 高     |
| Phase 3  | リンク同期の統合           | 3-4 時間       | 最高   |
| Phase 4  | 保存処理のリファクタリング | 2-3 時間       | 中     |
| Phase 5  | メインフックのスリム化     | 2-3 時間       | 中     |
| Phase 6  | 統合テスト・ドキュメント   | 2-3 時間       | 中     |
| **合計** |                            | **16-23 時間** |        |

## 🧪 テスト戦略

### ユニットテスト

- 各ユーティリティ関数に対して独立したテスト
- カバレッジ目標: 90%以上
- Vitest + Testing Library を使用

### 統合テスト

- エディター初期化から保存までの一連の流れをテスト
- モックを最小限に抑えた実践的なテスト

### 手動テスト

- 実際のブラウザでの動作確認
- パフォーマンステスト（初期化時間、保存時間）

## 🎯 成功基準

### 定量的指標

- [ ] `usePageEditorLogic.ts`を 150 行以下に削減
- [ ] 新規作成ファイルのテストカバレッジ 90%以上
- [ ] エディター初期化時間が現状と同等またはそれ以上
- [ ] 保存処理時間が現状と同等またはそれ以上

### 定性的指標

- [ ] コードレビューで可読性の向上が確認される
- [ ] 新規開発者がコードを理解しやすい
- [ ] バグ修正時の影響範囲が明確
- [ ] 機能追加時の変更箇所が特定しやすい

## ⚠️ リスクと対策

### リスク 1: 既存機能の破壊

**対策**:

- Phase 完了ごとに手動テストを実施
- 統合テストで回帰テストを実施
- 本番デプロイ前にステージング環境で十分な検証

### リスク 2: パフォーマンス劣化

**対策**:

- 各 Phase でパフォーマンス測定
- ベンチマークテストの実施
- 必要に応じて最適化

### リスク 3: 工数超過

**対策**:

- Phase 1-3 を優先実施（最重要機能）
- Phase 4-6 は段階的に実施可能
- 各 Phase 完了時に見直し

## 📅 実装スケジュール（推奨）

### Week 1

- **Day 1-2**: Phase 1 (ユーティリティ関数の分離)
- **Day 3-4**: Phase 2 (エディター初期化処理の分離)

### Week 2

- **Day 1-2**: Phase 3 (リンク同期の統合)
- **Day 3**: Phase 4 (保存処理のリファクタリング)
- **Day 4**: Phase 5 (メインフックのスリム化)

### Week 3

- **Day 1**: Phase 6 (統合テスト・ドキュメント)
- **Day 2**: コードレビュー・修正
- **Day 3**: ステージング環境でのテスト
- **Day 4-5**: 本番デプロイ・監視

## 🔄 ロールバックプラン

各 Phase は独立しているため、問題が発生した場合は該当 Phase の変更のみをロールバック可能。

### ロールバック手順

1. Git で該当 Phase のコミットを特定
2. `git revert`でコミットを取り消し
3. テストを再実行して正常性を確認
4. 問題の原因を調査・修正

## 📝 関連ドキュメント

- [設計書](../../../03_design/features/page-editor-refactoring-design.md) (作成予定)
- [テスト計画](../../../05_testing/test-cases/page-editor-refactoring-tests.md) (作成予定)
- [作業ログ](../../../08_worklogs/2025_10/) (実装時に作成)

## 📌 作成情報

- **作成日**: 2025 年 10 月 14 日
- **最終更新日**: 2025 年 10 月 14 日
- **作成者**: AI 開発アシスタント
- **ステータス**: 計画策定完了
- **次のアクション**: Phase 1 の実装開始
