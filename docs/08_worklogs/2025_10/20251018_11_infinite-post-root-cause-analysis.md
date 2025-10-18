# 無限 POST ループ - 根本原因分析 - 2025-10-18 追加調査

## 概要

9 回の修正試行が失敗した後、コード詳細分析を行いました。**`useAutoSave`フックの依存配列が無限ループの直接的な原因であることが判明しました。**

---

## 発見: useAutoSave の依存配列問題

### 問題コード

**ファイル**: `app/(protected)/pages/[id]/_hooks/useAutoSave.ts`

```typescript
export function useAutoSave(
  editor: Editor | null,
  savePage: () => Promise<void>,
  isDirty: boolean
) {
  // ...

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      // ...
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        void savePage(); // 👈 savePage() を呼び出し
      }, 2000);
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [editor, savePage]); // 👈 依存配列に savePage を含む

  useEffect(() => {
    if (!editor || !isDirty) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      void savePage(); // 👈 savePage() を呼び出し
    }, 2000);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [editor, isDirty, savePage]); // 👈 依存配列に savePage を含む
}
```

### なぜこれが無限ループを引き起こすのか？

#### 1. useAutoSave の依存配列の問題

```
useAutoSave の依存: [editor, savePage]
    ↓
savePage は usePageSaver から返される関数
    ↓
usePageSaver の useCallback 依存配列: [editor, pageId, title, onSaveSuccess, onSaveError, setIsLoading, setIsDirty]
    ↓
usePageEditorLogic 内では savePage を何度も参照している
```

#### 2. savePage 参照の不安定性

**ファイル**: `app/(protected)/pages/[id]/_hooks/usePageSaver.ts`

```typescript
const savePage = useCallback(async () => {
  // ...
}, [
  editor,
  pageId,
  title,
  onSaveSuccess,
  onSaveError,
  setIsLoading,
  setIsDirty,
]);
```

- `savePage` の参照は、依存配列のいずれかが変わるたびに更新される
- 親コンポーネント(`EditPageForm`)は`usePageEditorLogic`を使用
- `usePageEditorLogic`内で`savePage`が何度も呼ばれる

#### 3. ループチェーン

```
1. editor が更新される
   ↓
2. useAutoSave の第 1 つ目の useEffect が実行
   ↓
3. 2 秒後に savePage() が呼ばれる
   ↓
4. updatePage(Server Action) → HTTP POST リクエスト
   ↓
5. ページ内容が保存される
   ↓
6. ページが再レンダリングされる
   ↓
7. usePageSaver の依存が変わる可能性
   ↓
8. savePage 参照が更新される
   ↓
9. useAutoSave の依存配列に savePage が含まれるため、effect が再実行
   ↓
10. editor.on("update", onUpdate) が再登録される
    ↓
11. ステップ 1 に戻る
```

---

## 依存配列の分析

### useAutoSave の問題点

**現在のコード**:

```typescript
// 第 1 useEffect
useEffect(() => {
  if (!editor) return;
  const onUpdate = () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      void savePage();
    }, 2000);
  };
  editor.on("update", onUpdate);
  return () => {
    editor.off("update", onUpdate);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
  };
}, [editor, savePage]); // ❌ savePage が依存配列に含まれている
```

**問題**:

1. `savePage` が依存配列に含まれている
2. `savePage` は `usePageSaver` から渡されており、参照が不安定
3. `usePageEditorLogic` 内で `editor` が変わると、`savePage` も変わる可能性
4. すると、`useAutoSave` の effect が再実行
5. `editor.on("update", onUpdate)` が再登録される
6. これにより古い `onUpdate` が残る可能性がある

### 解決策

`savePage` を依存配列から除外し、`useRef` で参照を保持:

```typescript
export function useAutoSave(
  editor: Editor | null,
  savePage: () => Promise<void>,
  isDirty: boolean
) {
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const isFirstUpdate = useRef(true);
  const savePageRef = useRef(savePage); // ✅ 参照を useRef に保存

  // savePage が変わるたびに ref を更新
  useEffect(() => {
    savePageRef.current = savePage;
  }, [savePage]);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      if (isFirstUpdate.current) {
        isFirstUpdate.current = false;
        return;
      }
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        void savePageRef.current(); // ✅ ref から参照
      }, 2000);
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [editor]); // ✅ savePage を除外

  useEffect(() => {
    if (!editor || !isDirty) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      void savePageRef.current(); // ✅ ref から参照
    }, 2000);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [editor, isDirty]); // ✅ savePage を除外
}
```

---

## 追加の問題点

### 1. usePageEditorLogic での editor 再作成

**ファイル**: `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`

```typescript
const editor = useEditor({
  immediatelyRender: false,
  extensions,
  editorProps: {
    // ...
  },
});
```

**問題**:

- `useEditor` が呼ばれるたびに新しい `editor` インスタンスが作成される可能性
- `extensions` は useMemo で安定化されているが、**`useEditor` のオプション内の `editorProps` は毎回新しいオブジェクト**
- すると `editor` 参照が変わる
- ↓
- `usePageEditorLogic` の呼び出し元(EditPageForm)も再レンダリング
- ↓
- `savePage` 参照も変わる可能性
- ↓
- `useAutoSave` の effect が再実行

### 2. editorProps の不安定性

```typescript
const editor = useEditor({
  immediatelyRender: false,
  extensions,
  editorProps: {
    // ❌ 毎回新しいオブジェクトが作成される
    attributes: {
      class:
        "focus:outline-none !border-none ring-0 prose prose-sm sm:prose md:prose-lg whitespace-normal break-all mx-auto min-h-[200px] px-3 py-2",
    },
  },
});
```

**解決策**:

