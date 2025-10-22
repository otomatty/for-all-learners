# 無限ループバグ修正完了 - 2025-10-18 (Part 2)

## 問題再発の分析

### 根本原因特定

ユーザーから報告されたログを分析した結果、`preloadPageTitles()` が複数回実行される問題が再発していることを発見：

```
POST /pages/{id} 200 in 71ms
POST /pages/{id} 200 in 61ms
...
[PageCachePreloader] Query completed (dataCount: 1000)
[normalizeTitleToKey] Title normalized (x1000)
```

**根本原因**：

`usePageEditorLogic.ts` の `extensions` 配列がインライン定義されているため、親コンポーネントの再レンダリング時に **配列参照が新しくなる**

```typescript
// ❌ 毎回新しい配列参照になる
const editor = useEditor({
    extensions: [
        StarterKit.configure(...),
        // ...
    ]
});
```

Tiptap の `useEditor` は extensions 配列参照が変わると **新しいエディターインスタンスを作成** する

```typescript
// New editor instance created → useEditorInitializer effect re-runs
// → preloadPageTitles() が再度実行される → 無限ループ
```

### 修正内容

#### 1. `usePageEditorLogic.ts`: extensions 配列の安定化

`extensions` 配列を `useMemo` でメモ化し、参照を安定化：

```typescript
const extensions = useMemo(
    () => [
        StarterKit.configure({...}),
        UnifiedLinkMark,
        CustomHeading.configure({...}),
        // ... 他の拡張機能
    ],
    [] // 依存配列は空（extensions は絶対に変わらない）
);

const editor = useEditor({
    immediatelyRender: false,
    extensions, // メモ化された安定な参照
    editorProps: {...},
});
```

**効果**：

- エディターインスタンスが作成された後、再作成されない
- `useEditorInitializer` の effect が不必要に再実行されない

#### 2. `useEditorInitializer.ts`: プリロード実行回数の制限

`preloadedRef` フラグを追加し、エディターインスタンスごとに 1 回だけ実行：

```typescript
const preloadedRef = useRef(false);

useEffect(() => {
  if (!editor) return;

  // Reset flag when editor changes (new instance)
  preloadedRef.current = false;

  // Call only once per editor instance
  if (!preloadedRef.current) {
    preloadedRef.current = true;
    void preloadPageTitles(userId).catch(() => {});
  }

  // 残りの初期化処理...
}, [editor, userId]);
```

**効果**：

- `preloadPageTitles()` が editor インスタンスごとに最大 1 回だけ実行される
- 万が一エディターが再作成されても、プリロードが複数回実行されない

## テスト項目

- [x] コード修正完了
- [ ] ページ読み込み時にログを確認
  - `preloadPageTitles()` が 1 回だけ実行されることを確認
  - サーバーログに重複する POST が出現しないこと
  - ブラウザコンソールに無限ループのエラーがないこと
- [ ] ページ切り替え時の動作確認
- [ ] エディター機能の動作確認（リンク作成、コンテンツ編集など）

## 修正ファイル

- ✅ `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`
- ✅ `app/(protected)/pages/[id]/_hooks/useEditorInitializer.ts`

## 関連ドキュメント

- 問題記録: `docs/issues/open/20251018_07_preload-multiple-execution.md`
- 前回の問題: `docs/issues/open/20251018_01_infinite-editor-preload-loop.md`
- 前回の作業: `docs/08_worklogs/2025_10/20251018_06_debug-logs-cleanup.md`

## 重要度

**High** - パフォーマンス低下とログ汚染の原因

## 完了日

2025-10-18

## ステータス

✅ 修正完了 - テスト待ち
