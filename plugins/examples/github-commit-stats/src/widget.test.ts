/**
 * Widget Tests
 *
 * Tests for widget registration and rendering.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ plugins/examples/github-commit-stats/src/widget.ts
 *   ├─ plugins/examples/github-commit-stats/src/commit-stats.ts
 *   └─ vitest (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import type { MockedFunction } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CallGitHubAPI } from "./commit-stats";
import { registerWidget } from "./widget";

type UIAPI = Parameters<typeof registerWidget>[0];

type MockUI = UIAPI & {
	registerWidget: MockedFunction<UIAPI["registerWidget"]>;
	unregisterWidget: MockedFunction<UIAPI["unregisterWidget"]>;
};

describe("Widget", () => {
	let mockUI: MockUI;
	let mockCallGitHubAPI: ReturnType<typeof vi.fn<CallGitHubAPI>>;

	beforeEach(() => {
		mockUI = {
			registerWidget: vi.fn() as MockedFunction<UIAPI["registerWidget"]>,
			unregisterWidget: vi.fn() as MockedFunction<UIAPI["unregisterWidget"]>,
		} as MockUI;
		mockCallGitHubAPI = vi.fn();
	});

	afterEach(() => {
		// Restore all mocks to avoid interference with other tests
		vi.restoreAllMocks();
	});

	it("should register widget with correct configuration", async () => {
		await registerWidget(mockUI, ["owner/repo"], mockCallGitHubAPI);

		expect(mockUI.registerWidget).toHaveBeenCalledWith({
			id: "github-commit-stats-widget",
			name: "GitHubコミット統計",
			description: "今月のGitHubコミット行数を表示",
			position: "top-right",
			size: "medium",
			icon: "📊",
			render: expect.any(Function),
		});
	});

	it("should render widget with monthly statistics", async () => {
		await registerWidget(mockUI, ["owner/repo"], mockCallGitHubAPI);

		const registerCall = mockUI.registerWidget.mock.calls[0][0];
		const render = registerCall.render;

		// Mock getMultiRepoCommitLines to return stats for each day
		const mockGetMultiRepoCommitLines = vi.fn();
		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockImplementation(mockGetMultiRepoCommitLines);

		// Get current date to determine days in month
		const today = new Date();
		const year = today.getFullYear();
		const month = today.getMonth() + 1;
		const lastDay = new Date(year, month, 0);
		const daysInMonth = lastDay.getDate();

		// Return stats for each day in current month
		for (let day = 1; day <= daysInMonth; day++) {
			const date = new Date(year, month - 1, day);
			const dateStr = date.toISOString().split("T")[0];
			mockGetMultiRepoCommitLines.mockResolvedValueOnce({
				date: dateStr,
				commits: 1,
				additions: 10,
				deletions: 5,
				netLines: 5,
				repoStats: [],
			});
		}

		const result = await render();

		expect(result).toMatchObject({
			type: "stat-card",
			props: {
				title: "今月のコミット統計",
				value: expect.any(String),
				description: expect.stringContaining("コミット:"),
				trend: expect.stringMatching(/^(up|down|neutral)$/),
				trendValue: expect.stringContaining("commits"),
				icon: "📊",
			},
		});

		// Should have been called once for each day in the month
		expect(mockGetMultiRepoCommitLines).toHaveBeenCalledTimes(daysInMonth);
	});

	it("should aggregate monthly statistics correctly", async () => {
		await registerWidget(mockUI, ["owner/repo"], mockCallGitHubAPI);

		const registerCall = mockUI.registerWidget.mock.calls[0][0];
		const render = registerCall.render;

		const mockGetMultiRepoCommitLines = vi.fn();
		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockImplementation(mockGetMultiRepoCommitLines);

		// Get current date to determine days in month
		const today = new Date();
		const year = today.getFullYear();
		const month = today.getMonth() + 1;
		const lastDay = new Date(year, month, 0);
		const daysInMonth = lastDay.getDate();

		// Return different stats for first two days
		const date1 = new Date(year, month - 1, 1);
		const date2 = new Date(year, month - 1, 2);
		mockGetMultiRepoCommitLines
			.mockResolvedValueOnce({
				date: date1.toISOString().split("T")[0],
				commits: 2,
				additions: 20,
				deletions: 10,
				netLines: 10,
				repoStats: [],
			})
			.mockResolvedValueOnce({
				date: date2.toISOString().split("T")[0],
				commits: 1,
				additions: 10,
				deletions: 5,
				netLines: 5,
				repoStats: [],
			});

		// Mock remaining days with zero stats
		for (let day = 3; day <= daysInMonth; day++) {
			const date = new Date(year, month - 1, day);
			mockGetMultiRepoCommitLines.mockResolvedValueOnce({
				date: date.toISOString().split("T")[0],
				commits: 0,
				additions: 0,
				deletions: 0,
				netLines: 0,
				repoStats: [],
			});
		}

		const result = await render();

		expect(result.props.value).toBe("+15"); // 10 + 5
		expect(result.props.description).toContain("コミット: 3件");
		expect(result.props.description).toContain("追加: +30");
		expect(result.props.description).toContain("削除: -15");
	});

	it("should handle negative net lines", async () => {
		await registerWidget(mockUI, ["owner/repo"], mockCallGitHubAPI);

		const registerCall = mockUI.registerWidget.mock.calls[0][0];
		const render = registerCall.render;

		const mockGetMultiRepoCommitLines = vi.fn();
		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockImplementation(mockGetMultiRepoCommitLines);

		// Get current date to determine days in month
		const today = new Date();
		const year = today.getFullYear();
		const month = today.getMonth() + 1;
		const lastDay = new Date(year, month, 0);
		const daysInMonth = lastDay.getDate();

		const date1 = new Date(year, month - 1, 1);
		mockGetMultiRepoCommitLines.mockResolvedValueOnce({
			date: date1.toISOString().split("T")[0],
			commits: 1,
			additions: 10,
			deletions: 20,
			netLines: -10,
			repoStats: [],
		});

		// Mock remaining days
		for (let day = 2; day <= daysInMonth; day++) {
			const date = new Date(year, month - 1, day);
			mockGetMultiRepoCommitLines.mockResolvedValueOnce({
				date: date.toISOString().split("T")[0],
				commits: 0,
				additions: 0,
				deletions: 0,
				netLines: 0,
				repoStats: [],
			});
		}

		const result = await render();

		expect(result.props.value).toBe("-10");
		expect(result.props.trend).toBe("down");
	});

	it("should return error message on failure", async () => {
		await registerWidget(mockUI, ["owner/repo"], mockCallGitHubAPI);

		const registerCall = mockUI.registerWidget.mock.calls[0][0];
		const render = registerCall.render;

		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockRejectedValue(new Error("API error"));

		const result = await render();

		expect(result).toEqual({
			type: "text",
			props: {
				content: "GitHubコミット統計の取得に失敗しました",
				variant: "danger",
			},
		});
	});

	it("should process days sequentially", async () => {
		await registerWidget(mockUI, ["owner/repo"], mockCallGitHubAPI);

		const registerCall = mockUI.registerWidget.mock.calls[0][0];
		const render = registerCall.render;

		// Get current date to determine days in month
		const today = new Date();
		const year = today.getFullYear();
		const month = today.getMonth() + 1;
		const lastDay = new Date(year, month, 0);
		const daysInMonth = lastDay.getDate();

		const callOrder: number[] = [];
		const mockGetMultiRepoCommitLines = vi.fn().mockImplementation(async () => {
			const day = callOrder.length + 1;
			callOrder.push(day);
			const date = new Date(year, month - 1, day);
			return {
				date: date.toISOString().split("T")[0],
				commits: 0,
				additions: 0,
				deletions: 0,
				netLines: 0,
				repoStats: [],
			};
		});

		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockImplementation(mockGetMultiRepoCommitLines);

		await render();

		// Verify calls were made sequentially
		expect(callOrder.length).toBe(daysInMonth);
		expect(callOrder[0]).toBe(1);
		expect(callOrder[daysInMonth - 1]).toBe(daysInMonth);
	});
});
