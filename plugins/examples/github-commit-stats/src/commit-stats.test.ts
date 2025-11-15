/**
 * Commit Statistics Tests
 *
 * Tests for commit statistics fetching and aggregation functions.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ plugins/examples/github-commit-stats/src/commit-stats.ts
 *   └─ vitest (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type CallGitHubAPI,
	getDailyCommitLinesForRepo,
	getMultiRepoCommitLines,
} from "./commit-stats";

describe("Commit Statistics", () => {
	let mockCallGitHubAPI: ReturnType<typeof vi.fn<CallGitHubAPI>>;

	beforeEach(() => {
		mockCallGitHubAPI = vi.fn();
	});

	describe("getDailyCommitLinesForRepo", () => {
		beforeEach(() => {
			// Ensure mock is reset for each test in this describe block
			mockCallGitHubAPI = vi.fn();
		});

		it("should return zero stats when API returns error", async () => {
			mockCallGitHubAPI.mockResolvedValue({
				status: 500,
				data: undefined,
			});

			const result = await getDailyCommitLinesForRepo(
				"owner",
				"repo",
				"2025-01-01",
				mockCallGitHubAPI,
			);

			expect(result).toEqual({
				date: "2025-01-01",
				commits: 0,
				additions: 0,
				deletions: 0,
				netLines: 0,
				repo: "owner/repo",
			});
		});

		it("should return zero stats when API returns null", async () => {
			mockCallGitHubAPI.mockResolvedValue(null);

			const result = await getDailyCommitLinesForRepo(
				"owner",
				"repo",
				"2025-01-01",
				mockCallGitHubAPI,
			);

			expect(result).toEqual({
				date: "2025-01-01",
				commits: 0,
				additions: 0,
				deletions: 0,
				netLines: 0,
				repo: "owner/repo",
			});
		});

		it("should filter commits by date", async () => {
			const targetDate = "2025-01-01";
			const otherDate = "2025-01-02";

			mockCallGitHubAPI
				.mockResolvedValueOnce({
					status: 200,
					data: [
						{
							sha: "abc123",
							commit: {
								author: {
									date: new Date(targetDate).toISOString(),
								},
							},
						},
						{
							sha: "def456",
							commit: {
								author: {
									date: new Date(otherDate).toISOString(),
								},
							},
						},
					],
				})
				.mockResolvedValueOnce({
					status: 200,
					data: {
						sha: "abc123",
						stats: {
							additions: 10,
							deletions: 5,
							total: 15,
						},
					},
				});

			const result = await getDailyCommitLinesForRepo(
				"owner",
				"repo",
				targetDate,
				mockCallGitHubAPI,
			);

			expect(result.commits).toBe(1);
			expect(result.additions).toBe(10);
			expect(result.deletions).toBe(5);
			expect(result.netLines).toBe(5);
		});

		it("should aggregate stats from multiple commits", async () => {
			const targetDate = "2025-01-01";

			mockCallGitHubAPI
				.mockResolvedValueOnce({
					status: 200,
					data: [
						{
							sha: "abc123",
							commit: {
								author: {
									date: new Date(targetDate).toISOString(),
								},
							},
						},
						{
							sha: "def456",
							commit: {
								author: {
									date: new Date(targetDate).toISOString(),
								},
							},
						},
					],
				})
				.mockResolvedValueOnce({
					status: 200,
					data: {
						sha: "abc123",
						stats: {
							additions: 10,
							deletions: 5,
							total: 15,
						},
					},
				})
				.mockResolvedValueOnce({
					status: 200,
					data: {
						sha: "def456",
						stats: {
							additions: 20,
							deletions: 10,
							total: 30,
						},
					},
				});

			const result = await getDailyCommitLinesForRepo(
				"owner",
				"repo",
				targetDate,
				mockCallGitHubAPI,
			);

			expect(result.commits).toBe(2);
			expect(result.additions).toBe(30);
			expect(result.deletions).toBe(15);
			expect(result.netLines).toBe(15);
		});

		it("should handle commits with missing stats", async () => {
			const targetDate = "2025-01-01";

			mockCallGitHubAPI
				.mockResolvedValueOnce({
					status: 200,
					data: [
						{
							sha: "abc123",
							commit: {
								author: {
									date: new Date(targetDate).toISOString(),
								},
							},
						},
					],
				})
				.mockResolvedValueOnce({
					status: 200,
					data: {
						sha: "abc123",
						// Missing stats
					},
				});

			const result = await getDailyCommitLinesForRepo(
				"owner",
				"repo",
				targetDate,
				mockCallGitHubAPI,
			);

			expect(result.commits).toBe(1);
			expect(result.additions).toBe(0);
			expect(result.deletions).toBe(0);
			expect(result.netLines).toBe(0);
		});

		it("should handle API errors when fetching commit details", async () => {
			const targetDate = "2025-01-01";

			mockCallGitHubAPI
				.mockResolvedValueOnce({
					status: 200,
					data: [
						{
							sha: "abc123",
							commit: {
								author: {
									date: new Date(targetDate).toISOString(),
								},
							},
						},
					],
				})
				.mockRejectedValueOnce(new Error("API error"));

			const result = await getDailyCommitLinesForRepo(
				"owner",
				"repo",
				targetDate,
				mockCallGitHubAPI,
			);

			expect(result.commits).toBe(1);
			expect(result.additions).toBe(0);
			expect(result.deletions).toBe(0);
		});

		it("should handle errors gracefully", async () => {
			mockCallGitHubAPI.mockRejectedValue(new Error("Network error"));

			const result = await getDailyCommitLinesForRepo(
				"owner",
				"repo",
				"2025-01-01",
				mockCallGitHubAPI,
			);

			expect(result).toEqual({
				date: "2025-01-01",
				commits: 0,
				additions: 0,
				deletions: 0,
				netLines: 0,
				repo: "owner/repo",
			});
		});
	});

	describe("getMultiRepoCommitLines", () => {
		beforeEach(() => {
			// Ensure mock is reset for each test in this describe block
			mockCallGitHubAPI = vi.fn();
		});

		it("should aggregate stats from multiple repositories", async () => {
			// Mock API calls for repo1: 1 commit list call + 1 commit detail call
			// Each repo needs: commits list API call, then for each commit a detail API call
			mockCallGitHubAPI
				// Repo1: commits list
				.mockResolvedValueOnce({
					status: 200,
					data: [
						{
							sha: "abc123",
							commit: {
								author: {
									date: new Date("2025-01-01").toISOString(),
								},
							},
						},
					],
				})
				// Repo1: commit detail for abc123
				.mockResolvedValueOnce({
					status: 200,
					data: {
						sha: "abc123",
						stats: {
							additions: 10,
							deletions: 5,
							total: 15,
						},
					},
				})
				// Repo2: commits list
				.mockResolvedValueOnce({
					status: 200,
					data: [
						{
							sha: "def456",
							commit: {
								author: {
									date: new Date("2025-01-01").toISOString(),
								},
							},
						},
					],
				})
				// Repo2: commit detail for def456
				.mockResolvedValueOnce({
					status: 200,
					data: {
						sha: "def456",
						stats: {
							additions: 20,
							deletions: 10,
							total: 30,
						},
					},
				});

			const result = await getMultiRepoCommitLines(
				["owner/repo1", "owner/repo2"],
				"2025-01-01",
				mockCallGitHubAPI,
			);

			// Each repo has 1 commit, so total should be 2
			expect(result.commits).toBe(2);
			expect(result.additions).toBe(30); // 10 + 20
			expect(result.deletions).toBe(15); // 5 + 10
			expect(result.netLines).toBe(15); // 30 - 15
			expect(result.repoStats).toHaveLength(2);
		});

		it("should handle invalid repository names", async () => {
			// Invalid repo name should return zero stats without API calls
			// Valid repo name should make API calls
			// Mock for valid repo: empty commits list (no commits on this date)
			mockCallGitHubAPI.mockResolvedValue({
				status: 200,
				data: [],
			});

			const result = await getMultiRepoCommitLines(
				["invalid", "owner/repo"],
				"2025-01-01",
				mockCallGitHubAPI,
			);

			expect(result.repoStats).toHaveLength(2);
			expect(result.repoStats[0]).toEqual({
				repo: "invalid",
				commits: 0,
				additions: 0,
				deletions: 0,
				netLines: 0,
			});
			// Second repo should have stats from API (even if empty)
			expect(result.repoStats[1].repo).toBe("owner/repo");
			expect(result.repoStats[1].commits).toBe(0); // Empty commits list
		});

		it("should handle empty repository list", async () => {
			// Empty list should not make any API calls
			const result = await getMultiRepoCommitLines(
				[],
				"2025-01-01",
				mockCallGitHubAPI,
			);

			expect(result.commits).toBe(0);
			expect(result.additions).toBe(0);
			expect(result.deletions).toBe(0);
			expect(result.netLines).toBe(0);
			expect(result.repoStats).toHaveLength(0);
			// Verify no API calls were made
			expect(mockCallGitHubAPI).not.toHaveBeenCalled();
		});
	});
});
