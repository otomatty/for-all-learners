/**
 * Concurrency Utilities for GitHub Commit Stats Plugin
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ plugins/examples/github-commit-stats/src/index.ts
 *
 * Dependencies:
 *   └─ none
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

/**
 * Lightweight concurrency limiter used to cap external API calls.
 */
export interface ConcurrencyLimiter {
	run<T>(task: () => Promise<T>): Promise<T>;
	getActiveCount(): number;
	getMaxConcurrency(): number;
}

/**
 * Create a concurrency limiter that ensures no more than `maxConcurrent`
 * asynchronous tasks run at the same time.
 *
 * The limiter is intentionally minimal: it keeps a FIFO queue of waiters and
 * releases one waiter whenever an active task completes.
 *
 * @throws Error if maxConcurrent is not a positive integer
 */
export function createConcurrencyLimiter(
	maxConcurrent: number,
): ConcurrencyLimiter {
	if (!Number.isInteger(maxConcurrent) || maxConcurrent <= 0) {
		throw new Error(
			`maxConcurrent must be a positive integer, received: ${maxConcurrent}`,
		);
	}

	let activeCount = 0;
	const waitQueue: Array<() => void> = [];

	const scheduleNext = () => {
		const next = waitQueue.shift();
		if (next) {
			next();
		}
	};

	const acquire = async (): Promise<void> => {
		if (activeCount >= maxConcurrent) {
			await new Promise<void>((resolve) => {
				waitQueue.push(resolve);
			});
		}
		activeCount += 1;
	};

	const release = () => {
		activeCount = Math.max(0, activeCount - 1);
		scheduleNext();
	};

	const run = async <T>(task: () => Promise<T>): Promise<T> => {
		await acquire();
		try {
			return await task();
		} finally {
			release();
		}
	};

	return {
		run,
		getActiveCount: () => activeCount,
		getMaxConcurrency: () => maxConcurrent,
	};
}
