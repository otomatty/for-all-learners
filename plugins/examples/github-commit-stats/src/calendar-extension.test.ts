/**
 * Calendar Extension Tests
 *
 * Tests for calendar extension registration and data retrieval.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ plugins/examples/github-commit-stats/src/calendar-extension.ts
 *   ├─ plugins/examples/github-commit-stats/src/commit-stats.ts
 *   └─ vitest (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import type { MockedFunction } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerCalendarExtension } from "./calendar-extension";
import type { CallGitHubAPI } from "./commit-stats";

type CalendarAPI = Parameters<typeof registerCalendarExtension>[0];

type MockCalendar = CalendarAPI & {
	registerExtension: MockedFunction<CalendarAPI["registerExtension"]>;
	unregisterExtension: MockedFunction<CalendarAPI["unregisterExtension"]>;
};

describe("Calendar Extension", () => {
	let mockCalendar: MockCalendar;
	let mockCallGitHubAPI: ReturnType<typeof vi.fn<CallGitHubAPI>>;

	beforeEach(() => {
		mockCalendar = {
			registerExtension: vi.fn() as MockedFunction<
				CalendarAPI["registerExtension"]
			>,
			unregisterExtension: vi.fn() as MockedFunction<
				CalendarAPI["unregisterExtension"]
			>,
		} as MockCalendar;
		mockCallGitHubAPI = vi.fn();
	});

	afterEach(() => {
		// Restore all mocks to avoid interference with other tests
		vi.restoreAllMocks();
	});

	it("should register calendar extension", async () => {
		await registerCalendarExtension(
			mockCalendar,
			["owner/repo"],
			mockCallGitHubAPI,
		);

		expect(mockCalendar.registerExtension).toHaveBeenCalledWith({
			id: "github-commit-stats",
			name: "GitHubコミット統計",
			description: "GitHubコミット行数をカレンダーに表示",
			getDailyData: expect.any(Function),
		});
	});

	it("should return correct data format when commits exist", async () => {
		mockCallGitHubAPI.mockResolvedValue({
			status: 200,
			data: [],
		});

		await registerCalendarExtension(
			mockCalendar,
			["owner/repo"],
			mockCallGitHubAPI,
		);

		const registerCall = mockCalendar.registerExtension.mock.calls[0][0];
		const getDailyData = registerCall.getDailyData;

		// Mock successful stats response
		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockResolvedValue({
			date: "2025-01-01",
			commits: 2,
			additions: 30,
			deletions: 15,
			netLines: 15,
			repoStats: [
				{
					repo: "owner/repo",
					commits: 2,
					additions: 30,
					deletions: 15,
					netLines: 15,
				},
			],
		});

		const result = await getDailyData("2025-01-01");

		expect(result).toMatchObject({
			badge: "+15",
			badgeColor: expect.stringContaining("green"),
			tooltip: expect.stringContaining("コミット: 2件"),
			detailSections: [
				{
					title: "GitHubコミット統計",
					content: expect.stringContaining("コミット数: 2件"),
					icon: "📊",
				},
			],
		});
	});

	it("should return correct badge for negative net lines", async () => {
		await registerCalendarExtension(
			mockCalendar,
			["owner/repo"],
			mockCallGitHubAPI,
		);

		const registerCall = mockCalendar.registerExtension.mock.calls[0][0];
		const getDailyData = registerCall.getDailyData;

		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockResolvedValue({
			date: "2025-01-01",
			commits: 1,
			additions: 10,
			deletions: 20,
			netLines: -10,
			repoStats: [
				{
					repo: "owner/repo",
					commits: 1,
					additions: 10,
					deletions: 20,
					netLines: -10,
				},
			],
		});

		const result = await getDailyData("2025-01-01");

		expect(result?.badge).toBe("-10");
		expect(result?.badgeColor).toContain("red");
	});

	it("should return commits count badge when net lines is zero", async () => {
		await registerCalendarExtension(
			mockCalendar,
			["owner/repo"],
			mockCallGitHubAPI,
		);

		const registerCall = mockCalendar.registerExtension.mock.calls[0][0];
		const getDailyData = registerCall.getDailyData;

		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockResolvedValue({
			date: "2025-01-01",
			commits: 3,
			additions: 10,
			deletions: 10,
			netLines: 0,
			repoStats: [
				{
					repo: "owner/repo",
					commits: 3,
					additions: 10,
					deletions: 10,
					netLines: 0,
				},
			],
		});

		const result = await getDailyData("2025-01-01");

		expect(result?.badge).toBe("3 commits");
		expect(result?.badgeColor).toContain("blue");
	});

	it("should return null when no commits exist", async () => {
		await registerCalendarExtension(
			mockCalendar,
			["owner/repo"],
			mockCallGitHubAPI,
		);

		const registerCall = mockCalendar.registerExtension.mock.calls[0][0];
		const getDailyData = registerCall.getDailyData;

		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockResolvedValue({
			date: "2025-01-01",
			commits: 0,
			additions: 0,
			deletions: 0,
			netLines: 0,
			repoStats: [],
		});

		const result = await getDailyData("2025-01-01");

		expect(result?.badge).toBeUndefined();
		expect(result?.tooltip).toBeUndefined();
	});

	it("should return null on error", async () => {
		await registerCalendarExtension(
			mockCalendar,
			["owner/repo"],
			mockCallGitHubAPI,
		);

		const registerCall = mockCalendar.registerExtension.mock.calls[0][0];
		const getDailyData = registerCall.getDailyData;

		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockRejectedValue(new Error("API error"));

		const result = await getDailyData("2025-01-01");

		expect(result).toBeNull();
	});

	it("should include repository breakdown in tooltip", async () => {
		await registerCalendarExtension(
			mockCalendar,
			["owner/repo1", "owner/repo2"],
			mockCallGitHubAPI,
		);

		const registerCall = mockCalendar.registerExtension.mock.calls[0][0];
		const getDailyData = registerCall.getDailyData;

		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockResolvedValue({
			date: "2025-01-01",
			commits: 3,
			additions: 30,
			deletions: 15,
			netLines: 15,
			repoStats: [
				{
					repo: "owner/repo1",
					commits: 2,
					additions: 20,
					deletions: 10,
					netLines: 10,
				},
				{
					repo: "owner/repo2",
					commits: 1,
					additions: 10,
					deletions: 5,
					netLines: 5,
				},
			],
		});

		const result = await getDailyData("2025-01-01");

		expect(result?.tooltip).toContain("owner/repo1");
		expect(result?.tooltip).toContain("owner/repo2");
		expect(result?.detailSections?.[0]?.content).toContain("【リポジトリ別】");
	});
});
