/**
 * BroadcastChannel wrapper for unilink page creation events
 */

const CHANNEL_NAME = "unilink-page-created";

export interface PageCreatedMessage {
  v: 1; // version
  key: string;
  pageId: string;
  timestamp?: number;
}

export type PageCreatedHandler = (message: PageCreatedMessage) => void;

export class UnilinkBroadcastChannel {
  private channel: BroadcastChannel | null = null;
  private handlers = new Set<PageCreatedHandler>();

  constructor() {
    // BroadcastChannel がサポートされているかcheck
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.addEventListener("message", this.handleMessage.bind(this));
    }
  }

  /**
   * ページ作成イベントを送信
   */
  emitPageCreated(key: string, pageId: string): void {
    if (!this.channel) return;

    const message: PageCreatedMessage = {
      v: 1,
      key,
      pageId,
      timestamp: Date.now(),
    };

    try {
      this.channel.postMessage(message);
    } catch (error) {
      console.warn("Failed to broadcast page creation:", error);
    }
  }

  /**
   * ページ作成イベントのハンドラを登録
   */
  onPageCreated(handler: PageCreatedHandler): () => void {
    this.handlers.add(handler);

    // アンサブスクライブ関数を返す
    return () => {
      this.handlers.delete(handler);
    };
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = event.data as PageCreatedMessage;

      // バージョンチェック
      if (message.v !== 1) {
        console.warn("Unknown message version:", message.v);
        return;
      }

      // 必須フィールドチェック
      if (!message.key || !message.pageId) {
        console.warn("Invalid message format:", message);
        return;
      }

      // 全ハンドラに通知
      this.handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.warn("BroadcastChannel handler error:", error);
        }
      });
    } catch (error) {
      console.warn("Failed to parse broadcast message:", error);
    }
  }

  /**
   * チャネルを閉じてリソースを解放
   */
  close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.handlers.clear();
  }

  /**
   * サポート状況を確認
   */
  isSupported(): boolean {
    return this.channel !== null;
  }
}
