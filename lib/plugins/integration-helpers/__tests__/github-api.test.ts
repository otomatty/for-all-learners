/**
 * GitHub API Helper Tests
 *
 * Tests for GitHub API helper functions.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ plugins/examples/github-commit-stats/src/index.ts (future)
 *
 * Dependencies:
 *   └─ lib/plugins/integration-helpers/github-api.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IntegrationAPI } from "../../plugin-api";
import {
	getCommitStats,
	getCommitsByDate,
	getDailyCommitLines,
} from "../github-api";

describe("GitHub API Helper", () => {
	const mockAPI: IntegrationAPI = {
		registerOAuthProvider: vi.fn(),
		unregisterOAuthProvider: vi.fn(),
		registerWebhook: vi.fn(),
		unregisterWebhook: vi.fn(),
		registerExternalAPI: vi.fn(),
		unregisterExternalAPI: vi.fn(),
		callExternalAPI: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getCommitsByDate", () => {
		it("should fetch commits for a date range", async () => {
			const mockCommits = [
				{
					sha: "abc123",
					commit: {
						author: { date: "2025-01-15T10:00:00Z" },
						message: "Test commit",
					},
					stats: { additions: 10, deletions: 5, total: 15 },
				},
				{
					sha: "def456",
					commit: {
						author: { date: "2025-01-15T14:00:00Z" },
						message: "Another commit",
					},
					stats: { additions: 20, deletions: 10, total: 30 },
				},
			];

			vi.mocked(mockAPI.callExternalAPI).mockResolvedValue({
				status: 200,
				statusText: "OK",
				headers: {},
				data: mockCommits,
			});

			const result = await getCommitsByDate(
				"owner",
				"repo",
				"2025-01-15T00:00:00Z",
				"2025-01-15T23:59:59Z",
				mockAPI,
			);

			expect(result).toEqual(mockCommits);
			expect(mockAPI.callExternalAPI).toHaveBeenCalledWith(undefined, {
				method: "GET",
				url: "https://api.github.com/repos/owner/repo/commits",
				headers: {
					Accept: "application/vnd.github.v3+json",
				},
				query: {
					since: "2025-01-15T00:00:00Z",
					until: "2025-01-15T23:59:59Z",
					per_page: "100",
				},
			});
		});

		it("should throw error when API returns non-200 status", async () => {
			vi.mocked(mockAPI.callExternalAPI).mockResolvedValue({
				status: 404,
				statusText: "Not Found",
				headers: {},
				data: { message: "Not Found" },
			});

			await expect(
				getCommitsByDate(
					"owner",
					"repo",
					"2025-01-15T00:00:00Z",
					"2025-01-15T23:59:59Z",
					mockAPI,
				),
			).rejects.toThrow("GitHub API error: Not Found");
		});

		it("should handle API errors gracefully", async () => {
			vi.mocked(mockAPI.callExternalAPI).mockRejectedValue(
				new Error("Network error"),
			);

			await expect(
				getCommitsByDate(
					"owner",
					"repo",
					"2025-01-15T00:00:00Z",
					"2025-01-15T23:59:59Z",
					mockAPI,
				),
			).rejects.toThrow("Network error");
		});
	});

	describe("getCommitStats", () => {
		it("should fetch commit statistics", async () => {
			const mockCommit = {
				sha: "abc123",
				commit: {
					author: { date: "2025-01-15T10:00:00Z" },
					message: "Test commit",
				},
				stats: { additions: 10, deletions: 5, total: 15 },
			};

			vi.mocked(mockAPI.callExternalAPI).mockResolvedValue({
				status: 200,
				statusText: "OK",
				headers: {},
				data: mockCommit,
			});

			const result = await getCommitStats("owner", "repo", "abc123", mockAPI);

			expect(result).toEqual({ additions: 10, deletions: 5, total: 15 });
			expect(mockAPI.callExternalAPI).toHaveBeenCalledWith(undefined, {
				method: "GET",
				url: "https://api.github.com/repos/owner/repo/commits/abc123",
				headers: {
					Accept: "application/vnd.github.v3+json",
				},
			});
		});

		it("should return zeros when stats not available", async () => {
			const mockCommit = {
				sha: "abc123",
				commit: {
					author: { date: "2025-01-15T10:00:00Z" },
					message: "Test commit",
				},
			};

			vi.mocked(mockAPI.callExternalAPI).mockResolvedValue({
				status: 200,
				statusText: "OK",
				headers: {},
				data: mockCommit,
			});

			const result = await getCommitStats("owner", "repo", "abc123", mockAPI);

			expect(result).toEqual({ additions: 0, deletions: 0, total: 0 });
		});

		it("should throw error when API returns error", async () => {
			vi.mocked(mockAPI.callExternalAPI).mockResolvedValue({
				status: 404,
				statusText: "Not Found",
				headers: {},
				data: { message: "Commit not found" },
			});

			await expect(
				getCommitStats("owner", "repo", "invalid", mockAPI),
			).rejects.toThrow("GitHub API error: Commit not found");
		});
	});

	describe("getDailyCommitLines", () => {
		it("should calculate daily commit statistics", async () => {
			const mockCommits = [
				{
					sha: "abc123",
					commit: {
						author: { date: "2025-01-15T10:00:00Z" },
						message: "Test commit 1",
					},
				},
				{
					sha: "def456",
					commit: {
						author: { date: "2025-01-15T14:00:00Z" },
						message: "Test commit 2",
					},
				},
			];

			// Mock getCommitsByDate
			vi.mocked(mockAPI.callExternalAPI).mockImplementation(
				async (_apiId, options) => {
					if (options.url.includes("/commits/")) {
						// Individual commit stats request
						const sha = options.url.split("/").pop();
						if (sha === "abc123") {
							return {
								status: 200,
								statusText: "OK",
								headers: {},
								data: {
									sha: "abc123",
									stats: { additions: 10, deletions: 5, total: 15 },
								},
							};
						}
						if (sha === "def456") {
							return {
								status: 200,
								statusText: "OK",
								headers: {},
								data: {
									sha: "def456",
									stats: { additions: 20, deletions: 10, total: 30 },
								},
							};
						}
					}
					// Commits list request
					return {
						status: 200,
						statusText: "OK",
						headers: {},
						data: mockCommits,
					};
				},
			);

			const result = await getDailyCommitLines(
				"owner",
				"repo",
				"2025-01-15",
				mockAPI,
			);

			expect(result).toEqual({
				date: "2025-01-15",
				commits: 2,
				additions: 30,
				deletions: 15,
				netLines: 15,
			});
		});

		it("should filter commits by exact date", async () => {
			const mockCommits = [
				{
					sha: "abc123",
					commit: {
						author: { date: "2025-01-15T10:00:00Z" },
						message: "Same day",
					},
				},
				{
					sha: "def456",
					commit: {
						author: { date: "2025-01-16T10:00:00Z" },
						message: "Next day",
					},
				},
			];

			vi.mocked(mockAPI.callExternalAPI).mockImplementation(
				async (_apiId, options) => {
					if (options.url.includes("/commits/")) {
						const sha = options.url.split("/").pop();
						if (sha === "abc123") {
							return {
								status: 200,
								statusText: "OK",
								headers: {},
								data: {
									sha: "abc123",
									stats: { additions: 10, deletions: 5, total: 15 },
								},
							};
						}
						return {
							status: 200,
							statusText: "OK",
							headers: {},
							data: {
								sha,
								stats: { additions: 0, deletions: 0, total: 0 },
							},
						};
					}
					return {
						status: 200,
						statusText: "OK",
						headers: {},
						data: mockCommits,
					};
				},
			);

			const result = await getDailyCommitLines(
				"owner",
				"repo",
				"2025-01-15",
				mockAPI,
			);

			// Should only count commits on 2025-01-15
			expect(result.commits).toBe(1);
			expect(result.additions).toBe(10);
		});

		it("should handle errors when fetching commit stats", async () => {
			const mockCommits = [
				{
					sha: "abc123",
					commit: {
						author: { date: "2025-01-15T10:00:00Z" },
						message: "Test commit",
					},
				},
			];

			vi.mocked(mockAPI.callExternalAPI).mockImplementation(
				async (_apiId, options) => {
					if (options.url.includes("/commits/")) {
						// Simulate error for stats
						throw new Error("Stats fetch failed");
					}
					return {
						status: 200,
						statusText: "OK",
						headers: {},
						data: mockCommits,
					};
				},
			);

			const result = await getDailyCommitLines(
				"owner",
				"repo",
				"2025-01-15",
				mockAPI,
			);

			// Should still return result with zeros for failed stats
			expect(result.commits).toBe(1);
			expect(result.additions).toBe(0);
			expect(result.deletions).toBe(0);
		});
	});
});
