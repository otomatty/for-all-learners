# EditPageForm メモ化 + 詳細デバッグ - 2025-10-18

## 問題

ログから `initialDoc` が複数回更新されていることが判明しました：

```
useEditorInitializer.ts:47 [DEBUG] initialDoc updated (not triggering re-init)
usePageEditorLogic.ts:70 [DEBUG usePageEditorLogic] initialDoc memo recalculated
```

2 回出現 → 親コンポーネントが複数回レンダリングされている

## 原因

1. **親コンポーネント (`page.tsx`) の再レンダリング**
2. **`page` プロップ自体が毎回新しい参照**
3. **`EditPageForm` がメモ化されていない** → 親の再レンダリングで必ず再実行

## 修正内容

### 1. `usePageEditorLogic.ts` - `page` オブジェクトの変化追跡

```typescript
// page オブジェクト自体の変化を検出
useEffect(() => {
    logger.debug({...}, "[DEBUG usePageEditorLogic] page object dependency changed");
}, [page]);

// initialDoc 計算の詳細ログ
const initialDoc = useMemo(
    () => {
        logger.debug({...}, "[DEBUG usePageEditorLogic] initialDoc memo computing");
        return ...;
    },
    [initialContent, page.content_tiptap, page.id],  // ← page.id を追加
);
```

### 2. `edit-page-form.tsx` - `EditPageForm` をメモ化

```typescript
import { memo } from "react";

function EditPageForm({...}: EditPageFormProps) {
    // ...
}

export default memo(EditPageForm);
```

**効果**:

- Props が変わらない限り、再レンダリングされない
- 子の `usePageEditorLogic` も再実行されない
- `initialDoc` の無駄な再計算が減る

## デバッグログの追加情報

### `usePageEditorLogic` で追跡される内容

1. **`[DEBUG usePageEditorLogic] page object dependency changed`**

   - `page` プロップが新しい参照になった
   - → 親の再レンダリング

2. **`[DEBUG usePageEditorLogic] initialDoc memo computing`**

   - `initialDoc` が再計算される
   - `usingInitialContent` と `usingPageContent` を確認

3. **`[DEBUG usePageEditorLogic] initialDoc memo recalculated`**
   - `useMemo` が新しい値を返した
   - 実際に依存配列が変わった

## 期待される効果

- ✅ `initialDoc` の再計算が **最小限** になる
- ✅ `preloadPageTitles()` が **1 回だけ** 呼び出される
- ✅ 無限ループが **完全に解消** される

## 次のステップ

ブラウザで確認:

```
usePageEditorLogic.ts:??? page object dependency changed × ? 回
usePageEditorLogic.ts:??? initialDoc memo computing × ? 回
usePageEditorLogic.ts:??? initialDoc memo recalculated × ? 回
useEditorInitializer.ts:??? effect triggered × 1 回（期待）
```

`page object dependency changed` が 1 回なら、親が 1 回だけレンダリング = 正常

## 修正ファイル

- `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts` - 詳細デバッグ追加
- `app/(protected)/pages/[id]/_components/edit-page-form.tsx` - memo でメモ化
