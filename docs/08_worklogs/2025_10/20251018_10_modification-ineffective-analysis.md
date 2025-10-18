# 修正無効化分析 - すべての試行が失敗 - 2025-10-18

## 概要

2025-10-18 にわたって実施した以下の 9 つの修正がすべて **無効であった** ことが確認されました。

ユーザーから「まだ無限 POST 問題は解決していません」という報告を受けました。

## 実施した修正と結果

### 修正 1: `initialDoc` の `useMemo` メモ化 ❌ 失敗

**ファイル**: `usePageEditorLogic.ts`

**修正内容**:

```typescript
const initialDoc = useMemo(
  () =>
    initialContent ??
    (page.content_tiptap as JSONContent) ?? { type: "doc", content: [] },
  [initialContent, page.content_tiptap]
);
```

**目的**: `initialDoc` の参照を安定化して、`useEffect` の不要な再実行を防ぐ

**結果**: ❌ **無効** - 無限ループ継続

---

### 修正 2: `useEditorInitializer` 依存配列から `initialDoc` を除外 ❌ 失敗

**ファイル**: `useEditorInitializer.ts`

**修正内容**:

```typescript
useEffect(() => {
  // ...
}, [editor, userId]); // ← initialDoc を削除
```

**目的**: `initialDoc` の参照変化で `useEffect` が再実行されるのを防ぐ

**結果**: ❌ **無効** - 無限ループ継続

---

### 修正 3: `owner_id` → `user_id` スキーマ修正 ❌ 失敗

**ファイル**: `page-cache-preloader.ts`

**修正内容**:

```typescript
if (userId) {
  query = query.eq("user_id", userId); // owner_id → user_id
}
```

**目的**: Supabase クエリのカラム名不一致を修正

**結果**: ❌ **無効** - 無限ループ継続

---

### 修正 4: `docRef` を使った参照安定化 ❌ 失敗

**ファイル**: `useEditorInitializer.ts`

**修正内容**:

```typescript
const docRef = useRef<JSONContent>(initialDoc);

useEffect(() => {
  docRef.current = initialDoc;
}, [initialDoc]);

useEffect(() => {
  const sanitized = sanitizeContent(docRef.current); // ref を使用
  // ...
}, [editor, userId]);
```

**目的**: `initialDoc` の値を ref に保存して、`useEffect` の依存を削除

**結果**: ❌ **無効** - 無限ループ継続

---

### 修正 5: `EditPageForm` を `memo` でメモ化 ❌ 失敗

**ファイル**: `edit-page-form.tsx`

**修正内容**:

```typescript
export default memo(EditPageForm);
```

**目的**: 親コンポーネントの再レンダリング時に `EditPageForm` の再実行を防ぐ

**結果**: ❌ **無効** - 無限ループ継続

---

### 修正 6: `extensions` 配列の `useMemo` メモ化 ❌ 失敗

**ファイル**: `usePageEditorLogic.ts`

**修正内容**:

```typescript
const extensions = useMemo(
    () => [
        StarterKit.configure({...}),
        UnifiedLinkMark,
        // ...
    ],
    [],  // 依存配列は空
);

const editor = useEditor({
    extensions,  // メモ化された参照
});
```

**目的**: `extensions` 配列の参照を安定化して、エディターの不要な再作成を防ぐ

**結果**: ❌ **無効** - 無限ループ継続

---

### 修正 7: プリロード実行フラグ（第 1 版） ❌ 失敗

**ファイル**: `useEditorInitializer.ts`

**修正内容**:

```typescript
const preloadedRef = useRef(false);

useEffect(() => {
  if (!editor) return;

  preloadedRef.current = false; // effect 開始時にリセット

  if (!preloadedRef.current) {
    // 常に true → 毎回実行
    preloadedRef.current = true;
    void preloadPageTitles(userId).catch(() => {});
  }
}, [editor, userId]);
```

**目的**: `preloadPageTitles()` を editor インスタンスごとに 1 回だけ実行

**結果**: ❌ **ロジックバグで無限ループが悪化**

---

### 修正 8: プリロード実行フラグ（第 2 版） ❌ 失敗

**ファイル**: `useEditorInitializer.ts`

**修正内容**:

```typescript
const lastEditorRef = useRef<Editor | null>(null);
const preloadedRef = useRef(false);

useEffect(() => {
  if (!editor) return;

  if (lastEditorRef.current !== editor) {
    lastEditorRef.current = editor;
    preloadedRef.current = false;
  }

  if (!preloadedRef.current) {
    preloadedRef.current = true;
    void preloadPageTitles(userId).catch(() => {});
  }
}, [editor, userId]);
```

**目的**: エディター参照比較で新しいインスタンスを検出し、正確にフラグをリセット

**結果**: ❌ **無効** - 無限ループ継続

---

### 修正 9: デバッグログの削除とトレーサー追加 ❌ 失敗

**ファイル**: `page-cache-preloader.ts`, `utils.ts`

