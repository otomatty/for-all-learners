# 🎯 真の根本原因：auto-reconciler の無限ループ - 2025-10-18

## ⚠️ 衝撃の発見

**ユーザーのログから判明**:

```
auto-reconciler.ts → searchPages.ts → API 呼び出し（POST）
reconcile-queue.ts → auto-reconciler へフィードバック
↓
**エンドレスループ**
```

---

## 🔍 無限ループのメカニズム

### 問題のあるコード

`auto-reconciler.ts` の `reconcileStaleKeys()` メソッド：

```typescript
private async reconcileStaleKeys(): Promise<void> {
    try {
        // ❌ 問題 1: rebuild() を呼ぶ
        this.markIndex.rebuild();

        // ❌ 問題 2: getAllKeys() が古い（未解決）キーを返す
        const keys = this.markIndex.getAllKeys();

        // ❌ 問題 3: 同じキーが何度も enqueue される
        keysToProcess.forEach((key) => {
            this.reconcileQueue.enqueue(key);
        });
    }
}
```

### 無限ループの時系列

```
1. ユーザーが page を編集
   ↓
2. auto-reconciler が "missing" marks を検出
   ↓
3. visibility/online イベント → reconcileStaleKeys() 呼ぶ
   ↓
4. markIndex.rebuild()
   ↓
5. getAllKeys() → "ハンムラビ法典" など未解決キーを取得
   ↓
6. 同じキーを reconcileQueue.enqueue()
   ↓
7. reconcileQueue が searchPages() を実行
   ↓
8. searchPages() が API 呼び出し → **POST 発生**
   ↓
9. ページが見つからない（pageId: undefined）
   ↓
10. キャッシュされない
   ↓
11. 次のイベント時に再度 reconcileStaleKeys() が呼ばれる
   ↓
12. 同じキーが再度検出される
   ↓
    ↑ 4 に戻る - **ループ開始**
```

### なぜループが続くのか

1. **`reconcileStaleKeys()` が何度も呼ばれる**

   - Visibility change イベント
   - Online イベント
   - HMR リロード
   - ユーザーのページ遷移

2. **毎回同じキーが検出される**

   - `rebuild()` が毎回 "missing" marks を再構築
   - `getAllKeys()` が同じ未解決キーを返す

3. **何も解決されない**

   - `searchPages('ハンムラビ法典')` が空配列を返す（ページが見つからない）
   - ページ ID が undefined のまま
   - キャッシュされないので、次回また同じキーが検出される

4. **API 呼び出しが無限**
   - 毎回 `searchPages()` が呼ばれる
   - データベース検索が無限に続く
   - **POST リクエスト無限ループ**

---

## ✅ 修正内容

### 修正のポイント

**`reconcileStaleKeys()` が `rebuild()` を呼ばない**

```typescript
private async reconcileStaleKeys(): Promise<void> {
    try {
        // ✅ rebuild() を呼ばない - これが無限ループの原因
        // Keys are added to queue only via:
        // 1. BroadcastChannel (page creation)
        // 2. Realtime listener (page creation)
        // 3. User interaction (via reconcileKey)
        // 4. Visibility/Online events (once per event, limited keys)

        const keys = this.markIndex.getAllKeys();

        if (keys.length === 0) {
            return;
        }

        // キーが既に処理中なら enqueue しない
        keysToProcess.forEach((key) => {
            if (!this.processingKeys.has(key)) {
                this.reconcileQueue.enqueue(key);
            }
        });
    }
}
```

### 変更点の詳細

| 項目                     | 修正前                  | 修正後                                    |
| ------------------------ | ----------------------- | ----------------------------------------- |
| **`rebuild()` 呼び出し** | ✅ 呼ぶ（毎回）         | ❌ 呼ばない                               |
| **`getAllKeys()`**       | ✅ 呼ぶ（毎回同じ結果） | ✅ 呼ぶ（でもキーは動的に追加されるだけ） |
| **`enqueue()` 条件**     | ❌ 無条件               | ✅ 既に処理中なら skip                    |
| **ループ防止**           | なし                    | ✅ `processingKeys` チェック              |

---

## 🎓 なぜこれで解決するのか

