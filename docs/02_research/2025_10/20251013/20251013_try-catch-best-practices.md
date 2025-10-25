# try-catch Best Practices in TypeScript

## 作成日

2025-10-13

## 概要

TypeScript/JavaScript におけるエラーハンドリング（try-catch）のベストプラクティスをまとめたドキュメント。適切な使用方法、避けるべきパターン、推奨される戦略を解説する。

## 背景

Unified Link Migration プロジェクトのリファクタリング中に、エラーハンドリングの一貫性と品質について議論が発生。プロジェクト全体での統一的なアプローチを確立するため、知見をドキュメント化する。

---

## 1. try-catch を使うべきケース

### 1.1 外部リソースへのアクセス

外部API、データベース、ファイルシステムなど、制御できない外部リソースへのアクセスは失敗する可能性が常にある。

```typescript
// ✅ 良い例: API呼び出し
async function searchPages(query: string): Promise<Page[]> {
  try {
    const response = await fetch(`/api/pages?q=${query}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    logger.error({ query, error }, "Failed to search pages");
    // フォールバック: キャッシュから返すなど
    return getCachedPages(query) ?? [];
  }
}
```

**理由**: ネットワークの問題、サーバーエラー、タイムアウトなど予測不可能な失敗に対処する必要がある。

### 1.2 ユーザー操作の失敗を許容する必要がある場合

一部の処理が失敗しても、全体の処理を継続すべき場合。

```typescript
// ✅ 良い例: 複数マークの一括更新
function updateMarks(positions: MarkPosition[]): number {
  let successCount = 0;
  
  positions.forEach((position) => {
    try {
      tr.removeMark(position.from, position.to, markType);
      tr.addMark(position.from, position.to, markType.create(newAttrs));
      successCount++;
    } catch (error) {
      logger.warn(
        { position, error }, 
        "Failed to update mark, continuing with others"
      );
      // このマークは失敗しても、他のマークの処理は継続
    }
  });
  
  return successCount;
}
```

**理由**: 1つのマークの更新失敗で全体を停止すると、ユーザー体験が悪化する。

### 1.3 サードパーティライブラリの使用

完全に制御できないサードパーティコードの呼び出し。

```typescript
// ✅ 良い例: BroadcastChannel の利用
function broadcastPageCreated(key: string, pageId: string): boolean {
  try {
    channel.postMessage({ key, pageId, timestamp: Date.now() });
    return true;
  } catch (error) {
    logger.warn(
      { key, pageId, error }, 
      "Failed to broadcast message, other tabs may not sync"
    );
    return false;
  }
}
```

**理由**: ライブラリの内部実装やブラウザ互換性の問題に対処する必要がある。

### 1.4 データのパース・変換

外部から受け取ったデータの妥当性が保証されていない場合。

```typescript
// ✅ 良い例: JSONパース
function parseConfig(jsonString: string): Config | null {
  try {
    const data = JSON.parse(jsonString);
    return validateConfig(data) ? data : null;
  } catch (error) {
    logger.error({ jsonString, error }, "Failed to parse config");
    return null;
  }
}
```

**理由**: 不正なデータフォーマットでアプリケーションがクラッシュするのを防ぐ。

### 1.5 リソースのクリーンアップが必要な場合

finallyブロックでリソースを確実に解放する必要がある場合。

```typescript
// ✅ 良い例: リソース管理
async function processFile(filePath: string): Promise<void> {
  let file: FileHandle | null = null;
  
  try {
    file = await fs.open(filePath, 'r');
    const data = await file.readFile();
    await processData(data);
  } catch (error) {
    logger.error({ filePath, error }, "Failed to process file");
    throw error;
  } finally {
    // エラーの有無に関わらず、必ずファイルを閉じる
    if (file) {
      await file.close();
    }
  }
}
```

**理由**: メモリリーク、ファイルハンドルのリーク、接続の開きっぱなしを防ぐ。

---

## 2. try-catch を避けるべきケース

### 2.1 プログラミングエラー（バグ）

コードのロジックエラーやバグを隠蔽してはいけない。

```typescript
// ❌ 悪い例: nullチェックをtry-catchで代用
function getUserName(user: User | null): string {
  try {
    return user.name; // userがnullの場合にエラー
  } catch {
    return "Unknown"; // バグを隠蔽している
  }
}

// ✅ 良い例: 事前条件チェック
function getUserName(user: User | null): string {
  if (!user) {
    logger.error("getUserName called with null user");
    throw new Error("User cannot be null");
  }
  return user.name;
}

