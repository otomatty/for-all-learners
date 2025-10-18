# 無限 POST ループ - 真の原因発見: ReconcileQueue と searchPages - 2025-10-18

## 🔴 新しい根本原因の発見

ブラウザのコンソールログ分析から、**無限 POST の本当の原因** が判明しました。

---

## 問題の構造

### ステップバイステップ分析

```
1. エディタが更新される
   ↓
2. [ReconcileQueue] Enqueued x 4
   ├─ 'アメリカ合衆国' (pageId: undefined)
   ├─ '清教徒' (pageId: undefined)
   ├─ 'トーマス・ジェファーソン' (pageId: undefined)
   └─ '涙の道' (pageId: undefined)

   ↓ 100ms デバウンス

3. [ReconcileQueue] Processed key
   └─ auto-reconciler.ts で handleReconcile() 呼び出し
      └─ searchPages(key) 呼び出し
         └─ API POST リクエスト送信 🚨

4. [MarkIndex] Index rebuilt
   └─ マークのインデックスが再構築

5. [ReconcileQueue] Enqueued x 4 (再度)
   └─ インデックス再構築により、再度キューイング?

   ↓
6. ステップ 3 に戻る → 無限ループ
```

---

## 問題のコード

### auto-reconciler.ts の handleReconcile()

```typescript
private async handleReconcile(key: string, pageId?: string): Promise<void> {
    try {
        // キャッシュチェック
        const cached = getCachedPageId(key);
        if (cached) {
            this.markIndex.rebuild();  // ❌ ここで rebuild が呼ばれる
            this.markIndex.updateToExists(key, cached);
            return;
        }

        // pageIdが提供されていない場合は検索
        let resolvedPageId = pageId;
        if (!resolvedPageId) {
            const results = await searchPages(key);  // 🔴 API POST が発生
            if (results && results.length > 0) {
                // 検索結果の処理...
            }
        }

        // キャッシュに保存
        setCachedPageId(key, resolvedPageId);

        // ❌ ここでも rebuild が呼ばれる
        this.markIndex.rebuild();
    } catch (error) {
        logger.error({ key, error }, "[AutoReconciler] Failed to reconcile");
    }
}
```

### 問題点

1. **markIndex.rebuild() が複数回呼ばれる**

   - キャッシュヒット時に 1 回
   - 検索完了後に 1 回

2. **searchPages() の重複呼び出し**

   - 同じキーに対して何度も呼ばれる可能性
   - reconcileQueue のデバウンス（100ms）では対応不足

3. **mark-index の変更が再度 reconcile をトリガーしないか?**
   - MarkIndex の変更をリッスンしている何かがある?

---

## reconcileStaleKeys() の問題

```typescript
private async reconcileStaleKeys(): Promise<void> {
    try {
        // MarkIndexを再構築
        this.markIndex.rebuild();

        // 全てのmissing keyを取得
        const keys = this.markIndex.getAllKeys();

        // 各keyを個別にキューに追加（デバウンスされる）
        keys.forEach((key) => {
            this.reconcileQueue.enqueue(key);
        });
    } catch (error) {
        // ...
    }
}
```

**問題**:

- Visibility change や Online イベント時に `reconcileStaleKeys()` が呼ばれる
- これが全ての missing キーに対して reconcile を発動
- 複数の searchPages() API 呼び出しが同時に発生

---

## ブラウザログの解釈

```
page-cache-preloader.ts:81
  {count: 1000} '[PageCachePreloader] Preloaded page titles'

reconcile-queue.ts:86 (複数回)
  {key: 'アメリカ合衆国', pageId: undefined, queueSize: 1}
  {key: '清教徒', pageId: undefined, queueSize: 2}
  {key: 'トーマス・ジェファーソン', pageId: undefined, queueSize: 3}
  {key: '涙の道', pageId: undefined, queueSize: 4}

reconcile-queue.ts:50 (複数回)
  {key: 'アメリカ合衆国', msg: '[ReconcileQueue] Processed key'}
  → searchPages('アメリカ合衆国') 呼び出し
  → API POST: /api/pages/search (または同等)
```

---

## 修正案

### 修正 A: searchPages のキャッシング強化

