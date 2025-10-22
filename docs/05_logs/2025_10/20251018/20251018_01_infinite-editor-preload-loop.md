# エディター初期化の無限ループバグ

## 概要（更新：2025-10-18）

**ステータス**: ✅ 修正完了（前回）+ 関連の新規問題を発見

前回のログで `preloadPageTitles()` の無限ループは修正されました。しかし、より根本的な問題が発見されました：

**新規問題**: ページコンポーネント自体のキャッシング設定が欠落しており、これが `dynamic` ↔ `static` の無限切り替わりを引き起こしていました。

### 現象

```
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 71ms
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 61ms
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 119ms
... (同じ POST リクエストが無限に発生)

Error: {}
    at console.error
    at preloadPageTitles (...)
```

### 根本原因

`usePageEditorLogic.ts` の以下の箇所で、**毎回新しいオブジェクトが作成される**:

```typescript
// Line 59-60 (usePageEditorLogic.ts)
const initialDoc: JSONContent = initialContent ??
  (page.content_tiptap as JSONContent) ?? { type: "doc", content: [] };
```

`initialDoc` が毎回新しい参照になるため、`useEditorInitializer` の依存配列で無限に再実行される:

```typescript
// Line 69 (useEditorInitializer.ts)
useEffect(() => {
  if (!editor) return;
  void preloadPageTitles(userId).catch(() => {});
  // ...
}, [editor, initialDoc, userId]); // ← initialDoc が依存に含まれている
```

### 影響範囲

1. **パフォーマンス低下**: 毎回ページプリロードが実行される
2. **サーバーログの汚染**: 同じ POST リクエストが大量に記録される
3. **ブラウザエラー**: `console.error` にエラーが無限に出力される
4. **エラーオブジェクトが `{}` になる理由**: Supabase エラーのシリアライゼーション問題

## 推奨される解決策

### 方法 1: `initialDoc` を依存配列から除外（推奨）

`initialDoc` は変化しないため、依存配列から外し、値そのものではなく `page.id` を使用:

```typescript
// app/(protected)/pages/[id]/_hooks/useEditorInitializer.ts

useEffect(() => {
  if (!editor) return;
  void preloadPageTitles(userId).catch(() => {});
  // 残りの処理...
}, [editor, userId, page.id]); // ← initialDoc を除外、page.id に変更
```

**理由**:

- `initialDoc` は `page.content_tiptap` から派生した値（参照の問題）
- 実際に変わるべきは `page.id` が変わった時だけ
- `page.id` が同じ場合は初期化を再実行する必要がない

### 方法 2: `initialDoc` の参照を安定化

`useMemo` を使って参照を安定化:

```typescript
// app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts

const initialDoc: JSONContent = useMemo(() => {
  return (
    initialContent ??
    (page.content_tiptap as JSONContent) ?? { type: "doc", content: [] }
  );
}, [initialContent, page.content_tiptap, page.id]);
```

### 方法 3: `preloadPageTitles` 呼び出しを最適化

プリロードを 1 回だけ実行するようにフラグ化:

```typescript
const hasPreloaded = useRef(false);

useEffect(() => {
  if (!editor || hasPreloaded.current) return;
  hasPreloaded.current = true;
  void preloadPageTitles(userId).catch(() => {});
}, [editor, userId]);
```

## テスト項目

- [ ] ページ読み込み時に `preloadPageTitles()` が 1 回だけ実行されることを確認
- [ ] ブラウザコンソールにエラーが出力されないことを確認
- [ ] サーバーログに重複する POST リクエストが出力されないことを確認
- [ ] エディター内容が正しく読み込まれることを確認
- [ ] ページ切り替え時に正しくプリロードが実行されることを確認

## 関連ドキュメント

- 実装計画: `docs/04_implementation/plans/page-editor-refactoring/`
- 作業ログ: `docs/08_worklogs/2025_10/20251014/20251014_04_page-editor-refactoring.md`

## 重要度

**High** - パフォーマンス低下とログ汚染の原因

## 作成日

2025-10-18
