/**
 * Command Module for GitHub Commit Stats Plugin
 *
 * Registers command to insert commit statistics into editor.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ plugins/examples/github-commit-stats/src/index.ts
 *
 * Dependencies:
 *   └─ ./commit-stats.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import type { CallGitHubAPI } from "./commit-stats";
import { getMultiRepoCommitLines } from "./commit-stats";

/**
 * UI API interface (simplified for plugin context)
 */
interface UIAPI {
	registerCommand: (options: {
		id: string;
		name: string;
		description: string;
		icon: string;
		execute: () => Promise<void>;
	}) => Promise<void>;
	unregisterCommand: (id: string) => Promise<void>;
}

/**
 * Editor API interface (simplified for plugin context)
 */
interface EditorAPI {
	executeCommand: (command: string, ...args: unknown[]) => Promise<void>;
}

/**
 * Notifications API interface (simplified for plugin context)
 */
interface NotificationsAPI {
	success: (message: string) => void;
	error: (message: string) => void;
}

/**
 * Register command to insert commit stats counter
 *
 * @param ui UI API instance
 * @param editor Editor API instance
 * @param notifications Notifications API instance
 * @param selectedRepos Array of repository names in format "owner/repo"
 * @param callGitHubAPI Function to call GitHub API
 */
export async function registerCommand(
	ui: UIAPI,
	editor: EditorAPI,
	notifications: NotificationsAPI,
	selectedRepos: string[],
	callGitHubAPI: CallGitHubAPI,
): Promise<void> {
	await ui.registerCommand({
		id: "github-commit-stats-insert-counter",
		name: "GitHubコミット行数カウンターを挿入",
		description: "今日のGitHubコミット行数をエディタに挿入",
		icon: "📊",
		async execute() {
			try {
				const today = new Date().toISOString().split("T")[0];
				const stats = await getMultiRepoCommitLines(
					selectedRepos,
					today,
					callGitHubAPI,
				);

				// Build repository breakdown
				const repoBreakdown = stats.repoStats
					.filter((r) => r.commits > 0)
					.map(
						(r) =>
							`  - ${r.repo}: ${r.commits}件 (+${r.additions}, -${r.deletions})`,
					)
					.join("\n");

				// Insert commit stats as text in the editor
				const content = `今日のGitHubコミット統計:
- コミット数: ${stats.commits}件 (${stats.repoStats.filter((r) => r.commits > 0).length}リポジトリ)
- 追加行数: +${stats.additions}
- 削除行数: -${stats.deletions}
- 純増行数: ${stats.netLines > 0 ? "+" : ""}${stats.netLines}
${repoBreakdown ? `\n【リポジトリ別】\n${repoBreakdown}` : ""}
`;

				// Insert content at cursor position using insertContent command
				await editor.executeCommand("insertContent", content);

				notifications.success("コミット統計を挿入しました");
			} catch (error) {
				notifications.error(
					"コミット統計の取得に失敗しました: " +
						(error instanceof Error ? error.message : String(error)),
				);
			}
		},
	});
}