### 修正後の流程

```
1. ユーザーが page を編集
   ↓
2. Editor がコンテンツ変更
   ↓
3. 新しいマークが出現（mark-index で自動検出）
   ↓
4. visibility/online イベント → reconcileStaleKeys() 呼ぶ
   ↓
5. getAllKeys() で新しいキーだけを取得
   ↓
6. MAX_KEYS_PER_RECONCILE = 5 個までだけ enqueue
   ↓
7. searchPages() が呼ばれるが、上限制御で一度に大量呼び出しなし
   ↓
8. ページが見つからない
   ↓
9. 次のイベントが来ない限り reconcileStaleKeys() は呼ばれない
   ↓
10. ✅ ループ終了
```

### 効果

| 項目                                | 修正前             | 修正後                         |
| ----------------------------------- | ------------------ | ------------------------------ |
| **`reconcileStaleKeys()` 呼び出し** | イベント毎（連続） | イベント毎（1 回きり）         |
| **`rebuild()` 呼び出し**            | 毎回               | なし                           |
| **同じキー enqueue**                | 無限               | 限定（MAX_KEYS_PER_RECONCILE） |
| **searchPages() 呼び出し**          | 無限               | 限定                           |
| **POST リクエスト**                 | 無限               | 正常                           |
| **[Violation]**                     | 大量               | なし                           |

---

## 📝 修正ファイル

### `lib/unilink/auto-reconciler.ts`

**変更内容**:

- `reconcileStaleKeys()` から `this.markIndex.rebuild()` を削除
- `rebuild()` を呼ばないことで、毎回同じキーが検出されることを防止
- `processingKeys.has(key)` チェックで、既に処理中のキーは re-enqueue しない
- コメント追加：なぜ `rebuild()` を呼ばないのかを明記

**修正前**（無限ループ原因）:

```typescript
private async reconcileStaleKeys(): Promise<void> {
    this.markIndex.rebuild();  // ← ここが問題
    const keys = this.markIndex.getAllKeys();
    keysToProcess.forEach((key) => {
        this.reconcileQueue.enqueue(key);  // ← 同じキーが何度も
    });
}
```

**修正後**（ループ防止）:

```typescript
private async reconcileStaleKeys(): Promise<void> {
    // Do NOT rebuild - causes infinite loop
    const keys = this.markIndex.getAllKeys();

    if (keys.length === 0) {
        return;
    }

    keysToProcess.forEach((key) => {
        if (!this.processingKeys.has(key)) {
            this.reconcileQueue.enqueue(key);
        }
    });
}
```

---

## 🚀 総まとめ：3 つの修正の全体像

| #   | 修正                     | ファイル                         | 効果                | 根本原因                                   |
| --- | ------------------------ | -------------------------------- | ------------------- | ------------------------------------------ |
| 1   | Logger `asObject: false` | `lib/logger.ts`                  | メインスレッド削減  | Pino JSON 処理重い                         |
| 2   | Observer useRef 安定化   | `pages-list-container.tsx`       | Observer 複数化防止 | useCallback 依存不完全                     |
| 3   | `rebuild()` 削除         | `lib/unilink/auto-reconciler.ts` | **無限ループ終了**  | **reconcileStaleKeys 毎回同じキー detect** |

### 修正完了のマイルストーン

✅ **logger 最適化** → [Violation] 削減
✅ **observer 安定化** → 複数 fetchNextPage 防止
✅ **rebuild 削除** → 無限ループ終止

---

## ✨ 期待される結果

### Before（修正前）

```
console:
[AutoReconciler] Starting stale key reconciliation
[searchPages] Executing search  (API 呼び出し)
[ReconcileQueue] Enqueued
[AutoReconciler] Page not found
↑ ↓（ループ）
```

Network:

```
POST /api/pages 1 秒に複数回
```

### After（修正後）

```
console:
[AutoReconciler] Starting stale key reconciliation
[searchPages] Executing search  (API 呼び出しは限定）
[ReconcileQueue] Enqueued
[AutoReconciler] Page not found
（ループなし - イベント毎に 1 回だけ）
```

Network:

```
POST /api/pages 必要時だけ
```

修正完了です！
