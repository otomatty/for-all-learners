# 無限 POST ループ - 根本原因分析レポート

**作成日**: 2025-10-18  
**重要度**: 🔴 **CRITICAL**  
**根本原因**: `useLinkSync.ts`の`useEffect`依存配列問題  
**ステータス**: ⚠️ 原因確定

---

## 🚨 発見された問題

### **主要問題: `useLinkSync`の無限ループ**

#### 問題箇所

**ファイル**: `app/(protected)/pages/[id]/_hooks/useLinkSync.ts`  
**行番号**: 170-210 (useEffect 部分)

#### 問題コード

```typescript
useEffect(() => {
  if (!editor) return;

  logger.debug({ pageId }, "[useLinkSync] Setting up editor update listener");

  // Handler for editor updates (debounced)
  const updateHandler = () => {
    syncLinks(false); // ← ここが問題！
  };

  // Register event listener
  editor.on("update", updateHandler);

  // Perform initial sync immediately
  syncLinks(true); // ← 初期同期も実行

  // Cleanup
  return () => {
    logger.debug(
      { pageId },
      "[useLinkSync] Cleaning up editor update listener"
    );
    editor.off("update", updateHandler);
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
  };
}, [editor, pageId, syncLinks]); // ← 依存配列が syncLinks を含む！
```

---

## 🔄 無限ループのメカニズム

### ループシーケンス

```
1. useEffect実行
   ↓
2. syncLinks(true) 実行 → performSync() 実行
   ↓
3. performSync() が updatePageLinks API呼び出し (POST)
   ↓
4. API成功 → lastSyncTimeRef更新
   ↓
5. useEffect依存配列の syncLinks 参照
   ↓
6. performSync の依存配列に [editor, pageId, isSyncing, debug]
   ↓
7. isSyncing が false に更新される
   ↓
8. performSync が新しい関数参照になる
   ↓
9. syncLinks 再生成（新しい関数参照）
   ↓
10. useEffect の [editor, pageId, syncLinks] が変更検知
    ↓
11. useEffect 再実行（ステップ1へ戻る）
    ↓
    🔁 無限ループ！
```

---

## 📋 詳細な問題分析

### 問題 1: `syncLinks`が依存配列に含まれている

```typescript
// ❌ 現在の依存配列
useEffect(() => {
  // ...
}, [editor, pageId, syncLinks]); // syncLinks を追跡
```

**なぜ問題か**:

- `syncLinks`は`performSync`に依存する
- `performSync`は`isSyncing`に依存する
- `isSyncing`が変更されるたびに`performSync`が新しい参照になる
- `performSync`が新しい参照になると`syncLinks`も新しい参照になる
- 新しい`syncLinks`参照は依存配列の変更をトリガー
- useEffect が再実行される

### 問題 2: `performSync`の依存配列

```typescript
// ❌ 現在の依存配列
const performSync = useCallback(async () => {
  // ...
}, [editor, pageId, isSyncing, debug]); // isSyncing を追跡
```

**なぜ問題か**:

- `isSyncing`が依存配列に含まれている
- `performSync`実行中に`isSyncing: false`に変更される
- 変更されるたびに`performSync`が新しい参照になる

### 問題 3: 状態更新と依存の循環

```
isSyncing: true
  ↓ performSync() 実行
  ↓ API呼び出し (POST)
  ↓ setIsSyncing(false)
  ↓ isSyncing: false
  ↓ performSync 参照変更
  ↓ syncLinks 参照変更
  ↓ useEffect トリガー
  ↓ syncLinks(false) 呼び出し
  ↓ performSync() 実行 (delay = debounceMs)
  ↓ setTimeout: 500ms後に再度 performSync()
  ↓ isSyncing: true
  ↓ ... 循環開始
```

---

## 🔧 修正方法

### 修正案 1: 依存配列から`syncLinks`を削除（推奨）

```typescript
useEffect(() => {
  if (!editor) return;

  logger.debug({ pageId }, "[useLinkSync] Setting up editor update listener");

  // Handler for editor updates (debounced)
  const updateHandler = () => {
    syncLinks(false);
  };

  // Register event listener
  editor.on("update", updateHandler);

  // Perform initial sync immediately
  syncLinks(true);

  // Cleanup
  return () => {
    logger.debug(
      { pageId },
      "[useLinkSync] Cleaning up editor update listener"
    );
    editor.off("update", updateHandler);
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
  };
}, [editor, pageId]); // ✅ syncLinks を削除
```

