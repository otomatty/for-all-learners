// Lightweight metrics helpers for PageLinkMark resolution lifecycle
// Future: replace with a more robust analytics pipeline.

interface TimingEntry {
  plId: string;
  title: string;
  start: number;
}

const pending: Map<string, TimingEntry> = new Map();
let resolvedCount = 0;
let missingCount = 0;
let totalResolvedTime = 0;
let totalMissingTime = 0;
let maxResolvedTime = 0;
let maxMissingTime = 0;

export function markPending(plId: string, title: string) {
  pending.set(plId, { plId, title, start: performance.now() });
  console.debug(
    `[PageLinkMetrics] pending start plId=${plId} title="${title}"`
  );
}

function finish(plId: string, state: "exists" | "missing") {
  const entry = pending.get(plId);
  if (!entry) return;
  const dur = performance.now() - entry.start;
  pending.delete(plId);
  if (state === "exists") {
    resolvedCount += 1;
    totalResolvedTime += dur;
    if (dur > maxResolvedTime) maxResolvedTime = dur;
  } else {
    missingCount += 1;
    totalMissingTime += dur;
    if (dur > maxMissingTime) maxMissingTime = dur;
  }
  console.debug(
    `[PageLinkMetrics] ${state} plId=${plId} title="${
      entry.title
    }" duration=${dur.toFixed(1)}ms`
  );
}

export function markResolved(plId: string) {
  finish(plId, "exists");
}

export function markMissing(plId: string) {
  finish(plId, "missing");
}

export function getMetricsSummary() {
  const avgResolved = resolvedCount ? totalResolvedTime / resolvedCount : 0;
  const avgMissing = missingCount ? totalMissingTime / missingCount : 0;
  return {
    inFlight: pending.size,
    resolvedCount,
    missingCount,
    avgResolvedMs: Number(avgResolved.toFixed(2)),
    avgMissingMs: Number(avgMissing.toFixed(2)),
    maxResolvedMs: Number(maxResolvedTime.toFixed(2)),
    maxMissingMs: Number(maxMissingTime.toFixed(2)),
  };
}

export function resetMetrics() {
  pending.clear();
  resolvedCount = 0;
  missingCount = 0;
  totalResolvedTime = 0;
  totalMissingTime = 0;
  maxResolvedTime = 0;
  maxMissingTime = 0;
}
