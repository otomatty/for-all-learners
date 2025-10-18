# 無限 POST ループ - 新しい原因仮説 - 2025-10-18 追加調査 2

## 最初の修正が失敗した理由

前回の修正（useAutoSave の依存配列から `savePage` を除外）は実装されましたが、**それでも無限 POST が続いている**という報告を受けました。

これは、**根本原因が `useAutoSave` ではなく、別の場所にある**ことを強く示唆しています。

---

## 新しい原因仮説

### 仮説 1: `autoSetThumbnailOnPageView` が無限ループを引き起こしている 🔴 Critical

**ファイル**: `app/(protected)/pages/[id]/_components/edit-page-form.tsx`（行 125-157）

```typescript
// 自動サムネイル設定（ページ表示時）
useEffect(() => {
  const autoSetThumbnail = async () => {
    // サムネイルが既に設定されている場合はスキップ
    if (page.thumbnail_url) {
      return;
    }

    // initialContentがある場合のみ実行
    if (!initialContent) {
      return;
    }

    try {
      const result = await autoSetThumbnailOnPageView(
        page.id,
        initialContent,
        page.thumbnail_url
      );
      // ...
    } catch (error) {
      // ...
    }
  };

  autoSetThumbnail();
}, [page.id, page.thumbnail_url, initialContent]); // ❌ 依存配列に page.thumbnail_url が含まれている
```

#### ループメカニズム

```
1. ページを表示 → edit-page-form.tsx がマウント
   ↓
2. useEffect が実行（依存: page.id, page.thumbnail_url, initialContent）
   ↓
3. autoSetThumbnailOnPageView() 呼び出し
   ↓
4. Supabase で page.thumbnail_url を更新
   ↓
5. ページデータが変更される → page.thumbnail_url が変わる
   ↓
6. useEffect の依存配列が変わる
   ↓
7. useEffect が再実行 ← 🔄 ここで無限ループが開始
   ↓
8. でも、page.thumbnail_url は既に設定されているので、if (page.thumbnail_url) return; で終了するはず...
```

**但し、**以下の点に注意：

- `autoSetThumbnailOnPageView` が更新を行ってから、親コンポーネント（ページ詳細画面）が再レンダリングされるまでに遅延がある
- 結果として、`page` オブジェクトが複数回変更される可能性
- Realtime subscription が有効の場合、Supabase の変更が即座に親に通知され、再度 `page` が更新される

### 仮説 2: `usePageEditorLogic` の `initialContent` が変動している 🟠 High

**ファイル**: `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`

```typescript
const initialDoc: JSONContent = useMemo(
  () =>
    initialContent ??
    (page.content_tiptap as JSONContent) ?? { type: "doc", content: [] },
  [initialContent, page.content_tiptap]
);
```

- `page.content_tiptap` が変わるたびに `initialDoc` が変わる
- ↓
- `useEditorInitializer` が再実行される可能性
- ↓
- `preloadPageTitles()` が再度呼ばれる
- ↓
- 影響は限定的だが、タイミングによっては POST を誘発

### 仮説 3: Realtime Subscription による無限更新 🔴 Critical

Supabase の Realtime Subscription が有効な場合：

```
1. autoSetThumbnailOnPageView() → Supabase に UPDATE
   ↓
2. Realtime が変更を検知
   ↓
3. 親コンポーネント（ページ詳細）が page オブジェクトを再取得
   ↓
4. edit-page-form.tsx の page prop が更新される
   ↓
5. useEffect の依存配列が再評価される
   ↓
6. autoSetThumbnailOnPageView() が再度呼ばれる
   ↓
7. ループに戻る
```

---

## 現在のコード流れの詳細分析

### ページ読み込み時の処理順序

```
1. page/[id]/page.tsx - サーバーコンポーネント
   ↓
2. editPage() サーバーアクション実行 → ページデータ取得
   ↓
3. EditPageForm コンポーネント マウント
   │
   ├─→ usePageFormState() 実行
   │   └─ isDirty状態を初期化
   │
   ├─→ usePageEditorLogic() 実行
   │   ├─ useEditor() で TipTap エディター作成
   │   ├─ useEditorInitializer() で コンテンツ初期化
   │   ├─ useAutoSave() で 自動保存監視 ← 修正済み
   │   └─ その他フック群
   │
   └─→ autoSetThumbnail useEffect 実行 ← 🔴 ここで無限ループか？
       ├─ Supabase の page を UPDATE
       └─ page オブジェクト参照が変わる
           ↓
           親コンポーネント再レンダリング（Realtime）
           ↓
           edit-page-form.tsx の page prop が変わる
           ↓
           autoSetThumbnail useEffect が再実行
           ↓
           🔄 ループ
```

---

## 修正案

### 修正 1: `autoSetThumbnailOnPageView` の依存配列から `page.thumbnail_url` を除外 🔴 Critical

```typescript
// 現在のコード（❌ 問題あり）
useEffect(() => {
  const autoSetThumbnail = async () => {
    if (page.thumbnail_url) {
      return;
    }
    if (!initialContent) {
      return;
    }
    try {
      await autoSetThumbnailOnPageView(
        page.id,
        initialContent,
        page.thumbnail_url
      );
    } catch (error) {
      // ...
    }
  };
  autoSetThumbnail();
}, [page.id, page.thumbnail_url, initialContent]); // ❌ page.thumbnail_url が含まれている
```

**問題**:

- `page.thumbnail_url` が依存配列に含まれている
- `autoSetThumbnailOnPageView` が `page.thumbnail_url` を更新
- ↓
- 親コンポーネント再レンダリング
- ↓
- `page.thumbnail_url` が変わる
- ↓
- useEffect が再実行
- ↓
- 無限ループ

