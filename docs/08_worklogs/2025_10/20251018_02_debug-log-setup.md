# エディター初期化デバッグログ仕込み - 2025-10-18

## 目的

無限ループの原因を特定するため、以下の 3 つのファイルに詳細なデバッグログを追加しました。

## 追加されたデバッグログ

### 1. `useEditorInitializer.ts`

**何を検出**:

- `useEffect` が実行された回数と理由
- 依存配列の値（`editor`, `initialDoc`, `userId`）
- `preloadPageTitles()` の実行状況

**ログポイント**:

```
[DEBUG] useEditorInitializer effect triggered
[DEBUG] Starting preloadPageTitles call
[DEBUG] preloadPageTitles failed (expected for optimization)
[DEBUG] Editor content set successfully
```

### 2. `usePageEditorLogic.ts`

**何を検出**:

- `initialDoc` が `useMemo` で再計算されたのか
- `initialContent` と `page.content_tiptap` の変化
- ページ ID

**ログポイント**:

```
[DEBUG usePageEditorLogic] initialDoc memo recalculated
```

### 3. `page-cache-preloader.ts`

**何を検出**:

- `preloadPageTitles()` が実行された回数（呼び出し ID 付き）
- クエリの実行状況
- 取得したデータの件数

**ログポイント**:

```
[PageCachePreloader] Starting preload (callId付き)
[PageCachePreloader] Query built, executing...
[PageCachePreloader] Query completed (データ件数付き)
[PageCachePreloader] Preloaded page titles (成功時)
[PageCachePreloader] Failed to fetch pages (エラー時)
[PageCachePreloader] Unexpected error during preload (例外時)
```

## ログの見方

### ターミナル（サーバーログ）

```bash
# ターミナルでサーバーログを観察
bun dev
```

### ブラウザ（開発者ツール）

1. **F12** で開発者ツールを開く
2. **コンソール** タブを選択
3. **フィルター** に以下を入力：
   - `[DEBUG]` - すべてのデバッグログ
   - `[PageCachePreloader]` - プリロード関連
   - `usePageEditorLogic` - エディタロジック関連

## 期待される正常なログ出力

ページを開いたときに以下のような順序でログが出力されるはずです：

```
[DEBUG usePageEditorLogic] initialDoc memo recalculated
  pageId: "xxx"
  hasInitialContent: false
  hasPageContent: true
  contentLength: 5

[DEBUG] useEditorInitializer effect triggered
  editorExists: true
  userId: "yyy"
  hasInitialDoc: true
  initialDocType: "doc"
  contentLength: 5

[PageCachePreloader] Starting preload (callId: "abc123")
[PageCachePreloader] Query built, executing...
[PageCachePreloader] Query completed (dataCount: 42, hasError: false)
[PageCachePreloader] Preloaded page titles (count: 42)

[DEBUG] Editor content set successfully
  userId: "yyy"
  contentLength: 5
```

## 無限ループ検出方法

ログ出力を見て以下を確認：

1. **`[DEBUG] useEditorInitializer effect triggered` が何度も繰り返される**

   - 依存配列が変わり続けている
   - → `initialDoc` が毎回新しい参照になっている

2. **`[PageCachePreloader] Starting preload` が何度も出力される**

   - `preloadPageTitles()` が繰り返し実行されている
   - → `useEditorInitializer` の `useEffect` が繰り返し実行されている

3. **`callId` が異なる値で何度も出力される**
   - 複数回の `preloadPageTitles()` 呼び出しがある
   - 出力例: `callId: "abc123"`, `callId: "def456"`, `callId: "ghi789"`, ...

## 参考情報

- 前回の修正: `docs/08_worklogs/2025_10/20251018_01_editor-infinite-loop-fix.md`
- Issue: `docs/issues/open/20251018_01_infinite-editor-preload-loop.md`

## 次のステップ

1. ブラウザ/ターミナルのログを確認
2. どのログが繰り返されているか特定
3. その原因を分析して、さらに修正を加える
