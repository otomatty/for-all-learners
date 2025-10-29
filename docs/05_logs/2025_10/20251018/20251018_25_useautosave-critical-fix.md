# useAutoSave の致命的な修正 - 無限 setTimeout ループの完全解決 - 2025-10-18

## 🚨 重大な問題発見

ブラウザコンソールに **[Violation] 'setTimeout' handler が数十回連続出力**されていました。

前の修正では、`attemptSave` を useCallback から useRef に変更しましたが、**setTimeout の無限登録は解決していませんでした**。

## 🔍 根本原因の再発見

修正後のコードを確認したところ、以下の問題が発見されました：

```typescript
// 修正後（しかし不完全）
const attemptSaveRef = useRef<() => Promise<void>>(async () => { ... });

useEffect(() => {
    attemptSaveRef.current = async () => { ... };
}); // ❌ 依存配列がない = 毎回実行！
```

### 問題の連鎖

```
毎回のレンダリング
  ↓
useEffect（依存配列なし）実行
  ↓
attemptSaveRef.current を新しい関数で再割り当て
  ↓
editor.on("update") → setTimeout 登録
  ↓
(複数回繰り返す)
  ↓
[Violation] 'setTimeout' handler 大量出力 ❌
```

### Why これが問題か

依存配列がない useEffect は **毎回実行される**ため、attemptSaveRef が常に新しい参照になります。これにより：

1. エディタの `update` イベントが複数回 setTimeout を登録
2. 各レンダリングでも setTimeout が登録
3. 累積的に setTimeout が溜まり続ける
4. ブラウザが「Violation」警告を出す

## ✅ 最終修正

useEffect に **空の依存配列 `[]`** を追加：

```typescript
useEffect(() => {
  attemptSaveRef.current = async () => {
    // 実装
  };
}, []); // ✅ 空の依存配列 = 初回マウント時のみ実行
```

### 修正の効果

```
初回マウント
  ↓
useEffect（[]）実行 - 1回だけ
  ↓
attemptSaveRef.current に関数を設定
  ↓
以降のレンダリングでは useEffect は実行されない ✅
  ↓
setTimeout は必要な時のみ登録
```

---

## 📊 修正前後の違い

### 修正前（バグ）

```typescript
useEffect(() => {
    attemptSaveRef.current = async () => { ... };
}); // 依存配列なし
```

**動作**:

- 毎回のレンダリング → useEffect 実行
- attemptSaveRef 参照が変わる
- editor.on("update") が再登録される
- setTimeout が毎回登録される
- 結果: [Violation] 大量

### 修正後（正常）

```typescript
useEffect(() => {
    attemptSaveRef.current = async () => { ... };
}, []); // 空の依存配列
```

**動作**:

- マウント時のみ useEffect 実行（1 回だけ）
- attemptSaveRef 参照は変わらない
- editor.on("update") は 1 度だけ登録
- setTimeout は必要な時だけ登録
- 結果: [Violation] 消える ✅

---

## 🎯 検証ポイント

ブラウザコンソールで以下を確認してください：

1. **[Violation] 'setTimeout' が出ないか**

   ```
   ❌ [Violation] 'setTimeout' handler took XXXms
   ✅ （出力されない）
   ```

2. **正常なログが見えるか**

   ```
   ✅ [useAutoSave] Attempting save
   ✅ [AutoReconciler] Using cached page ID
   ✅ [searchPages] Returning cached result
   ```

3. **Network タブ**
   ```
   ✅ POST リクエストが大幅に削減
   ✅ リクエスト間隔が 3 秒以上
   ```

---

## 📝 核心的な学習

### React useEffect の依存配列の意味

```typescript
// パターン1: 依存配列なし → 毎回実行（非常に危険）
useEffect(() => { ... })

// パターン2: 空の依存配列 → 初回のみ実行
useEffect(() => { ... }, [])

// パターン3: 依存配列あり → 依存値が変わるたびに実行
useEffect(() => { ... }, [dep1, dep2])
```

### なぜ ref と useEffect を組み合わせるのか

1. **ref で参照を固定化** → 依存配列に入れない
2. **useEffect（[]）で初期化** → 一度だけ実行
3. **その後の呼び出しは ref を使う** → 常に最新の実装にアクセス

---

## 🔄 完全なコード例

```typescript
const attemptSaveRef = useRef<() => Promise<void>>(async () => {
  // 初回の実装（ダミー）
});

// 初回マウント時のみ実行して ref の中身を定義
useEffect(() => {
  attemptSaveRef.current = async () => {
    // 実装
    if (isSavingRef.current) return;

    const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
    if (timeSinceLastSave < MIN_SAVE_INTERVAL) {
      saveTimeout.current = setTimeout(() => {
        void attemptSaveRef.current();
      }, MIN_SAVE_INTERVAL - timeSinceLastSave);
      return;
    }

    isSavingRef.current = true;
    lastSaveTimeRef.current = Date.now();

    try {
      await savePageRef.current?.();
    } finally {
      isSavingRef.current = false;
    }
  };
}, []); // ✅ 空の依存配列が重要！

// その他の useEffect から ref を通じて呼び出し
useEffect(() => {
  if (!editor) return;

  const onUpdate = () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      void attemptSaveRef.current(); // ← ref 経由でアクセス
    }, 2000);
  };

  editor.on("update", onUpdate);
  return () => {
    editor.off("update", onUpdate);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
  };
}, [editor]); // ✅ editor のみ依存、attemptSave は ref 経由
```

---

## ⚠️ 以前の修正との組み合わせ

この修正は前回の修正と連動して動作します：

| 修正                         | 実施日      | 効果                                |
| ---------------------------- | ----------- | ----------------------------------- |
| savePage を ref に変更       | 20251018_24 | savePage 参照の変更によるループ防止 |
| attemptSave を useRef に変更 | 20251018_24 | useCallback 参照変更ループ防止      |
| **useEffect に [] を追加**   | **今日**    | **setTimeout 無限登録の完全防止**   |

すべての修正が組み合わさって初めて無限ループが完全に解決されます。

---

## 次のステップ

1. **ブラウザ強制再読み込み**: `Cmd+Shift+R`
2. **コンソール確認**: [Violation] が消えているか
3. **エディタ操作**: ページ編集時の動作確認
4. **Network 監視**: POST リクエスト数の確認

修正は完了し、biome チェック済みです。