**修正案**:

```typescript
useEffect(() => {
  const autoSetThumbnail = async () => {
    // 既にサムネイルが設定されている場合は何もしない
    if (page.thumbnail_url) {
      return;
    }

    // initialContentがある場合のみ実行
    if (!initialContent) {
      return;
    }

    try {
      await autoSetThumbnailOnPageView(
        page.id,
        initialContent,
        page.thumbnail_url // 最初の呼び出し時の値を使用
      );
      // サムネイル設定後は、次回のページ読み込みで page.thumbnail_url が更新される
      // その時点で、この effect は実行されない（if (page.thumbnail_url) return）
    } catch (error) {
      // ...
    }
  };

  autoSetThumbnail();
}, [page.id, initialContent]); // ✅ page.thumbnail_url を除外
```

**理由**:

- 最初のマウント時だけ `autoSetThumbnailOnPageView` を実行
- サムネイル設定後、page が再度読み込まれた時は、`if (page.thumbnail_url)` で早期終了
- `page.thumbnail_url` が依存配列に含まれていないため、effect は再実行されない

### 修正 2: `autoSetThumbnailOnPageView` の重複呼び出し防止 🟠 High

```typescript
interface UsePageFormStateProps {
  page: Database["public"]["Tables"]["pages"]["Row"];
  isNewPage: boolean;
}

export function usePageFormState({ page, isNewPage }: UsePageFormStateProps) {
  // ...
  const [autoSetThumbnailExecuted, setAutoSetThumbnailExecuted] =
    useState(false);
  // ...
  return {
    // ...
    autoSetThumbnailExecuted,
    setAutoSetThumbnailExecuted,
  };
}
```

```typescript
// edit-page-form.tsx
const [autoSetThumbnailExecuted, setAutoSetThumbnailExecuted] = useState(false);

// 自動サムネイル設定（ページ表示時）
useEffect(() => {
  const autoSetThumbnail = async () => {
    // 既に実行済みの場合はスキップ
    if (autoSetThumbnailExecuted) {
      return;
    }

    // 既にサムネイルが設定されている場合はスキップ
    if (page.thumbnail_url) {
      setAutoSetThumbnailExecuted(true);
      return;
    }

    // initialContentがある場合のみ実行
    if (!initialContent) {
      return;
    }

    try {
      const result = await autoSetThumbnailOnPageView(
        page.id,
        initialContent,
        page.thumbnail_url
      );

      if (result.thumbnailSet) {
        // ... 成功処理
      } else {
        // ... 失敗処理
      }

      setAutoSetThumbnailExecuted(true); // ✅ 実行済みフラグを設定
    } catch (error) {
      // ...
      setAutoSetThumbnailExecuted(true); // ✅ エラーでも実行済みにする
    }
  };

  autoSetThumbnail();
}, [page.id, initialContent, autoSetThumbnailExecuted]); // ✅ フラグを依存配列に追加
```

### 修正 3: Realtime Subscription による再レンダリング対策 🔴 Critical

親コンポーネント（ページ詳細画面）でも同様の対策が必要：

```typescript
// page/[id]/page.tsx または ページ詳細画面
const [isUpdating, setIsUpdating] = useState(false);

useEffect(() => {
  if (isUpdating) {
    // 更新中の場合は、再度の更新イベント処理をスキップ
    return;
  }

  // Realtime subscription の設定
  const channel = supabase
    .channel(`public:pages:id=eq.${pageId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "pages",
        filter: `id=eq.${pageId}`,
      },
      (payload) => {
        // 自身の更新を無視
        if (payload.eventType === "UPDATE" && isUpdating) {
          setIsUpdating(false);
          return;
        }

        // ページデータを更新
        setPage(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [pageId, isUpdating, supabase]);
```

---

## テスト計画

### Step 1: 修正 1 を適用してテスト

```
目的: autoSetThumbnailOnPageView の無限ループを停止
手順:
1. edit-page-form.tsx の useEffect の依存配列から page.thumbnail_url を除外
2. ページを開く → Network タブで POST リクエスト監視
3. 何も操作しない → POST が 0～1 回のみで止まることを確認
```

### Step 2: 修正 2 を適用してテスト

```
目的: autoSetThumbnailOnPageView の重複呼び出しを防止
手順:
1. autoSetThumbnailExecuted フラグを追加
2. ページを開く
3. Network タブで確認 → POST が 1 回のみで止まることを確認
```

### Step 3: 修正 3 を適用してテスト

```
目的: Realtime Subscription による無限更新を防止
手順:
1. ページ詳細画面で isUpdating フラグを追加
2. 複数ページを同時に編集 → 無限ループが発生しないことを確認
3. 他のユーザーが同じページを編集 → 自身の更新と他ユーザーの更新が競合しないことを確認
```

---

## まとめ

**根本原因の最新仮説**：

1. `autoSetThumbnailOnPageView` が `page.thumbnail_url` を更新
2. ↓
3. 親コンポーネント（ページ詳細）が Realtime で変更を検知
4. ↓
5. page prop が更新される
6. ↓
7. edit-page-form.tsx の useEffect が再実行
8. ↓
9. `autoSetThumbnailOnPageView` が再度呼ばれる
10. ↓
11. 🔄 無限ループ

**次のステップ**:

1. ✅ useAutoSave 修正（済み - 但し効果なし）
2. ⏳ edit-page-form.tsx の autoSetThumbnail useEffect を修正（優先度: 🔴 Critical）
3. ⏳ 修正 2, 3 を検討
