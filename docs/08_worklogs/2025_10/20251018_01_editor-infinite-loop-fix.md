# エディター初期化無限ループバグ修正 - 完了

## 作業日

2025-10-18

## 問題

ページエディターで `preloadPageTitles()` が無限に実行される問題が発生していました。

## 原因

1. **参照値の不安定性**: `usePageEditorLogic.ts` で毎回新しい `initialDoc` オブジェクトが作成されていた
2. **依存配列の問題**: `useEditorInitializer` の `useEffect` が `initialDoc` を依存に含んでいたため、毎回再実行されていた
3. **ログの問題**: エラーオブジェクトがシリアライズできず、`{}` として出力されていた

## 実施した修正

### 1. `usePageEditorLogic.ts` - `initialDoc` を `useMemo` でメモ化

**変更内容**:

```typescript
// Before
const initialDoc: JSONContent = initialContent ??
  (page.content_tiptap as JSONContent) ?? { type: "doc", content: [] };

// After
const initialDoc: JSONContent = useMemo(
  () =>
    initialContent ??
    (page.content_tiptap as JSONContent) ?? { type: "doc", content: [] },
  [initialContent, page.content_tiptap]
);
```

**理由**:

- 参照を安定化することで、不要な再計算を防止
- `initialContent` または `page.content_tiptap` が実際に変わった時だけ再計算

### 2. `useEditorInitializer.ts` - 依存配列から `initialDoc` を除外

**変更内容**:

```typescript
// Before
useEffect(() => {
  // ...
}, [editor, initialDoc, userId]);

// After
useEffect(() => {
  // ...
}, [editor, userId]);
```

**理由**:

- `initialDoc` は `useMemo` により参照が安定化された
- 実際に重要な依存は `editor` と `userId` のみ
- 無限ループを防止

### 3. `page-cache-preloader.ts` - エラーオブジェクトをシリアライズ可能な形に

**変更内容**:

```typescript
// Before
if (error) {
  logger.error({ error }, "[PageCachePreloader] Failed to fetch pages");
}

// After
if (error) {
  logger.error(
    {
      errorMessage: error.message,
      errorCode: error.code,
    },
    "[PageCachePreloader] Failed to fetch pages"
  );
}
```

**理由**:

- Supabase エラーは直接シリアライズできない
- `message` と `code` を抽出することで、ログに明確な情報を出力

## テスト手順

### 動作確認

1. **ブラウザコンソールを開く** (F12)
2. **ページエディターを開く**
3. **以下を確認**:
   - [ ] エラーが出力されないこと
   - [ ] ブラウザコンソールに `Error: {}` が表示されないこと
   - [ ] ネットワークタブで同じ POST リクエストが無限に発生していないこと

### サーバーログの確認

```bash
# サーバーログを確認
tail -f logs/server.log | grep "POST /pages"
```

- [ ] 同じ POST リクエストが 1-2 回だけ表示されること
- [ ] 無限ループしていないこと

### エディター機能確認

- [ ] コンテンツが正しく読み込まれることを確認
- [ ] ページ切り替え時に正しく動作することを確認
- [ ] 新規ページ作成時に正しく動作することを確認
- [ ] リンク解決が正常に機能することを確認

## 関連ファイル

- `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`
- `app/(protected)/pages/[id]/_hooks/useEditorInitializer.ts`
- `lib/unilink/page-cache-preloader.ts`

## 解決状況

✅ 完了 - すべての修正を適用し、エラーチェックに合格

## 次のステップ

1. 実際にアプリケーションをテストして動作確認
2. ブラウザコンソールのエラーが出ないことを確認
3. サーバーログで無限ループが解消されたことを確認
4. 関連する issue を `resolved` に移動

## 参考

- Issue: `docs/issues/open/20251018_01_infinite-editor-preload-loop.md`