// または
function getUserName(user: User | null): string {
  return user?.name ?? "Unknown";
}
```

**理由**: バグは早期に発見して修正すべき。try-catchで隠蔽すると、問題の特定が困難になる。

### 2.2 フロー制御

try-catchを通常のif-else代わりに使用してはいけない。

```typescript
// ❌ 悪い例: 例外をフロー制御に使用
function findUser(id: string): User {
  try {
    return users.find(u => u.id === id);
  } catch {
    return createDefaultUser();
  }
}

// ✅ 良い例: 通常のif文
function findUser(id: string): User {
  const user = users.find(u => u.id === id);
  return user ?? createDefaultUser();
}
```

**理由**: 例外は例外的な状況のためのもの。通常のフロー制御に使うとパフォーマンスが悪化し、コードの意図が不明確になる。

### 2.3 エラーの握りつぶし

エラーを捕捉するだけで何もしない。

```typescript
// ❌ 悪い例: エラーを無視
async function saveData(data: Data): Promise<void> {
  try {
    await database.save(data);
  } catch {
    // 何もしない = データが保存されたかどうか不明
  }
}

// ✅ 良い例: エラーを適切に処理
async function saveData(data: Data): Promise<void> {
  try {
    await database.save(data);
  } catch (error) {
    logger.error({ data, error }, "Failed to save data");
    // 1. ユーザーに通知
    notifyUser("データの保存に失敗しました");
    // 2. エラーを再スロー（上位で処理が必要な場合）
    throw new DatabaseError("Failed to save data", { cause: error });
  }
}
```

**理由**: サイレントな失敗は最悪のバグ。エラーが発生したことすら気づけない。

### 2.4 過度に広範囲なcatch

大きなコードブロックを丸ごとtry-catchで囲む。

```typescript
// ❌ 悪い例: 広範囲すぎるcatch
async function processUserData(): Promise<void> {
  try {
    const user = await fetchUser();
    const profile = buildProfile(user);
    const settings = loadSettings();
    await saveProfile(profile);
    await updateSettings(settings);
    sendNotification(user);
  } catch (error) {
    // どの処理が失敗したのか不明
    logger.error(error);
  }
}

