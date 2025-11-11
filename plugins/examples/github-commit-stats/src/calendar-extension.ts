/**
 * Calendar Extension Module for GitHub Commit Stats Plugin
 *
 * Registers calendar extension to display commit statistics in calendar cells.
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
 * Calendar API interface (simplified for plugin context)
 */
interface CalendarAPI {
	registerExtension: (options: {
		id: string;
		name: string;
		description: string;
		getDailyData: (date: string) => Promise<{
			badge?: string;
			badgeColor?: string;
			tooltip?: string;
			detailSections?: Array<{
				title: string;
				content: string;
				icon: string;
			}>;
		} | null>;
	}) => Promise<void>;
	unregisterExtension: (id: string) => Promise<void>;
}

/**
 * Register calendar extension for GitHub commit stats
 *
 * @param calendar Calendar API instance
 * @param selectedRepos Array of repository names in format "owner/repo"
 * @param callGitHubAPI Function to call GitHub API
 */
export async function registerCalendarExtension(
	calendar: CalendarAPI,
	selectedRepos: string[],
	callGitHubAPI: CallGitHubAPI,
): Promise<void> {
	await calendar.registerExtension({
		id: "github-commit-stats",
		name: "GitHubコミット統計",
		description: "GitHubコミット行数をカレンダーに表示",
		async getDailyData(date: string) {
			try {
				const stats = await getMultiRepoCommitLines(
					selectedRepos,
					date,
					callGitHubAPI,
				);

				// Build tooltip with repository breakdown
				const repoBreakdown = stats.repoStats
					.filter((r) => r.commits > 0)
					.map(
						(r) =>
							`${r.repo}: ${r.commits}件 (+${r.additions}, -${r.deletions})`,
					)
					.join("\n");

				const tooltip =
					stats.commits > 0
						? `コミット: ${stats.commits}件 (${stats.repoStats.filter((r) => r.commits > 0).length}リポジトリ)\n追加: +${stats.additions}, 削除: -${stats.deletions}${repoBreakdown ? `\n\n${repoBreakdown}` : ""}`
						: undefined;

				// Build detail content with repository breakdown
				const detailContent =
					stats.commits > 0
						? `コミット数: ${stats.commits}件 (${stats.repoStats.filter((r) => r.commits > 0).length}リポジトリ)\n追加行数: +${stats.additions}\n削除行数: -${stats.deletions}\n純増行数: ${stats.netLines > 0 ? "+" : ""}${stats.netLines}${repoBreakdown ? `\n\n【リポジトリ別】\n${repoBreakdown}` : ""}`
						: "コミットなし";

				return {
					badge:
						stats.netLines > 0
							? `+${stats.netLines}`
							: stats.netLines < 0
								? `${stats.netLines}`
								: stats.commits > 0
									? `${stats.commits} commits`
									: undefined,
					badgeColor:
						stats.netLines > 0
							? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
							: stats.netLines < 0
								? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
								: stats.commits > 0
									? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
									: undefined,
					tooltip,
					detailSections: [
						{
							title: "GitHubコミット統計",
							content: detailContent,
							icon: "📊",
						},
					],
				};
			} catch (_error) {
				// Return null on error to hide extension data
				return null;
			}
		},
	});
}
