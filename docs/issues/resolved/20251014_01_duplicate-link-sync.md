# リンク同期処理の重複問題

## 📋 問題の概要

`usePageEditorLogic.ts`内でリンク同期処理が 2 箇所で実行されており、保存のたびに重複したリクエストが発生する可能性がある。

## 🔍 発見日時・発見場所

- **発見日**: 2025 年 10 月 14 日
- **発見者**: AI 開発アシスタント
- **発見場所**: Phase 3 リファクタリング作業中の調査

## 📍 問題の詳細

### 重複箇所 1: エディター更新時のリンク同期

**ファイル**: `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`  
**行数**: 256-310

```typescript
useEffect(() => {
  if (!editor) return;

  const syncLinks = async (immediate = false) => {
    try {
      const json = editor.getJSON() as JSONContent;
      const { outgoingIds } = extractLinkData(json);
      await updatePageLinks({ pageId: page.id, outgoingIds });

      if (!hasInitialLinkSync.current) {
        hasInitialLinkSync.current = true;
      }
    } catch (err) {
      console.error("リンク同期エラー:", err);
    }
  };

  const debouncedSyncLinks = (immediate = false) => {
    const delay = immediate || !hasInitialLinkSync.current ? 0 : 500;
    if (linkSyncTimeout.current) clearTimeout(linkSyncTimeout.current);
    linkSyncTimeout.current = setTimeout(() => syncLinks(immediate), delay);
  };

  const updateHandler = () => debouncedSyncLinks(false);
  editor.on("update", updateHandler);

  // Initial sync - 即座に実行
  debouncedSyncLinks(true);

  return () => {
    editor.off("update", updateHandler);
    if (linkSyncTimeout.current) clearTimeout(linkSyncTimeout.current);
  };
}, [editor, page.id]);
```

### 重複箇所 2: 保存時のリンク同期

**ファイル**: `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`  
**行数**: 171-172

```typescript
const savePage = useCallback(async () => {
  // ... (省略)

  // 1. ページ保存
  await updatePage({
    id: page.id,
    title,
    content: JSON.stringify(content),
  });

  // 2. リンク同期（確実に完了を待つ）
  const { outgoingIds } = extractLinkData(content);
  await updatePageLinks({ pageId: page.id, outgoingIds });

  // ... (省略)
}, [editor, title, page.id, setIsLoading, setIsDirty]);
```

### 実行フロー

```
ユーザー操作
  ↓
editor.on("update") トリガー
  ↓
debouncedSyncLinks(500ms)
  ↓
syncLinks() → updatePageLinks() ← 1回目
  ↓
ユーザーが保存をトリガー
  ↓
savePage()
  ↓
updatePageLinks() ← 2回目（重複！）
```

## 💥 影響範囲

### パフォーマンス

- **重複 API 呼び出し**: 保存のたびに最大 2 回のリンク同期が実行
- **無駄なデータベース操作**: links_between_pages テーブルへの不要な書き込み
- **ネットワーク負荷**: 重複した HTTP リクエスト

### 推定影響度

- **頻度**: 保存操作ごと（高頻度）
- **コスト**: データベース書き込み操作 × 2
- **ユーザー体験**: 保存時の待ち時間がわずかに増加

## 🎯 重要度

**Medium-High**

- 機能的には問題なく動作するが、パフォーマンスとリソース効率に影響
- 頻繁に発生する無駄な処理
- リファクタリングで容易に改善可能

## 🔧 提案する解決策

### 解決策: useLinkSync フックの作成

リンク同期処理を統合した専用フックを作成し、重複を排除する。

#### 設計方針

1. **統一されたエントリーポイント**
   - エディター更新時と savePage 時の同期を一元管理
2. **重複排除ロジック**
   - 同期中フラグで重複リクエストを防止
   - 前回同期からの差分チェック
3. **デバウンス処理の統一**

   - エディター更新時: 500ms デバウンス
   - savePage 時: skipDebounce オプションで即座に実行

4. **エラーハンドリング強化**
   - リトライロジック
   - 適切なログ出力（logger 使用）

#### 実装例

```typescript
// app/(protected)/pages/[id]/_hooks/useLinkSync.ts
export function useLinkSync(
  editor: Editor | null,
  pageId: string,
  options?: {
    debounceMs?: number;
    skipDebounceOnDemand?: boolean;
  }
): {
  syncLinks: (immediate?: boolean) => Promise<void>;
  isSyncing: boolean;
  lastSyncTime: number | null;
} {
  const [isSyncing, setIsSyncing] = useState(false);
  const lastSyncTime = useRef<number | null>(null);
  const syncTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasInitialSync = useRef(false);

  const performSync = useCallback(async () => {
    if (isSyncing || !editor) return;

    setIsSyncing(true);
    try {
      const json = editor.getJSON() as JSONContent;
      const { outgoingIds } = extractLinkData(json);
      await updatePageLinks({ pageId, outgoingIds });

      lastSyncTime.current = Date.now();
      if (!hasInitialSync.current) {
        hasInitialSync.current = true;
      }
      logger.debug(
        { pageId, linkCount: outgoingIds.length },
        "Link sync completed"
      );
    } catch (err) {
      logger.error({ err, pageId }, "Link sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, [editor, pageId, isSyncing]);

  const syncLinks = useCallback(
    async (immediate = false) => {
      const delay =
        immediate || !hasInitialSync.current ? 0 : options?.debounceMs ?? 500;

      if (syncTimeout.current) clearTimeout(syncTimeout.current);
      syncTimeout.current = setTimeout(() => performSync(), delay);
    },
    [performSync, options?.debounceMs]
  );

  // エディター更新時の自動同期
  useEffect(() => {
    if (!editor) return;

    const updateHandler = () => syncLinks(false);
    editor.on("update", updateHandler);

    // 初回同期
    syncLinks(true);

    return () => {
      editor.off("update", updateHandler);
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
    };
  }, [editor, syncLinks]);

  return { syncLinks, isSyncing, lastSyncTime: lastSyncTime.current };
}
```

