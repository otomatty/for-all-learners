# デバッグログ削除と呼び出し追跡 - 2025-10-18

## 削除したログ

### `page-cache-preloader.ts`

- ✅ `[PageCachePreloader] Starting preload` - debug ログ
- ✅ `[PageCachePreloader] Query built, executing...` - debug ログ
- ✅ `[PageCachePreloader] Query completed` - debug ログ
- ✅ `[PageCachePreloader] No pages found` - debug ログ

### `lib/unilink/utils.ts`

- ✅ `[normalizeTitleToKey] Title normalized` - 1000 ページごとに出力される debug ログ
- ✅ `[Cache] Loaded from SessionStorage` - debug ログ
- ✅ `[Cache] Saved to SessionStorage` - debug ログ
- ✅ `[Cache] Entry expired and removed` - debug ログ
- ✅ `[Cache] Hit` - debug ログ
- ✅ `[Cache] Entry set` - debug ログ
- ✅ `[Cache] Bulk entries set` - debug ログ

## 残されたログ

✅ **重要なログのみ残した**:

- `logger.info()` - preload 成功時（呼び出し回数追跡用）
- `logger.error()` - エラー時（必須）
- `logger.warn()` - 警告時（必須）

## 追加した機能

### 呼び出し回数トレーサー

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

**目的**:

- `preloadPageTitles()` が何回呼び出されているか正確に把握
- ブラウザコンソールで確認可能
- 複数回呼び出しが発生している場合、`callCount: 1, 2, 3...` で明確に記録される

## 修正ファイル

- ✅ `lib/unilink/page-cache-preloader.ts`
- ✅ `lib/unilink/utils.ts`

## テスト方法

ページを読み込んで、ブラウザコンソールで以下を確認：

```
[PageCachePreloader] preloadPageTitles called {callCount: 1, userId: 'xxx'}
```

**複数回呼び出しされている場合**:

```
[PageCachePreloader] preloadPageTitles called {callCount: 1, userId: 'xxx'}
[PageCachePreloader] preloadPageTitles called {callCount: 2, userId: 'xxx'}  ← 無限ループ
[PageCachePreloader] preloadPageTitles called {callCount: 3, userId: 'xxx'}
...
```

## ステータス

✅ デバッグログ削除完了
⏳ テスト待ち
