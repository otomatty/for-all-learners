/**
 * Supabase Realtime listener for page creation events
 */

import type { RealtimeChannel } from "@supabase/supabase-js";
import { normalizeTitleToKey } from "./utils";

export interface RealtimePageEvent {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new?: {
    id: string;
    title: string;
    [key: string]: any;
  };
  old?: {
    id: string;
    title: string;
    [key: string]: any;
  };
}

export type RealtimePageHandler = (key: string, pageId: string) => void;

export class UnilinkRealtimeListener {
  private channel: RealtimeChannel | null = null;
  private handlers = new Set<RealtimePageHandler>();

  /**
   * Supabase Realtime チャンネルを設定
   */
  setupChannel(supabaseChannel: RealtimeChannel): void {
    this.channel = supabaseChannel;

    // pages テーブルの INSERT イベントを購読
    this.channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pages",
        },
        this.handlePageInsert.bind(this)
      )
      .subscribe();
  }

  /**
   * ページ作成イベントのハンドラを登録
   */
  onPageCreated(handler: RealtimePageHandler): () => void {
    this.handlers.add(handler);

    return () => {
      this.handlers.delete(handler);
    };
  }

  private handlePageInsert(payload: any): void {
    try {
      const newRecord = payload.new;
      if (!newRecord?.title || !newRecord?.id) {
        return;
      }

      const key = normalizeTitleToKey(newRecord.title);
      const pageId = newRecord.id;

      // 全ハンドラに通知
      this.handlers.forEach((handler) => {
        try {
          handler(key, pageId);
        } catch (error) {
          console.warn("Realtime handler error:", error);
        }
      });
    } catch (error) {
      console.warn("Failed to handle Realtime page insert:", error);
    }
  }

  /**
   * チャンネルを閉じてリソースを解放
   */
  close(): void {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.handlers.clear();
  }
}
