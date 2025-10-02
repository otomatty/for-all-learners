/**
 * UnifiedLinkMark Metrics - 専用メトリクス機能
 * P2実装: 既存のPageLinkMarkメトリクスとの統合
 */

import {
  markPending as basePending,
  markResolved as baseResolved,
  markMissing as baseMissing,
  getMetricsSummary as baseGetMetricsSummary,
} from "../metrics/pageLinkMetrics";

// UnifiedLinkMark専用のメトリクス拡張
interface UnifiedLinkMetrics {
  totalCreated: number;
  totalResolved: number;
  totalMissing: number;
  totalErrors: number;
  averageResolutionTime: number;
  cacheHitRate: number;
  variantBreakdown: {
    bracket: number;
    tag: number;
  };
}

// 内部統計データ
let unifiedStats = {
  created: 0,
  resolved: 0,
  missing: 0,
  errors: 0,
  bracketCount: 0,
  tagCount: 0,
  cacheHits: 0,
  totalRequests: 0,
  totalResolutionTime: 0,
};

const startTimes = new Map<string, number>();

/**
 * UnifiedLinkMark作成開始をマーク
 * @param markId マークID
 * @param title タイトル
 * @param variant マークの種類
 */
export function markUnifiedPending(
  markId: string,
  title: string,
  variant: "bracket" | "tag" = "bracket"
): void {
  // 基本メトリクスに記録
  basePending(markId, title);

  // UnifiedLinkMark専用統計
  unifiedStats.created++;
  unifiedStats.totalRequests++;

  if (variant === "bracket") {
    unifiedStats.bracketCount++;
  } else {
    unifiedStats.tagCount++;
  }

  startTimes.set(markId, performance.now());

  console.debug(
    `[UnifiedMetrics] pending start markId=${markId} title="${title}" variant=${variant}`
  );
}

/**
 * UnifiedLinkMark解決完了をマーク
 * @param markId マークID
 */
export function markUnifiedResolved(markId: string): void {
  // 基本メトリクスに記録
  baseResolved(markId);

  // UnifiedLinkMark専用統計
  unifiedStats.resolved++;

  const startTime = startTimes.get(markId);
  if (startTime) {
    const duration = performance.now() - startTime;
    unifiedStats.totalResolutionTime += duration;
    startTimes.delete(markId);
  }

  console.debug(`[UnifiedMetrics] resolved markId=${markId}`);
}

/**
 * UnifiedLinkMark missing状態をマーク
 * @param markId マークID
 */
export function markUnifiedMissing(markId: string): void {
  // 基本メトリクスに記録
  baseMissing(markId);

  // UnifiedLinkMark専用統計
  unifiedStats.missing++;

  const startTime = startTimes.get(markId);
  if (startTime) {
    const duration = performance.now() - startTime;
    unifiedStats.totalResolutionTime += duration;
    startTimes.delete(markId);
  }

  console.debug(`[UnifiedMetrics] missing markId=${markId}`);
}

/**
 * UnifiedLinkMarkエラー状態をマーク
 * @param markId マークID
 * @param error エラー内容
 */
export function markUnifiedError(markId: string, error?: string): void {
  // UnifiedLinkMark専用統計
  unifiedStats.errors++;

  startTimes.delete(markId); // エラー時は時間計測を停止

  console.debug(`[UnifiedMetrics] error markId=${markId} error=${error}`);
}

/**
 * キャッシュヒットをマーク
 * @param markId マークID
 * @param key キー
 */
export function markUnifiedCacheHit(markId: string, key: string): void {
  unifiedStats.cacheHits++;

  console.debug(`[UnifiedMetrics] cache hit markId=${markId} key=${key}`);
}

/**
 * ページ作成成功をマーク
 * @param markId マークID
 * @param pageId 作成されたページID
 * @param title ページタイトル
 */
export function markUnifiedPageCreated(
  markId: string,
  pageId: string,
  title: string
): void {
  // 将来のページ作成専用メトリクス拡張用
  console.debug(
    `[UnifiedMetrics] page created markId=${markId} pageId=${pageId} title="${title}"`
  );
}

/**
 * UnifiedLinkMark専用のメトリクス取得
 * @returns UnifiedLinkMarkの統計情報
 */
export function getUnifiedMetricsSummary(): UnifiedLinkMetrics {
  const averageResolutionTime =
    unifiedStats.resolved + unifiedStats.missing > 0
      ? unifiedStats.totalResolutionTime /
        (unifiedStats.resolved + unifiedStats.missing)
      : 0;

  const cacheHitRate =
    unifiedStats.totalRequests > 0
      ? unifiedStats.cacheHits / unifiedStats.totalRequests
      : 0;

  return {
    totalCreated: unifiedStats.created,
    totalResolved: unifiedStats.resolved,
    totalMissing: unifiedStats.missing,
    totalErrors: unifiedStats.errors,
    averageResolutionTime,
    cacheHitRate,
    variantBreakdown: {
      bracket: unifiedStats.bracketCount,
      tag: unifiedStats.tagCount,
    },
  };
}

/**
 * 基本メトリクスとUnifiedメトリクスの統合サマリー
 * @returns 統合されたメトリクス情報
 */
export function getCombinedMetricsSummary() {
  const baseMetrics = baseGetMetricsSummary();
  const unifiedMetrics = getUnifiedMetricsSummary();

  const baseTotalProcessed =
    baseMetrics.resolvedCount + baseMetrics.missingCount;
  const unifiedTotalProcessed =
    unifiedMetrics.totalResolved + unifiedMetrics.totalMissing;

  return {
    base: baseMetrics,
    unified: unifiedMetrics,
    combined: {
      totalProcessed: baseTotalProcessed + unifiedTotalProcessed,
      successRate:
        (baseMetrics.resolvedCount + unifiedMetrics.totalResolved) /
        Math.max(1, baseTotalProcessed + unifiedTotalProcessed),
    },
  };
}

/**
 * メトリクス統計をリセット
 */
export function resetUnifiedMetrics(): void {
  unifiedStats = {
    created: 0,
    resolved: 0,
    missing: 0,
    errors: 0,
    bracketCount: 0,
    tagCount: 0,
    cacheHits: 0,
    totalRequests: 0,
    totalResolutionTime: 0,
  };

  startTimes.clear();

  console.debug("[UnifiedMetrics] metrics reset");
}

/**
 * デバッグ用：現在の統計情報をコンソール出力
 */
export function logUnifiedMetrics(): void {
  const summary = getUnifiedMetricsSummary();
  console.log("[UnifiedMetrics] Current statistics:", summary);
}
