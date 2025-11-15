/**
 * Widget Module for GitHub Commit Stats Plugin
 *
 * Registers widget to display monthly commit statistics on dashboard.
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
	registerWidget: (options: {
		id: string;
		name: string;
		description: string;
		position: string;
		size: string;
		icon: string;
		render: () => Promise<{
			type: string;
			props: Record<string, unknown>;
		}>;
	}) => Promise<void>;
	unregisterWidget: (id: string) => Promise<void>;
}

/**
 * Register widget for GitHub commit stats
 *
 * @param ui UI API instance
 * @param selectedRepos Array of repository names in format "owner/repo"
 * @param callGitHubAPI Function to call GitHub API
 */
export async function registerWidget(
	ui: UIAPI,
	selectedRepos: string[],
	callGitHubAPI: CallGitHubAPI,
): Promise<void> {
	await ui.registerWidget({
		id: "github-commit-stats-widget",
		name: "GitHubコミット統計",
		description: "今月のGitHubコミット行数を表示",
		position: "top-right",
		size: "medium",
		icon: "📊",
		async render() {
			try {
				const today = new Date();
				const year = today.getFullYear();
				const month = today.getMonth() + 1;

				// Calculate last day of month
				const lastDay = new Date(year, month, 0);

				// Get stats for each day in the month sequentially (one at a time)
				// Performance note: For a 31-day month with multiple repositories,
				// this will result in 31+ sequential API calls. This is intentional
				// to avoid GitHub API rate limiting (MAX_CONCURRENT_GITHUB_API_CALLS = 1).
				// The widget may take several seconds to load, especially for months with
				// many days and multiple repositories. Consider showing a loading indicator
				// in the UI while this data is being fetched.
				const daysInMonth = lastDay.getDate();
				const allDailyStats: Array<{
					date: string;
					commits: number;
					additions: number;
					deletions: number;
					netLines: number;
				}> = [];

				for (let day = 1; day <= daysInMonth; day++) {
					const date = new Date(year, month - 1, day);
					const dateStr = date.toISOString().split("T")[0];
					const stats = await getMultiRepoCommitLines(
						selectedRepos,
						dateStr,
						callGitHubAPI,
					);
					allDailyStats.push({
						date: dateStr,
						commits: stats.commits,
						additions: stats.additions,
						deletions: stats.deletions,
						netLines: stats.netLines,
					});
				}

				// Aggregate monthly statistics
				const totalCommits = allDailyStats.reduce(
					(sum, s) => sum + s.commits,
					0,
				);
				const totalAdditions = allDailyStats.reduce(
					(sum, s) => sum + s.additions,
					0,
				);
				const totalDeletions = allDailyStats.reduce(
					(sum, s) => sum + s.deletions,
					0,
				);
				const netLines = totalAdditions - totalDeletions;

				return {
					type: "stat-card",
					props: {
						title: "今月のコミット統計",
						value: netLines > 0 ? `+${netLines}` : `${netLines}`,
						description: `コミット: ${totalCommits}件 (${selectedRepos.length}リポジトリ)\n追加: +${totalAdditions}, 削除: -${totalDeletions}`,
						trend: netLines > 0 ? "up" : netLines < 0 ? "down" : "neutral",
						trendValue: `${totalCommits} commits`,
						icon: "📊",
					},
				};
			} catch (_error) {
				return {
					type: "text",
					props: {
						content: "GitHubコミット統計の取得に失敗しました",
						variant: "danger",
					},
				};
			}
		},
	});
}