#### 使用方法

```typescript
// usePageEditorLogic.ts内
const { syncLinks, isSyncing } = useLinkSync(editor, page.id);

const savePage = useCallback(async () => {
  // リンク同期は自動的にエディター更新時に実行されるため不要
  // または、確実に最新状態で保存したい場合は以下を呼ぶ:
  // await syncLinks(true);

  await updatePage({
    id: page.id,
    title,
    content: JSON.stringify(content),
  });
}, [editor, title, page.id]);
```

## 📝 関連する問題

### 関連問題 1: initialContent の二重設定

**ファイル**: `usePageEditorLogic.ts` Line 312-323

```typescript
useEffect(() => {
  if (editor && initialContent) {
    const sanitized = sanitizeContent(initialContent);
    try {
      editor.commands.setContent(sanitized);
    } catch (error) {
      console.error("initialContent 設定エラー:", error);
    }
  }
}, [editor, initialContent]);
```

`useEditorInitializer`で既にコンテンツ設定済みのため、この useEffect は**不要**の可能性が高い。

### 関連問題 2: console.log の使用

複数箇所で`console.error`が使用されており、`logger.error`への統一が必要。

## 🔗 関連ドキュメント

- [Phase 3 実装計画](../../04_implementation/plans/page-editor-refactoring/20251014_01_refactoring-plan.md)
- [作業ログ](../../08_worklogs/2025_10/20251014/20251014_04_page-editor-refactoring.md)

## 📌 ステータス

- **状態**: ✅ Resolved
- **優先度**: Medium-High
- **担当**: AI 開発アシスタント
- **対応完了**: Phase 3（2025 年 10 月 14 日）

## ✅ 完了条件

- [x] useLinkSync フックの実装完了
- [x] usePageEditorLogic.ts から重複コード削除
- [x] ユニットテスト作成（17 テスト）
- [x] パフォーマンステストで改善確認
- [x] 動作確認（統合テスト実施）

## 🎉 解決内容

### 実装したソリューション

Phase 3 のリファクタリングで以下を実装し、リンク同期の重複問題を完全に解決しました:

**1. useLinkSync.ts フックの作成**

- ファイル: `app/(protected)/pages/[id]/_hooks/useLinkSync.ts`
- 行数: 208 行
- エディター更新時と保存時のリンク同期を一元管理
- デバウンス処理の統一（デフォルト 500ms）
- 重複排除ロジック（isSyncing フラグ）
- logger 使用による一貫したログ出力

**2. usePageEditorLogic.ts のリファクタリング**

- 重複していたリンク同期コード（約 37 行）を削除
- useLinkSync フックを統合
- savePage 関数内のリンク同期処理を削除

**3. テストカバレッジ**

- useLinkSync.test.ts: 17 テスト作成
- 基本的な動作確認テスト
- エッジケースのテスト
- クリーンアップ動作の検証

### 改善効果

**Before:**

```
保存操作 → updatePageLinks() (1回目: editor.on("update"))
        → updatePageLinks() (2回目: savePage内)
= 合計2回のAPI呼び出し（重複）
```

**After:**

```
保存操作 → useLinkSync内で自動管理
        → 重複排除により1回のみ実行
= 合計1回のAPI呼び出し（最適化）
```

**定量的成果:**

- リンク同期の重複を 100%排除
- usePageEditorLogic.ts から 49 行削減（332 行 → 283 行）
- 17 個のテストでカバレッジ向上

### 関連する改善

**関連問題 1: initialContent の二重設定**

- 状態: 確認済み（不要な useEffect を削除）
- 対応: Phase 2 で解決

**関連問題 2: console.log の使用**

- 状態: 解決済み
- 対応: Phase 3 で logger に統一

## 🔗 関連ドキュメント

- [Phase 3 実装詳細](../../08_worklogs/2025_10/20251014/20251014_04_page-editor-refactoring.md#phase-3-リンク同期の統合完了-)
- [useLinkSync.ts 実装](<../../../app/(protected)/pages/[id]/_hooks/useLinkSync.ts>)
- [useLinkSync.test.ts](<../../../app/(protected)/pages/[id]/_hooks/__tests__/useLinkSync.test.ts>)

---

**作成日**: 2025 年 10 月 14 日  
**解決日**: 2025 年 10 月 14 日  
**最終更新**: 2025 年 10 月 14 日
