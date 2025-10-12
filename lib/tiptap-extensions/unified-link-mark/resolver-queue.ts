/**
 * UnifiedLinkMark resolver queue
 * Manages page resolution processing with batching and retry logic
 */

import type { ResolverQueueItem, SearchResult } from "./types";
import { searchPages } from "../../utils/searchPages";
import {
  normalizeTitleToKey,
  getCachedPageId,
  setCachedPageId,
} from "../../unilink";
import { RESOLVER_CONFIG } from "./config";
import { updateMarkState } from "./state-manager";
import {
  markPending,
  markResolved,
  markMissing,
} from "../../metrics/pageLinkMetrics";
import {
  markUnifiedPending,
  markUnifiedResolved,
  markUnifiedMissing,
  markUnifiedError,
  markUnifiedCacheHit,
} from "../../unilink/metrics";

/**
 * Resolver queue singleton class
 * Handles batched processing of page resolution requests
 */
class ResolverQueue {
  private queue: ResolverQueueItem[] = [];
  private isRunning = false;

  /**
   * Add an item to the queue
   */
  add(item: ResolverQueueItem): void {
    this.queue.push(item);
  }

  /**
   * Process the queue in batches
   */
  async process(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, RESOLVER_CONFIG.batchSize);

      for (const item of batch) {
        await this.processItem(item);
      }

      await this.delay(RESOLVER_CONFIG.batchDelay);
    }

    this.isRunning = false;
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: ResolverQueueItem): Promise<void> {
    const { key, markId, editor, variant = "bracket" } = item;

    try {
      // Metrics: mark as pending
      markPending(markId, key);
      markUnifiedPending(markId, key, variant);

      // Check cache first
      const cachedPageId = getCachedPageId(key);
      if (cachedPageId) {
        updateMarkState(editor, markId, {
          state: "exists",
          exists: true,
          pageId: cachedPageId,
          href: `/pages/${cachedPageId}`,
        });
        markResolved(markId);
        markUnifiedResolved(markId);
        markUnifiedCacheHit(markId, key);
        return;
      }

      // Execute search with retry
      const results = await searchPagesWithRetry(key);
      const exact = results.find((r) => normalizeTitleToKey(r.title) === key);

      if (exact) {
        setCachedPageId(key, exact.id);
        updateMarkState(editor, markId, {
          state: "exists",
          exists: true,
          pageId: exact.id,
          href: `/pages/${exact.id}`,
        });
        markResolved(markId);
        markUnifiedResolved(markId);
      } else {
        updateMarkState(editor, markId, {
          state: "missing",
          exists: false,
          href: "#",
        });
        markMissing(markId);
        markUnifiedMissing(markId);
      }
    } catch (error) {
      console.warn(`Failed to resolve key "${key}":`, error);
      updateMarkState(editor, markId, {
        state: "error",
      });
      markUnifiedError(markId, String(error));
    }
  }

  /**
   * Delay helper for batch processing
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
const resolverQueue = new ResolverQueue();

/**
 * Add an item to the resolver queue and start processing
 * @param item - The resolver queue item to add
 */
export function enqueueResolve(item: ResolverQueueItem): void {
  resolverQueue.add(item);
  queueMicrotask(() => resolverQueue.process());
}

/**
 * Search pages with retry logic
 * @param key - The normalized page key to search for
 * @param maxRetries - Maximum number of retry attempts
 * @returns Array of search results
 */
export async function searchPagesWithRetry(
  key: string,
  maxRetries = RESOLVER_CONFIG.maxRetries
): Promise<SearchResult[]> {
  let lastError: Error | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await searchPages(key);
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        const delay = RESOLVER_CONFIG.retryDelayBase * 2 ** i;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