**理由**:

- `syncLinks`は常に同じロジックを実行
- 依存配列に含める必要がない
- useRef を活用してクロージャーで参照可能

### 修正案 2: `performSync`の依存配列から`isSyncing`を削除

```typescript
const performSync = useCallback(async () => {
  // 直接 isSavingRef を参照
  if (isSyncingRef.current || !editor) {
    if (debug) {
      logger.debug(
        { pageId, isSyncing: isSyncingRef.current, hasEditor: !!editor },
        "[useLinkSync] Skipping sync (already syncing or no editor)"
      );
    }
    return;
  }
  // ... rest of logic
}, [editor, pageId, debug]); // ✅ isSyncing を削除し、isSyncingRef を使用
```

**理由**:

- `isSyncingRef`を使用して reference 変更を避ける
- `isSyncing` state は UI 表示用のみに

### 修正案 3: 複数の安全装置を追加

```typescript
/**
 * Flag to prevent concurrent syncs (ref-based, not state-based)
 */
const isSyncingRef = useRef(false);
const lastSyncTimeRef = useRef<number | null>(null);

const performSync = useCallback(async () => {
  // Use ref instead of state for concurrency check
  if (isSyncingRef.current || !editor) {
    return;
  }

  isSyncingRef.current = true;
  setIsSyncing(true); // For UI only

  try {
    const linkData = extractLinkData(editor);
    if (!linkData.length) {
      return; // No links to sync
    }

    await updatePageLinks({ pageId, links: linkData });
    lastSyncTimeRef.current = Date.now();

    logger.info({ pageId }, "[useLinkSync] Link sync succeeded");
  } catch (err) {
    logger.error({ err, pageId }, "[useLinkSync] Link sync failed");
  } finally {
    isSyncingRef.current = false;
    setIsSyncing(false); // For UI only
  }
}, [editor, pageId, debug]);
```

---

## ✅ 確認チェックリスト

修正後、以下を確認してください：

- [ ] ブラウザを開き、ページエディターを開く
- [ ] Network タブで POST リクエストが一度だけ送信されることを確認
- [ ] エディターでテキストを入力 → 500ms 後に 1 回だけ POST が送信されることを確認
- [ ] React DevTools で `useLinkSync` の再レンダリング回数が最小限であることを確認
- [ ] Console で エラーメッセージがないことを確認
- [ ] ページを保存 → POST が 1 回だけ送信されることを確認

---

## 📊 関連する二次問題

### 同様の問題の可能性がある箇所

#### 1. `usePageSaver`の依存配列

**ファイル**: `app/(protected)/pages/[id]/_hooks/usePageSaver.ts` (line 149-156)

```typescript
}, [
  editor,
  pageId,
  title,
  onSaveSuccess,    // ← これらが変更されるたびに
  onSaveError,      //    savePage が新しい参照になる可能性
  setIsLoading,
  setIsDirty,
]);
```

**調査項目**:

- [ ] `onSaveSuccess`, `onSaveError` が毎回新しい関数参照になっていないか
- [ ] 呼び出し元で useCallback で包まれているか

---

## 🔗 参考資料

### 問題の本質

- React Hooks の依存配列トラブル
- 状態更新と参照変更の循環
- useCallback とユーザー定義ホックの相互作用

### 参考ドキュメント

