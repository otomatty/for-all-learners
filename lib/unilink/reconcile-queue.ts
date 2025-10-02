/**
 * ReconcileQueue - 同一キーの連続イベントを100msデバウンスして1回処理
 */

interface QueuedEvent {
  key: string;
  pageId?: string;
  timestamp: number;
}

type ReconcileHandler = (key: string, pageId?: string) => void;

export class ReconcileQueue {
  private queue = new Map<string, QueuedEvent>();
  private timeouts = new Map<string, NodeJS.Timeout>();
  private handler: ReconcileHandler;
  private debounceMs: number;

  constructor(handler: ReconcileHandler, debounceMs = 100) {
    this.handler = handler;
    this.debounceMs = debounceMs;
  }

  /**
   * キーの処理をキューに追加（重複は最新で上書き）
   */
  enqueue(key: string, pageId?: string): void {
    // 既存のタイマーをクリア
    const existingTimeout = this.timeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // 新しいイベントで上書き
    this.queue.set(key, {
      key,
      pageId,
      timestamp: Date.now(),
    });

    // デバウンスタイマー設定
    const timeout = setTimeout(() => {
      this.processKey(key);
    }, this.debounceMs);

    this.timeouts.set(key, timeout);
  }

  private processKey(key: string): void {
    const event = this.queue.get(key);
    if (!event) return;

    // キューとタイマーから削除
    this.queue.delete(key);
    this.timeouts.delete(key);

    // ハンドラ実行
    try {
      this.handler(event.key, event.pageId);
    } catch (error) {
      console.warn(`ReconcileQueue handler failed for key "${key}":`, error);
    }
  }

  /**
   * 全ての待機中処理をクリア
   */
  clear(): void {
    this.timeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.queue.clear();
    this.timeouts.clear();
  }

  /**
   * デバッグ用: 現在のキュー状態
   */
  getQueueSize(): number {
    return this.queue.size;
  }
}

/**
 * 飛行中の重複リクエスト抑制
 */
const inflightKeys = new Set<string>();

export function isKeyInflight(key: string): boolean {
  return inflightKeys.has(key);
}

export function setKeyInflight(key: string): void {
  inflightKeys.add(key);
}

export function clearKeyInflight(key: string): void {
  inflightKeys.delete(key);
}
