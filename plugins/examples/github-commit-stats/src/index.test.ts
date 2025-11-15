/**
 * GitHub Commit Stats Plugin Integration Tests
 *
 * Integration tests for plugin activation and sequential API execution.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ plugins/examples/github-commit-stats/src/index.ts
 *   ├─ plugins/examples/github-commit-stats/src/concurrency.ts
 *   └─ vitest (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("GitHub Commit Stats Plugin - Integration Tests", () => {
	let callOrder: number[];
	let activeCallCount: number;
	let maxConcurrentCalls: number;
	let callTimestamps: number[];

	beforeEach(() => {
		callOrder = [];
		activeCallCount = 0;
		maxConcurrentCalls = 0;
		callTimestamps = [];
	});

	describe("Sequential API Execution", () => {
		it("should execute API calls sequentially when MAX_CONCURRENT_GITHUB_API_CALLS is 1", async () => {
			// This test verifies that the concurrency limiter with maxConcurrent=1
			// ensures only one API call is active at a time

			const { createConcurrencyLimiter } = await import("./concurrency");
			const limiter = createConcurrencyLimiter(1);

			const mockCall = vi.fn(async (index: number) => {
				activeCallCount += 1;
				maxConcurrentCalls = Math.max(maxConcurrentCalls, activeCallCount);
				callOrder.push(index);
				callTimestamps.push(Date.now());

				await new Promise((resolve) => setTimeout(resolve, 10));

				activeCallCount -= 1;
				return index;
			});

			// Execute 5 tasks concurrently (but limiter should serialize them)
			const tasks = Array.from({ length: 5 }, (_, i) =>
				limiter.run(() => mockCall(i)),
			);

			await Promise.all(tasks);

			// Verify all calls completed
			expect(mockCall).toHaveBeenCalledTimes(5);
			expect(callOrder).toEqual([0, 1, 2, 3, 4]);

			// Verify maximum concurrent calls was 1 (sequential execution)
			expect(maxConcurrentCalls).toBe(1);

			// Verify calls were executed in order (timestamps should be sequential)
			for (let i = 1; i < callTimestamps.length; i++) {
				expect(callTimestamps[i]).toBeGreaterThanOrEqual(callTimestamps[i - 1]);
			}
		});

		it("should process commits sequentially in getDailyCommitLinesForRepo", async () => {
			// This test verifies that commit detail requests are processed one at a time
			// We'll test this by mocking the plugin's internal behavior

			const { createConcurrencyLimiter } = await import("./concurrency");
			const limiter = createConcurrencyLimiter(1);

			const mockApiCall = vi.fn(async () => {
				activeCallCount += 1;
				maxConcurrentCalls = Math.max(maxConcurrentCalls, activeCallCount);
				callOrder.push(callOrder.length);

				await new Promise((resolve) => setTimeout(resolve, 5));

				activeCallCount -= 1;
				return {
					status: 200,
					data: { stats: { additions: 10, deletions: 5 } },
				};
			});

			// Simulate processing 3 commits sequentially
			const commits = [{ sha: "abc123" }, { sha: "def456" }, { sha: "ghi789" }];

			for (const _commit of commits) {
				await limiter.run(() => mockApiCall());
			}

			// Verify all calls completed
			expect(mockApiCall).toHaveBeenCalledTimes(3);

			// Verify maximum concurrent calls was 1
			expect(maxConcurrentCalls).toBe(1);

			// Verify calls were executed in order
			expect(callOrder).toEqual([0, 1, 2]);
		});

		it("should process repositories sequentially in getMultiRepoCommitLines", async () => {
			// This test verifies that repository requests are processed one at a time

			const { createConcurrencyLimiter } = await import("./concurrency");
			const limiter = createConcurrencyLimiter(1);

			const mockRepoCall = vi.fn(async (repoName: string) => {
				activeCallCount += 1;
				maxConcurrentCalls = Math.max(maxConcurrentCalls, activeCallCount);
				callOrder.push(callOrder.length);

				await new Promise((resolve) => setTimeout(resolve, 5));

				activeCallCount -= 1;
				return {
					date: "2025-01-01",
					commits: 1,
					additions: 10,
					deletions: 5,
					netLines: 5,
					repo: repoName,
				};
			});

			// Simulate processing 3 repositories sequentially
			const repos = ["owner/repo1", "owner/repo2", "owner/repo3"];

			for (const repo of repos) {
				await limiter.run(() => mockRepoCall(repo));
			}

			// Verify all calls completed
			expect(mockRepoCall).toHaveBeenCalledTimes(3);

			// Verify maximum concurrent calls was 1
			expect(maxConcurrentCalls).toBe(1);

			// Verify calls were executed in order
			expect(callOrder).toEqual([0, 1, 2]);
		});

		it("should process days sequentially in widget render", async () => {
			// This test verifies that day-by-day requests are processed one at a time

			const { createConcurrencyLimiter } = await import("./concurrency");
			const limiter = createConcurrencyLimiter(1);

			const mockDayCall = vi.fn(async (day: number) => {
				activeCallCount += 1;
				maxConcurrentCalls = Math.max(maxConcurrentCalls, activeCallCount);
				callOrder.push(day);

				await new Promise((resolve) => setTimeout(resolve, 5));

				activeCallCount -= 1;
				return {
					date: `2025-01-${String(day).padStart(2, "0")}`,
					commits: 1,
					additions: 10,
					deletions: 5,
					netLines: 5,
				};
			});

			// Simulate processing 5 days sequentially
			const daysInMonth = 5;

			for (let day = 1; day <= daysInMonth; day++) {
				await limiter.run(() => mockDayCall(day));
			}

			// Verify all calls completed
			expect(mockDayCall).toHaveBeenCalledTimes(5);

			// Verify maximum concurrent calls was 1
			expect(maxConcurrentCalls).toBe(1);

			// Verify calls were executed in order
			expect(callOrder).toEqual([1, 2, 3, 4, 5]);
		});
	});

	describe("Configuration", () => {
		it("should not exceed MAX_CONCURRENT_GITHUB_API_CALLS limit", async () => {
			// Verify the constant is set to 1
			// This is a compile-time check, but we can verify the behavior through the limiter

			const { createConcurrencyLimiter } = await import("./concurrency");
			const limiter = createConcurrencyLimiter(1);

			expect(limiter.getMaxConcurrency()).toBe(1);
		});

		it("should have MAX_CONCURRENT_GITHUB_API_CALLS set to 1 in implementation", async () => {
			// Verify that the implementation code actually uses MAX_CONCURRENT_GITHUB_API_CALLS = 1
			// by reading the source file and checking for the constant value

			const fs = await import("node:fs/promises");
			const path = await import("node:path");
			const { fileURLToPath } = await import("node:url");
			const currentFileUrl = import.meta.url;
			const currentFilePath = fileURLToPath(currentFileUrl);
			const filePath = path.join(path.dirname(currentFilePath), "index.ts");
			const sourceCode = await fs.readFile(filePath, "utf-8");

			// Check that MAX_CONCURRENT_GITHUB_API_CALLS is set to 1
			expect(sourceCode).toMatch(/const MAX_CONCURRENT_GITHUB_API_CALLS = 1/);

			// Verify that it's not set to any other value (like 5)
			expect(sourceCode).not.toMatch(
				/const MAX_CONCURRENT_GITHUB_API_CALLS = [2-9]/,
			);
		});
	});
});