- [React: useEffect 依存配列のベストプラクティス](https://react.dev/reference/react/useEffect)
- [React: useCallback 参照等価性](https://react.dev/reference/react/useCallback)

---

## 📝 修正手順

1. **`useLinkSync.ts`を修正**

   - useEffect 依存配列から`syncLinks`を削除
   - performSync 依存配列から`isSyncing`を削除
   - `isSyncingRef`を活用

2. **テスト実行**

   - ローカル開発環境でテスト
   - Network タブで確認

3. **`usePageSaver.ts`の確認**

   - コールバック依存関係を確認

4. **コミット**
   - 修正内容を記録

---

**作成日**: 2025-10-18  
**ステータス**: ✅ 原因確定、修正方法提案完了  
**次のステップ**: 上記の修正案を適用してください

---

## 🔴 実測: サーバーログによる確認

### 観測されたログパターン

```
GET /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 10925ms
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 139ms    ← 1回目
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 242ms    ← 2回目
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 121ms    ← 3回目
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 97ms     ← 4回目
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 91ms     ← 5回目
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 80ms     ← 6回目
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 83ms     ← 7回目
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 76ms     ← 8回目
... 以下無限に続く ...
```

### ログ分析

#### 重要な観察

1. **最初の POST までの時間**: 10925ms (ページ読み込みから ~11 秒後)

   - ページ読み込みが完了
   - エディター初期化が完了
   - `useLinkSync` の `useEffect` が実行

2. **その後の POST 間隔**: 70-300ms (平均 ~100ms)

   - debounce 設定の 500ms より短い
   - useEffect の再実行ループが高速
   - デバウンスが機能していない可能性

3. **応答時間**: すべて 200 (成功)
   - サーバー側は正常に処理
   - クライアント側の無限リクエストが原因
   - API 実装ではなく、React ホックの問題

### 予想されるシーケンス

```
[t=0ms]
  ページ読み込み開始

[t≈10925ms]
  ✅ ページ読み込み完了
  ✅ エディター初期化
  ✅ usePageEditorLogic マウント

[t≈10950ms]
  → useLinkSync useEffect 実行
  → syncLinks(true) 呼び出し
  → performSync() 実行
  🔴 POST /pages/[id] (updatePageLinks)

[t≈11050ms]
  ✅ POST 成功、isSyncing: true → false
  → isSyncing state 変更
  → performSync 参照 변경
  → syncLinks 参照 변경
  → useEffect 依存配列トリガー

[t≈11100ms]
  → useEffect 再実行
  → syncLinks(false) 予約
  → setTimeout(performSync, 500ms)

[t≈11600ms]
  → setTimeout 実行
  → performSync() 実行
  🔴 POST /pages/[id] (2番目)

[t≈11700ms]
  ✅ POST 成功、isSyncing: false → true → false
  → useEffect トリガー
  🔁 ループ開始 (1回目と同じシーケンス)

[t≈12100ms以降]
  🔁 70-300ms間隔で無限に続く
```

### なぜ最初の POST から即座にループしないか

```typescript
// performSync の判定
if (isSyncing || !editor) {
  return; // 初回は false なのでスキップしない
}

// 処理後
setIsSyncing(false); // ← これが新しい state 値

// useEffect 依存配列に含まれる変数が再生成される流れ:
// isSyncing (false) → performSync 参照変更
//   → syncLinks 参照変更
//   → useEffect トリガー (依存配列の syncLinks 変更)
```

---

## 💡 修正の効果予測

### 修正前後の比較

#### ❌ 修正前（現在の状態）

```
[t=10950ms] POST 1 (初期同期)
[t=11050ms] useEffect 再トリガー
[t=11600ms] POST 2 (デバウンス後)
[t=11700ms] useEffect 再トリガー
[t≈12200ms] POST 3
[t≈12300ms] useEffect 再トリガー
... 無限に続く（500ms毎ではなく、200ms毎）
```

#### ✅ 修正後（修正案 1-3 を適用）

```
[t=10950ms] POST 1 (初期同期)
[t=11050ms] useEffect が再実行されない（依存配列から syncLinks を削除）
... (debounce 待機中、エディター更新なし)
[t=その後の編集時]
  エディター update → syncLinks(false)
  → debounce 500ms 待機
[t=500ms後] POST (エディター更新時のみ)
```

---

## 🔍 追加検証項目

このログ出力から確認できる項目：

- [ ] **POST 間隔の計測**: `70-300ms` が実際のデバウンス 500ms より短い → useEffect の高速な再実行が原因
- [ ] **最初の遅延**: `10925ms` でページ読み込み完了 → useEffect が正確に実行されていることを確認
- [ ] **応答時間**: すべて `200` で成功 → サーバー側は問題なし、クライアント側が問題
- [ ] **ループの加速度**: 最初は 242ms, 121ms と間隔が短くなる → キャッシュ効果により高速化

---

## 📝 修正後の期待動作

修正を適用したときのサーバーログの期待値：

```
GET /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 10925ms
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 139ms    ← 初期同期のみ
... (ここからは無限POSTなし)

(ユーザーがエディターで編集した場合)
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in XXms     ← エディター更新 + debounce後
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in XXms     ← ユーザーが別の編集をした場合
```

**ポイント**:

- 最初の `POST 200 in 139ms` の後、すぐに 2 番目の POST が出ない
- エディター操作がない場合、POST は送信されない