```typescript
private async handleReconcile(key: string, pageId?: string): Promise<void> {
    try {
        // キャッシュチェック（強化版）
        const cached = getCachedPageId(key);
        if (cached) {
            logger.debug({ key, cachedPageId: cached },
                "[AutoReconciler] Using cached page ID");
            this.markIndex.updateToExists(key, cached);
            // ❌ rebuild を呼ばない
            return;
        }

        // 同じキーが処理中であればスキップ
        // (processingKeysSet に key が含まれていればスキップ)
        if (this.processingKeys.has(key)) {
            logger.debug({ key }, "[AutoReconciler] Already processing this key");
            return;
        }

        this.processingKeys.add(key);

        try {
            // pageIdが提供されていない場合は検索
            let resolvedPageId = pageId;
            if (!resolvedPageId) {
                logger.debug({ key }, "[AutoReconciler] Searching for page");
                const results = await searchPages(key);
                if (results && results.length > 0) {
                    const exactMatch = results.find(
                        (page) => page.title.toLowerCase() === key.toLowerCase(),
                    );
                    resolvedPageId = exactMatch ? exactMatch.id : results[0].id;
                }
            }

            if (!resolvedPageId) {
                logger.debug({ key }, "[AutoReconciler] Page not found");
                return;
            }

            // キャッシュに保存
            setCachedPageId(key, resolvedPageId);

            // rebuild の回数を最小化
            this.markIndex.updateToExists(key, resolvedPageId);
            logger.debug({ key, pageId: resolvedPageId },
                "[AutoReconciler] Resolved page ID");
        } finally {
            this.processingKeys.delete(key);
        }
    } catch (error) {
        logger.error({ key, error }, "[AutoReconciler] Failed to reconcile");
    }
}
```

### 修正 B: rebuild の最適化

```typescript
// rebuild の過剰な呼び出しを削減
// - 必ず必要な場合だけ呼ぶ
// - 複数の更新をバッチ処理

private async handleReconcile(key: string, pageId?: string): Promise<void> {
    // ... (修正 A と同じ前処理)

    // rebuild ではなく、個別の更新を行う
    if (cachedPageId) {
        this.markIndex.updateToExists(key, cachedPageId);
        // rebuild() を呼ばない
        return;
    }

    // ... (検索処理)

    // 最後に 1 回だけ rebuild する（またはバッチ更新）
    this.markIndex.updateToExists(key, resolvedPageId);
    // rebuild() を呼ばない
}
```

### 修正 C: reconcileStaleKeys() の改善

```typescript
private async reconcileStaleKeys(): Promise<void> {
    try {
        // 全てのmissing keyを取得（rebuild は 1 回だけ）
        this.markIndex.rebuild();
        const keys = this.markIndex.getAllKeys();

        logger.debug({ keyCount: keys.length },
            "[AutoReconciler] Starting stale key reconciliation");

        // 限定された数だけ処理（例: 最初の 5 つまで）
        const keysToProcess = keys.slice(0, 5);

        // 各keyを個別にキューに追加
        keysToProcess.forEach((key) => {
            this.reconcileQueue.enqueue(key);
        });

        // 残りはスケジュール
        if (keys.length > 5) {
            logger.debug({ remaining: keys.length - 5 },
                "[AutoReconciler] Queuing remaining keys");
            // 別のタイムアウトで処理
        }
    } catch (error) {
        logger.error({ error },
            "[AutoReconciler] Failed to reconcile stale keys");
    }
}
```

---

## 期待される改善

### 修正前

```
t=0s:  reconcile start → searchPages() → 複数 API 呼び出し
t=100ms: mark-index rebuild → さらに reconcile トリガー
t=200ms: さらに API 呼び出し
...    無限ループ
```

### 修正後

```
t=0s:  reconcile start
       → キャッシュヒット?
       → YES: updateToExists() だけ（API 呼ばない）
       → rebuild() 呼ばない
t=100ms: 次の reconcile（最小 1 回）
       → キャッシュヒット（既に計算済み）
       → API 呼ばない
t=200ms: ループなし
```

---

## 問題の根本原因

**updatePage との関連性**:

- `updatePage` が呼ばれる → ページ内容が更新される
- → mark-index が無効化される（可能性）
- → mark-index.rebuild() が自動で呼ばれる（もしくは手動で呼ばれる）
- → missing mark が再度検出される
- → reconcile が再度キューイングされる
- → searchPages() が何度も呼ばれる

実は、`updatePage` の修正では解決できない構造になっていました。

---

## 次のステップ

1. **auto-reconciler.ts を修正 A で改善**
2. **searchPages のログを追加** - API 呼び出しの頻度を測定
3. **mark-index の rebuild タイミングを調査** - いつ rebuild が呼ばれているか
4. **ブラウザで再度テスト** - POST リクエストが制限されるか確認
