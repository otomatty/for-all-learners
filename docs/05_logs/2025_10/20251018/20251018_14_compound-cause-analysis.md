# 無限 POST ループ - 複合原因分析 - 2025-10-18 最終調査

## 最新ログ分析

ユーザーからの報告:

```
{time: 1760757997771, level: 30, callCount: 1, userId: '...', msg: '[PageCachePreloader] preloadPageTitles called'}
{time: 1760758028679, level: 20, msg: '[MarkIndex] Index rebuilt'}
```

**重要な発見**:

1. `preloadPageTitles` が 1 回呼ばれている
2. `[MarkIndex] Index rebuilt` が複数回発生（約 11 秒間隔）
3. **1000 個のページタイトルをプリロード**している

---

## 問題の複合的な原因

### 問題 1: `preloadPageTitles` が重い処理 🔴 Critical

**ファイル**: `lib/unilink/page-cache-preloader.ts`

```typescript
export async function preloadPageTitles(userId?: string): Promise<number> {
  try {
    const supabase = createClient();
    let query = supabase
      .from("pages")
      .select("id, title")
      .order("updated_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query; // ← ❌ すべてのページを取得

    if (!data || data.length === 0) {
      return 0;
    }

    const entries = data.map((page: { id: string; title: string }) => ({
      key: normalizeTitleToKey(page.title),
      pageId: page.id,
    }));

    setCachedPageIds(entries); // ← ❌ 1000 個のキャッシュ設定

    logger.info(
      { count: entries.length, userId },
      "[PageCachePreloader] Preloaded page titles"
    );

    return entries.length;
  } catch (error) {
    // ...
  }
}
```

**問題点**:

- **1000 個のページをメモリに読み込む** → ネットワーク + CPU 負荷
- `userId` で フィルター されるが、それでも多数のページを取得
- キャッシュ設定に時間がかかる

---

### 問題 2: `editor` インスタンスの参照が頻繁に変わる 🟠 High

**ファイル**: `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`

```typescript
const editor = useEditor({
  immediatelyRender: false,
  extensions,
  editorProps,
});
```

**問題**:

- `useEditor` の参照が不安定
- `editor` が変わるたびに `useEditorInitializer` が実行
- ↓
- `preloadPageTitles` が再度呼ばれる可能性

**確認方法**: `editor` インスタンスの参照が何回変わっているか

---

### 問題 3: `MarkIndex` が何度も再構築されている 🟠 High

**ログから**:

```
{time: 1760757997852, level: 20, msg: '[MarkIndex] Index rebuilt'}
{time: 1760758017765, level: 20, msg: '[MarkIndex] Index rebuilt'}  ← 約 20 秒後
{time: 1760758028679, level: 20, msg: '[MarkIndex] Index rebuilt'}  ← 約 11 秒後
```

**問題**:

- `MarkIndex` が何度も再構築されている
- これは、`unifiedLink` マークが何度も更新されている可能性
- または、エディターが何度も再作成されている可能性

---

### 問題 4: `useEditorInitializer` の `[editor, userId]` 依存 🔴 Critical

**ファイル**: `app/(protected)/pages/[id]/_hooks/useEditorInitializer.ts`

```typescript
useEffect(() => {
  // ...
  if (!preloadedRef.current) {
    preloadedRef.current = true;
    void preloadPageTitles(userId).catch(() => {
      // ...
    });
  }
  // ...
}, [editor, userId]); // ← userId が依存配列に含まれている
```

**問題**:

- `userId` が依存配列に含まれている
- 通常は `userId` は変わらないが、何らかの理由で変わる可能性
- または、**`editor` インスタンスが何度も変わっている**

---

## 根本原因の仮説（複合的）

### シナリオ 1: editor インスタンスが繰り返し再作成されている

```
1. edit-page-form.tsx マウント
   ↓
2. usePageEditorLogic() 実行
   ↓
3. useEditor() で editor インスタンス作成 (ref: A)
   ↓
4. useEditorInitializer() 実行
   ↓
5. preloadPageTitles(userId) 呼び出し
   ↓
6. editor インスタンスが何らかの理由で変わる (ref: B)
   ↓
7. useEditorInitializer の [editor, userId] が変わる
   ↓
8. useEffect が再実行
   ↓
9. preloadPageTitles(userId) が再度呼ばれる
   ↓
10. 🔄 ループ（毎回 1000 ページ取得）
```

### シナリオ 2: 自動保存による再レンダリングループ

```
1. useAutoSave が 2 秒後に savePage() を呼ぶ
   ↓
2. updatePage Server Action 実行
   ↓
3. Supabase で UPDATE
   ↓
4. ページが再レンダリング
   ↓
5. editor インスタンスが変わる可能性
   ↓
6. useEditorInitializer が再実行
   ↓
7. preloadPageTitles() が再度呼ばれる
   ↓
8. ネットワーク負荷 + CPU 負荷
```

---

## 修正戦略

### 修正 1: `preloadPageTitles` をスキップ条件の追加 🔴 Immediate

**現在**:

```typescript
if (!preloadedRef.current) {
  preloadedRef.current = true;
  void preloadPageTitles(userId).catch(() => {});
}
```