**修正内容**:

- 不要なデバッグログ 1000+ 行を削除
- 呼び出し回数トレーサーを追加

```typescript
let preloadCallCount = 0;

export async function preloadPageTitles(userId?: string): Promise<number> {
  preloadCallCount++;
  logger.info(
    { callCount: preloadCallCount, userId },
    "[PageCachePreloader] preloadPageTitles called"
  );
  // ...
}
```

**目的**: ログノイズを削除して、実際の呼び出し回数を追跡可能に

**結果**: ❌ **ログは改善されたが、無限ループは解決せず**

---

## なぜすべて失敗したのか？

### 仮説 1: 根本原因が別の場所にある ⚠️

すべての修正が **`preloadPageTitles()` の呼び出しタイミング** に焦点を当てていましたが、実際の根本原因は別の場所にある可能性があります。

**考えられる原因**:

- [ ] サーバーアクション（Server Action）が無限に実行されている
- [ ] ミドルウェア（`middleware.ts`）が無限ループを引き起こしている
- [ ] Next.js の Streaming や Suspense の実装が問題
- [ ] データベースクエリ自体が無限ループ（RLS ポリシー等）
- [ ] WebSocket や BroadcastChannel の無限メッセージング
- [ ] キャッシュの無効化ロジックが間違っている

---

### 仮説 2: クライアント側のみの修正では不十分 ⚠️

報告されたログを見ると：

```
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 71ms
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 61ms
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 119ms
```

これは **HTTP レベルの POST リクエスト** であり、クライアント側の React Hook の修正だけでは解決できない可能性があります。

---

### 仮説 3: 修正が実装されていない ⚠️

以下の可能性を検討：

- [ ] ビルドプロセス（HMR、バンドル）で修正が反映されていない
- [ ] ブラウザキャッシュが古いコードを提供している
- [ ] サーバーキャッシュが有効で、修正コードが実行されていない
- [ ] `next build` で型チェックエラーにより、修正が反映されていない

---

## 次のアプローチ

### 1. 根本原因の再調査が必須 🔍

以下の調査が必要：

**クライアント側**:

- [ ] React DevTools で component render 回数を追跡
- [ ] Performance タブで JavaScript 実行タイミングを分析
- [ ] Network タブで POST リクエストの詳細（ペイロード、ヘッダー）を確認

**サーバー側**:

- [ ] サーバーログで API エンドポイント（`/pages/{id}`）の処理を追跡
- [ ] データベースクエリログを確認
- [ ] ミドルウェア（`middleware.ts`）のログを追加

**ビルド/キャッシュ**:

- [ ] `next build` で完全ビルドを実行
- [ ] ブラウザキャッシュをクリア（Cmd+Shift+Delete）
- [ ] `node_modules/.next` を削除してリビルド

---

### 2. ログをより正確に採集 📊

現在のログ出力では情報が不足している可能性：

**追加すべき情報**:

- [ ] Stack trace - どこから POST が発生しているか
- [ ] Component render 回数 - どのコンポーネントが何回レンダリングされたか
- [ ] ページオブジェクト ID - 同じページなのか複数ページなのか
- [ ] HTTP リクエストペイロード - データベース操作の内容

---

### 3. 問題の特定方法 🎯

**段階的なアプローチ**:

1. **ページを読み込む直後のリクエスト**:

   - 何回 POST が発生するか数える（期待値: 1-2 回）
   - リクエストの `body` と `response` を比較

2. **ページ上で何もしない**:

   - 10 秒待機
   - POST が発生したら、いつ・なぜ発生しているか追跡

3. **ユーザーインタラクション**:
   - リンククリック、テキスト入力など各操作後に POST が発生するか確認

---

## 文書化すべき項目

**次の作業ログに含めるべき情報**:

1. **根本原因の最終判定**

   - クライアント側か、サーバー側か、その他か

2. **採集したログの詳細分析**

   - Component render flow
   - HTTP request sequence
   - Database query pattern

3. **実際に効果のあった修正（あれば）**
   - どの修正が効果があったか
   - その理由は何か

---

## 修正されたファイルリスト（参考）

以下のファイルが修正されましたが、**すべて無効**でした：

- `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts` ❌
- `app/(protected)/pages/[id]/_hooks/useEditorInitializer.ts` ❌
- `lib/unilink/page-cache-preloader.ts` ❌
- `lib/unilink/utils.ts` ❌
- `app/(protected)/pages/[id]/_components/edit-page-form.tsx` ❌

---

## 結論

**現在までの修正戦略が根本原因を解決できていません。**

新しいアプローチが必要です：

1. ✅ クライアント側の最適化試行（修了・無効）
2. ⏳ **サーバー側の詳細ログ採集と分析が次のステップ**
3. ⏳ 根本原因の特定
4. ⏳ 的確な修正の実装

## ステータス

🔴 **問題解決中止** - 新しい調査方針が必要