// ✅ 良い例: 失敗する可能性がある箇所だけ保護
async function processUserData(): Promise<void> {
  const user = await fetchUser(); // この関数内でエラーハンドリング
  const profile = buildProfile(user); // 純粋関数、失敗しない
  const settings = loadSettings(); // この関数内でエラーハンドリング
  
  await saveProfile(profile); // この関数内でエラーハンドリング
  await updateSettings(settings); // この関数内でエラーハンドリング
  
  try {
    sendNotification(user);
  } catch (error) {
    // 通知失敗は致命的ではない
    logger.warn({ user, error }, "Failed to send notification");
  }
}
```

**理由**: エラーの原因特定が困難になる。適切な粒度でエラーハンドリングすべき。

---

## 3. 推奨されるエラーハンドリング戦略

### 3.1 カスタムエラークラスの使用

```typescript
// エラーの分類と型安全性
export class ReconcileError extends Error {
  constructor(
    message: string,
    public readonly key: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "ReconcileError";
    Error.captureStackTrace?.(this, ReconcileError);
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

// 使用例
try {
  await reconcileKey(key);
} catch (error) {
  if (error instanceof ReconcileError) {
    // Reconcile固有のエラーハンドリング
    logger.warn({ key: error.key }, "Reconcile failed, will retry later");
  } else if (error instanceof NetworkError) {
    // ネットワークエラーのハンドリング
    if (error.statusCode >= 500) {
      // サーバーエラーはリトライ
      await retryOperation();
    }
  } else {
    // 予期しないエラー
    logger.error({ error }, "Unexpected error");
    throw error;
  }
}
```

### 3.2 構造化ログの活用

```typescript
// エラーコンテキストを豊富に記録
try {
  await updateMark(key, pageId);
} catch (error) {
  logger.error(
    {
      key,
      pageId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        editorState: editor.state.doc.toString().slice(0, 100),
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      },
    },
    "Failed to update mark"
  );
}
```

### 3.3 エラーバウンダリパターン

```typescript
// 関数ベースのエラーバウンダリ
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

async function safeExecute<T>(
  fn: () => Promise<T>,
  context: Record<string, unknown>
): Promise<Result<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    logger.error({ ...context, error }, "Operation failed");
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

// 使用例
const result = await safeExecute(
  () => searchPages(query),
  { operation: "searchPages", query }
);

if (result.success) {
  processPages(result.data);
} else {
  showError(result.error.message);
}
```

### 3.4 リトライロジック

```typescript
// 指数バックオフでリトライ
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries - 1 || !shouldRetry(lastError)) {
        throw lastError;
      }

      const delay = Math.min(
        initialDelay * Math.pow(2, attempt),
        maxDelay
      );

      logger.warn(
        { attempt: attempt + 1, maxRetries, delay, error: lastError },
        "Retrying after error"
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// 使用例
const data = await retryWithBackoff(
  () => fetch('/api/data').then(r => r.json()),
  {
    maxRetries: 3,
    shouldRetry: (error) => {
      // ネットワークエラーやサーバーエラーのみリトライ
      return error instanceof NetworkError && error.statusCode >= 500;
    },
  }
);
```

### 3.5 Promise.allSettled の活用

複数の非同期処理を並行実行し、一部が失敗しても全体を継続。

```typescript
// 複数のキーを並行して再解決
async function reconcileMultipleKeys(keys: string[]): Promise<void> {
  const results = await Promise.allSettled(
    keys.map(key => reconcileKey(key))
  );

  const failures = results.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected"
  );

  if (failures.length > 0) {
    logger.warn(
      { 
        total: keys.length, 
        failures: failures.length,
        errors: failures.map(f => f.reason),
      },
      "Some reconciliations failed"
    );
  }

  const successes = results.filter(
    (r): r is PromiseFulfilledResult<void> => r.status === "fulfilled"
  );

  logger.info(
    { total: keys.length, successes: successes.length },
    "Reconciliation batch completed"
  );
}
```

---

## 4. プロジェクト固有のガイドライン

### 4.1 Unified Link における原則

1. **ユーザー体験を優先**: 一部のリンク解決失敗でエディタ全体を停止しない
2. **詳細なログ**: エラー時は key, pageId, エディタ状態をログに含める
3. **グレースフルデグラデーション**: エラー時はフォールバック動作を提供

```typescript
// Unified Link のエラーハンドリング例
async function handleReconcile(key: string, pageId?: string): Promise<void> {
  try {
    // 1. キャッシュチェック
    const cached = getCachedPageId(key);
    if (cached) {
      markIndex.updateToExists(key, cached);
      logger.debug({ key, pageId: cached }, "Used cached pageId");
      return;
    }

    // 2. ページ検索
    let resolvedPageId = pageId;
    if (!resolvedPageId) {
      const results = await searchPages(key);
      resolvedPageId = results[0]?.id;
    }

    if (!resolvedPageId) {
      logger.debug({ key }, "No page found for key");
      return; // エラーではない: ページが存在しないだけ
    }

    // 3. マーク更新
    setCachedPageId(key, resolvedPageId);
    markIndex.updateToExists(key, resolvedPageId);
    
    logger.info({ key, pageId: resolvedPageId }, "Reconciled key");
  } catch (error) {
    // 予期しないエラーのみキャッチ
    logger.error(
      { 
        key, 
        pageId, 
        error,
        stack: error instanceof Error ? error.stack : undefined,
      }, 
      "Failed to reconcile key"
    );
    // エラーを再スローせず、他のキーの処理は継続
  }
}
```

### 4.2 Logger の使い分け

```typescript
// DEBUG: 開発時のデバッグ情報
logger.debug({ key, cached }, "Cache hit");

// INFO: 正常な重要イベント
logger.info({ key, pageId }, "Page reconciled successfully");

// WARN: 回復可能なエラー、予期される失敗
logger.warn({ key, error }, "Failed to broadcast, other tabs won't sync");

// ERROR: 予期しないエラー、要調査
logger.error({ key, error, context }, "Unexpected error in reconciliation");
```

---

## 5. チェックリスト

エラーハンドリングを実装する際のチェックリスト:

- [ ] エラーが予期されるものか、プログラミングエラーか区別したか？
- [ ] エラーメッセージは問題の特定に十分な情報を含むか？
- [ ] エラーコンテキスト（関連する変数、状態）をログに記録したか？
- [ ] エラー時のフォールバック動作を定義したか？
- [ ] ユーザーへの通知が必要な場合、適切に実装したか？
- [ ] リソースのクリーンアップは finally で確実に行われるか？
- [ ] エラーを握りつぶしていないか？
- [ ] try-catch の範囲は適切か？（広すぎず、狭すぎず）
- [ ] カスタムエラークラスを使用して型安全性を確保したか？
- [ ] テストでエラーケースをカバーしたか？

---

## 6. 参考資料

- [MDN - Error handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)
- [The Error Handling Manifesto](https://www.joyent.com/node-js/production/design/errors)
- [TypeScript Deep Dive - Exception Handling](https://basarat.gitbook.io/typescript/type-system/exceptions)
- Node.js Best Practices - Error Handling

---

## 7. 関連ドキュメント

- [AI 駆動開発 共通ガイドライン](../../.github/copilot-instructions.md) - エラーハンドリングの基本原則
- [Unified Link 実装計画](../04_implementation/plans/unified-link-mark/)
- [Logger 実装仕様](../03_design/specifications/) (TODO: 作成予定)

---

## 更新履歴

- 2025-10-13: 初版作成
