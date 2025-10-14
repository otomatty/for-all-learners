/**
 * UnifiedLinkMark resolver queue
 * Manages page resolution processing with batching and retry logic
 */

import logger from "../../logger";
import {
  markMissing,
  markPending,
  markResolved,
} from "../../metrics/pageLinkMetrics";
import {
  getCachedPageId,
  normalizeTitleToKey,
  setCachedPageId,
} from "../../unilink";
import {
  markUnifiedCacheHit,
  markUnifiedError,
  markUnifiedMissing,
  markUnifiedPending,
  markUnifiedResolved,
} from "../../unilink/metrics";
import { searchPages } from "../../utils/searchPages";
import { RESOLVER_CONFIG } from "./config";
import { updateMarkState } from "./state-manager";
import type { ResolverQueueItem, SearchResult } from "./types";

/**
 * Resolver queue singleton class
 * Handles batched processing of page resolution requests
 */
class ResolverQueue {
  private queue: ResolverQueueItem[] = [];
  private isRunning = false;

  /**
   * Add an item to the queue and trigger processing
   */
  add(item: ResolverQueueItem): void {
    logger.debug(
      { key: item.key, markId: item.markId, variant: item.variant },
      "[ResolverQueue] Adding item to queue"
    );
    this.queue.push(item);

    // Automatically start processing if not already running
    if (!this.isRunning) {
      logger.debug("[ResolverQueue] Starting queue processing");
      void this.process();
    }
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
   * Process a single queue item with timeout
   */
  private async processItem(item: ResolverQueueItem): Promise<void> {
    const { markId, editor } = item;
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Resolution timeout after ${RESOLVER_CONFIG.resolutionTimeout}ms`
          )
        );
      }, RESOLVER_CONFIG.resolutionTimeout);
    });

    try {
      // Race between resolution and timeout
      await Promise.race([this.resolveItem(item), timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message.includes("timeout")) {
        logger.warn({ markId }, "Resolution timeout - marking as MISSING");
        updateMarkState(editor, markId, {
          state: "missing",
          exists: false,
          href: "#",
        });
        markMissing(markId);
        markUnifiedMissing(markId);
      } else {
        logger.error({ error, markId }, "Resolution error");
        updateMarkState(editor, markId, {
          state: "error",
        });
        markUnifiedError(markId, String(error));
      }
    }
  }

  /**
   * Resolve a single item (core logic)
   */
  private async resolveItem(item: ResolverQueueItem): Promise<void> {
    const { key, raw, markId, editor, variant = "bracket" } = item;

    logger.debug(
      { key, raw, markId, variant },
      "[ResolverQueue] Starting resolution"
    );

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

      // First, try searching with the original text (raw)
      let results = await searchPagesWithRetry(raw);

      // If no results, try with normalized key
      if (results.length === 0 && raw !== key) {
        results = await searchPagesWithRetry(key);
      }

      if (results.length === 0) {
        logger.debug(
          { key, raw, markId },
          "[ResolverQueue] No pages found - marking as MISSING"
        );
        updateMarkState(editor, markId, {
          state: "missing",
          exists: false,
          href: "#",
        });
        markMissing(markId);
        markUnifiedMissing(markId);
        return;
      }

      // Try to find exact match (case-insensitive comparison)
      const exact = results.find((r) => {
        const normalizedTitle = normalizeTitleToKey(r.title);
        // Match against both key and raw
        return (
          normalizedTitle === key ||
          normalizedTitle === normalizeTitleToKey(raw)
        );
      });

      if (exact) {
        logger.debug(
          { key, raw, markId, pageId: exact.id, title: exact.title },
          "[ResolverQueue] Exact match found - marking as EXISTS"
        );
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
        logger.debug(
          { key, raw, markId, resultsCount: results.length },
          "[ResolverQueue] No exact match found - marking as MISSING"
        );
        updateMarkState(editor, markId, {
          state: "missing",
          exists: false,
          href: "#",
        });
        markMissing(markId);
        markUnifiedMissing(markId);
      }
    } catch (error) {
      logger.error({ error, key }, "Resolution error");
      updateMarkState(editor, markId, {
        state: "error",
      });
      markUnifiedError(markId, String(error));
      throw error; // Re-throw for processItem to handle
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
  queueMicrotask(() => {
    resolverQueue.process();
  });
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