```typescript
const editorProps = useMemo(
  () => ({
    attributes: {
      class:
        "focus:outline-none !border-none ring-0 prose prose-sm sm:prose md:prose-lg whitespace-normal break-all mx-auto min-h-[200px] px-3 py-2",
    },
  }),
  []
);

const editor = useEditor({
  immediatelyRender: false,
  extensions,
  editorProps, // ✅ 安定化された参照
});
```

---

## 呼び出しチェーン（詳細）

### クライアント側

```
1. EditPageForm レンダリング
   ↓
2. usePageEditorLogic() 実行
   ↓
3. useEditor() → editor インスタンス作成
   ↓
4. useAutoSave(editor, savePage, isDirty) 実行
   ↓
5. 2000ms 後に savePage() 呼び出し
   ↓
6. HTTP POST /pages/{id}
```

### サーバー側

```
1. POST /pages/{id} リクエスト受信
   ↓
2. updatePage Server Action 実行
   ↓
3. Supabase .update() → データベース更新
   ↓
4. 200 OK レスポンス
```

### 再度のクライアント側

```
5. レスポンス受信 → ページ再レンダリング
   ↓
6. usePageEditorLogic 再実行
   ↓
7. editor 参照が変わる可能性 ← ❌ ここで savePage 参照も変わる
   ↓
8. useAutoSave の useEffect が再実行
   ↓
9. ステップ 1 に戻る
```

---

## 予想される修正効果

以下の修正を実装すれば、無限ループが解決される見込み：

### 修正 1: useAutoSave の依存配列から savePage を除外 🔴 Critical

```typescript
export function useAutoSave(
  editor: Editor | null,
  savePage: () => Promise<void>,
  isDirty: boolean
) {
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const isFirstUpdate = useRef(true);
  const savePageRef = useRef(savePage);

  useEffect(() => {
    savePageRef.current = savePage;
  }, [savePage]);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      if (isFirstUpdate.current) {
        isFirstUpdate.current = false;
        return;
      }
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        void savePageRef.current();
      }, 2000);
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [editor]); // savePage を除外

  useEffect(() => {
    if (!editor || !isDirty) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      void savePageRef.current();
    }, 2000);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [editor, isDirty]); // savePage を除外
}
```

**予想効果**: 🟢 無限ループ停止

### 修正 2: editorProps の useMemo 安定化 🟠 High

```typescript
const editorProps = useMemo(
  () => ({
    attributes: {
      class:
        "focus:outline-none !border-none ring-0 prose prose-sm sm:prose md:prose-lg whitespace-normal break-all mx-auto min-h-[200px] px-3 py-2",
    },
  }),
  []
);

const editor = useEditor({
  immediatelyRender: false,
  extensions,
  editorProps,
});
```

**予想効果**: 🟡 editor 参照の安定化により、不要な再作成を防止

### 修正 3: savePage.current が無効なタイミングの対応 🟡 Medium

```typescript
useEffect(() => {
  if (!editor || !isDirty) return;
  if (saveTimeout.current) clearTimeout(saveTimeout.current);
  saveTimeout.current = setTimeout(() => {
    if (savePageRef.current) {
      void savePageRef.current();
    }
  }, 2000);
  return () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
  };
}, [editor, isDirty]);
```

**予想効果**: 🟢 null チェック追加で安全性向上

---

## テスト計画

修正後のテスト手順：

### 1. ページを開く

```
1. ブラウザの DevTools → Network タブを開く
2. フィルター: XHR、フィルター: POST
3. ページ編集画面を開く
```

### 2. 何も操作しない

```
期待: POST リクエストが 0 回
実際: （9 回の修正前は無限に発生）
```

### 3. テキストを入力

```
1. テキストボックスにテキストを入力
2. 2 秒待機
期待: POST リクエストが 1 回のみ
実際: （修正前は複数回発生）
```

### 4. 複数回編集

```
1. テキスト入力
2. 2 秒待機（POST）
3. テキスト追加
4. 2 秒待機（POST）
期待: POST リクエストが 2 回
```

### 5. 入力直後のページ遷移

```
1. テキスト入力
2. すぐにページを遷移
期待: 遷移前に POST が発生すること確認（beforeunload）
```

---

## 修正が無効だった理由の考察

### なぜ修正 1-9 が失敗したのか？

1. **修正 1-2**: `initialDoc` と `useEditorInitializer` の修正

   - 問題: `useAutoSave` の無限ループは別の理由
   - 影響: 限定的

2. **修正 3**: スキーマ修正

   - 問題: そもそも `page.user_id` は存在していた
   - 影響: なし

3. **修正 4-6**: ref 安定化、memo、extensions 安定化

   - 問題: `useAutoSave` の `savePage` 依存は解決していない
   - 影響: 部分的

4. **修正 7-8**: プリロード実行フラグ

   - 問題: `preloadPageTitles()` はオプション機能であり、根本原因ではない
   - 影響: なし

5. **修正 9**: ログ削除
   - 問題: 根本原因の解決ではなく、ノイズ削減のみ
   - 影響: なし

**根本的な問題は、9 つの修正がすべて `useAutoSave` の依存配列問題に対処していなかったこと**

---

## 結論

**無限 POST ループの根本原因は、`useAutoSave` フックの `savePage` 依存配列の問題です。**

- `savePage` が依存配列に含まれている
- `savePage` 参照が不安定であり、頻繁に変わる
- その結果、`useAutoSave` の effect が繰り返し再実行
- ↓
- `editor.on("update", onUpdate)` が繰り返し再登録
- ↓
- 不要な `savePage()` 呼び出しが無限ループ

**次のステップ**: 修正 1（useAutoSave）を実装し、テストで検証
