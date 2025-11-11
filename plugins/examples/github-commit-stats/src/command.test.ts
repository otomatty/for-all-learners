/**
 * Command Tests
 *
 * Tests for command registration and execution.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ plugins/examples/github-commit-stats/src/command.ts
 *   ├─ plugins/examples/github-commit-stats/src/commit-stats.ts
 *   └─ vitest (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import type { MockedFunction } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerCommand } from "./command";
import type { CallGitHubAPI } from "./commit-stats";

type UIAPI = Parameters<typeof registerCommand>[0];
type EditorAPI = Parameters<typeof registerCommand>[1];
type NotificationsAPI = Parameters<typeof registerCommand>[2];

type MockUI = UIAPI & {
	registerCommand: MockedFunction<UIAPI["registerCommand"]>;
	unregisterCommand: MockedFunction<UIAPI["unregisterCommand"]>;
};

type MockEditor = EditorAPI & {
	executeCommand: MockedFunction<EditorAPI["executeCommand"]>;
};

type MockNotifications = NotificationsAPI & {
	success: MockedFunction<NotificationsAPI["success"]>;
	error: MockedFunction<NotificationsAPI["error"]>;
};

describe("Command", () => {
	let mockUI: MockUI;
	let mockEditor: MockEditor;
	let mockNotifications: MockNotifications;
	let mockCallGitHubAPI: ReturnType<typeof vi.fn<CallGitHubAPI>>;

	beforeEach(() => {
		mockUI = {
			registerCommand: vi.fn() as MockedFunction<UIAPI["registerCommand"]>,
			unregisterCommand: vi.fn() as MockedFunction<UIAPI["unregisterCommand"]>,
		} as MockUI;
		mockEditor = {
			executeCommand: vi.fn() as MockedFunction<EditorAPI["executeCommand"]>,
		} as MockEditor;
		mockNotifications = {
			success: vi.fn() as MockedFunction<NotificationsAPI["success"]>,
			error: vi.fn() as MockedFunction<NotificationsAPI["error"]>,
		} as MockNotifications;
		mockCallGitHubAPI = vi.fn();
	});

	afterEach(() => {
		// Restore all mocks to avoid interference with other tests
		vi.restoreAllMocks();
	});

	it("should register command with correct configuration", async () => {
		await registerCommand(
			mockUI,
			mockEditor,
			mockNotifications,
			["owner/repo"],
			mockCallGitHubAPI,
		);

		expect(mockUI.registerCommand).toHaveBeenCalledWith({
			id: "github-commit-stats-insert-counter",
			name: "GitHubコミット行数カウンターを挿入",
			description: "今日のGitHubコミット行数をエディタに挿入",
			icon: "📊",
			execute: expect.any(Function),
		});
	});

	it("should insert commit stats into editor on success", async () => {
		await registerCommand(
			mockUI,
			mockEditor,
			mockNotifications,
			["owner/repo"],
			mockCallGitHubAPI,
		);

		const registerCall = mockUI.registerCommand.mock.calls[0][0];
		const execute = registerCall.execute;

		// Mock getMultiRepoCommitLines with today's date
		const today = new Date().toISOString().split("T")[0];
		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockResolvedValue({
			date: today,
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

		await execute();

		expect(mockEditor.executeCommand).toHaveBeenCalledWith(
			"insertContent",
			expect.stringContaining("今日のGitHubコミット統計:"),
		);
		expect(mockNotifications.success).toHaveBeenCalledWith(
			"コミット統計を挿入しました",
		);
		expect(mockNotifications.error).not.toHaveBeenCalled();
	});

	it("should include repository breakdown in content", async () => {
		await registerCommand(
			mockUI,
			mockEditor,
			mockNotifications,
			["owner/repo1", "owner/repo2"],
			mockCallGitHubAPI,
		);

		const registerCall = mockUI.registerCommand.mock.calls[0][0];
		const execute = registerCall.execute;

		const today = new Date().toISOString().split("T")[0];
		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockResolvedValue({
			date: today,
			commits: 3,
			additions: 40,
			deletions: 20,
			netLines: 20,
			repoStats: [
				{
					repo: "owner/repo1",
					commits: 2,
					additions: 30,
					deletions: 15,
					netLines: 15,
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

		await execute();

		const insertContentCall = mockEditor.executeCommand.mock.calls[0];
		const content = insertContentCall[1] as string;

		expect(content).toContain("owner/repo1");
		expect(content).toContain("owner/repo2");
		expect(content).toContain("【リポジトリ別】");
		expect(content).toContain("コミット数: 3件");
		expect(content).toContain("追加行数: +40");
		expect(content).toContain("削除行数: -20");
		expect(content).toContain("純増行数: +20");
	});

	it("should handle negative net lines correctly", async () => {
		await registerCommand(
			mockUI,
			mockEditor,
			mockNotifications,
			["owner/repo"],
			mockCallGitHubAPI,
		);

		const registerCall = mockUI.registerCommand.mock.calls[0][0];
		const execute = registerCall.execute;

		const today = new Date().toISOString().split("T")[0];
		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockResolvedValue({
			date: today,
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

		await execute();

		const insertContentCall = mockEditor.executeCommand.mock.calls[0];
		const content = insertContentCall[1] as string;

		expect(content).toContain("純増行数: -10");
	});

	it("should handle zero net lines correctly", async () => {
		await registerCommand(
			mockUI,
			mockEditor,
			mockNotifications,
			["owner/repo"],
			mockCallGitHubAPI,
		);

		const registerCall = mockUI.registerCommand.mock.calls[0][0];
		const execute = registerCall.execute;

		const today = new Date().toISOString().split("T")[0];
		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockResolvedValue({
			date: today,
			commits: 1,
			additions: 10,
			deletions: 10,
			netLines: 0,
			repoStats: [
				{
					repo: "owner/repo",
					commits: 1,
					additions: 10,
					deletions: 10,
					netLines: 0,
				},
			],
		});

		await execute();

		const insertContentCall = mockEditor.executeCommand.mock.calls[0];
		const content = insertContentCall[1] as string;

		expect(content).toContain("純増行数: 0");
	});

	it("should not include repository breakdown when no commits", async () => {
		await registerCommand(
			mockUI,
			mockEditor,
			mockNotifications,
			["owner/repo"],
			mockCallGitHubAPI,
		);

		const registerCall = mockUI.registerCommand.mock.calls[0][0];
		const execute = registerCall.execute;

		const today = new Date().toISOString().split("T")[0];
		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockResolvedValue({
			date: today,
			commits: 0,
			additions: 0,
			deletions: 0,
			netLines: 0,
			repoStats: [],
		});

		await execute();

		const insertContentCall = mockEditor.executeCommand.mock.calls[0];
		const content = insertContentCall[1] as string;

		expect(content).not.toContain("【リポジトリ別】");
	});

	it("should show error notification on failure", async () => {
		await registerCommand(
			mockUI,
			mockEditor,
			mockNotifications,
			["owner/repo"],
			mockCallGitHubAPI,
		);

		const registerCall = mockUI.registerCommand.mock.calls[0][0];
		const execute = registerCall.execute;

		const error = new Error("API error");
		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockRejectedValue(error);

		await execute();

		expect(mockEditor.executeCommand).not.toHaveBeenCalled();
		expect(mockNotifications.success).not.toHaveBeenCalled();
		expect(mockNotifications.error).toHaveBeenCalledWith(
			"コミット統計の取得に失敗しました: API error",
		);
	});

	it("should handle non-Error exceptions", async () => {
		await registerCommand(
			mockUI,
			mockEditor,
			mockNotifications,
			["owner/repo"],
			mockCallGitHubAPI,
		);

		const registerCall = mockUI.registerCommand.mock.calls[0][0];
		const execute = registerCall.execute;

		vi.spyOn(
			await import("./commit-stats"),
			"getMultiRepoCommitLines",
		).mockRejectedValue("String error");

		await execute();

		expect(mockNotifications.error).toHaveBeenCalledWith(
			"コミット統計の取得に失敗しました: String error",
		);
	});
});