**問題**: `preloadedRef` は `ref` なので、同じ editor インスタンスでは 1 回だけ実行されます。しかし、**editor インスタンスが何度も作られれば、毎回実行されます**。

**修正案**: グローバルキャッシュ状態を追加

```typescript
// 一度読み込まれたら、二度と読み込まない（ユーザーセッション中）
const userPreloadCache = useRef<Map<string, boolean>>(new Map());

useEffect(() => {
  if (!editor) return;

  if (lastEditorRef.current !== editor) {
    lastEditorRef.current = editor;
    preloadedRef.current = false;
  }

  if (!preloadedRef.current) {
    preloadedRef.current = true;

    // Check if already preloaded for this user
    if (!userPreloadCache.current.get(userId)) {
      void preloadPageTitles(userId).catch(() => {});
      userPreloadCache.current.set(userId, true); // ✅ グローバルフラグ
    }
  }

  // ... rest of initialization
}, [editor, userId]);
```

---

### 修正 2: `preloadPageTitles` の最適化 🟠 High

**現在**:

```typescript
const { data, error } = await query; // ← すべてのページを取得
```

**問題**: 1000 個のすべてのページを取得している

**修正案 A**: ページ数を制限

```typescript
const { data, error } = await query.limit(100); // ✅ 最初の 100 ページのみ
```

**修正案 B**: フロントエンド側のキャッシュを活用

```typescript
export async function preloadPageTitles(userId?: string, limit: number = 100): Promise<number> {
    // ...
    const { data, error } = await query.limit(limit);  // ✅ limit パラメータ
```

---

### 修正 3: editor インスタンスの安定化 🟠 High

**ファイル**: `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`

**現在**:

```typescript
const editor = useEditor({
  immediatelyRender: false,
  extensions,
  editorProps,
});
```

**問題**: `useEditor` の参照が変わる可能性がある

**修正案**: `useMemo` で安定化

```typescript
const editor = useMemo(() => {
  return useEditor({
    immediatelyRender: false,
    extensions,
    editorProps,
  });
}, [extensions, editorProps]);
```

**注意**: `useEditor` は hooks なので、`useMemo` 内で呼び出すことはできません。代わりに、`immediatelyRender` の値を確認します。

---

### 修正 4: `useEditorInitializer` の依存配列から `userId` を除外 🔴 Critical

**ファイル**: `app/(protected)/pages/[id]/_hooks/useEditorInitializer.ts`

**現在**:

```typescript
useEffect(() => {
  // ...
}, [editor, userId]); // ← userId が含まれている
```

**問題**: `userId` が変わるたびに effect が再実行される（通常は変わらないが、念のため）

**修正案**:

```typescript
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

  // ... rest of initialization
}, [editor]); // ✅ userId を除外
```

**理由**:

- `userId` はページのルートプロップなので、ページ再ロードされない限り変わらない
- `userId` を依存配列に入れると、何らかの理由で `userId` が「同じ値で」再割り当てされた場合、effect が再実行される可能性がある
- `preloadPageTitles` 内で `userId` を参照しているので、`userId` の値は closure に閉じ込められている

---

## 追加の計測

**何が起こっているのか確実に把握するため**、以下のログを追加：

```typescript
// useEditorInitializer.ts
useEffect(() => {
  logger.info(
    { editorRef: editor, userId, lastEditor: lastEditorRef.current },
    "[useEditorInitializer] Effect running"
  );

  if (!editor) return;

  if (lastEditorRef.current !== editor) {
    logger.info(
      { newEditor: editor, oldEditor: lastEditorRef.current },
      "[useEditorInitializer] Editor instance changed"
    );
    lastEditorRef.current = editor;
    preloadedRef.current = false;
  }

  if (!preloadedRef.current) {
    logger.info({ userId }, "[useEditorInitializer] Starting preload");
    preloadedRef.current = true;
    void preloadPageTitles(userId).catch(() => {});
  }

  // ... rest
}, [editor]);
```

```typescript
// usePageEditorLogic.ts
logger.info(
  { hasEditor: !!editor, editorRef: editor },
  "[usePageEditorLogic] Editor created"
);
```

---

## 修正の優先度

| 優先度 | 修正                                    | 効果                                        |
| ------ | --------------------------------------- | ------------------------------------------- |
| 🔴 1   | useEditorInitializer の `[editor]` 依存 | preloadPageTitles の重複呼び出し防止        |
| 🔴 2   | userPreloadCache グローバルフラグ       | session 中の preloadPageTitles 1 回呼び出し |
| 🟠 3   | preloadPageTitles の limit 追加         | ネットワーク負荷軽減                        |
| 🟠 4   | editor インスタンスの参照安定化         | 不要な再作成防止                            |

---

## テスト方法

修正後、以下を確認：

```
1. ページ表示 → Network タブでリクエスト数を確認
   期待: GET /pages* が 1-2 回
   現在: 不明

2. ブラウザコンソールでログを確認
   期待: "[PageCachePreloader] preloadPageTitles called" が 1 回
   現在: 複数回の可能性あり

3. MarkIndex の再構築数
   期待: 初回 1 回
   現在: 複数回（約 11 秒間隔）

4. 何も操作しない状態で 30 秒観察
   期待: POST が発生しない
   現在: 不明
```
