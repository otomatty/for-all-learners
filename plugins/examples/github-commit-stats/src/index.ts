/**
 * GitHub Commit Stats Plugin
 *
 * This plugin displays GitHub commit statistics in the calendar and dashboard.
 *
 * Features:
 * - Calendar extension: Shows commit line counts in calendar cells
 * - Widget: Displays monthly commit statistics on dashboard
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ Plugin loader system
 *
 * Dependencies:
 *   ├─ lib/plugins/integration-helpers/github-api.ts (via API)
 *   ├─ lib/plugins/integration-helpers/github-auth.ts (via API)
 *   └─ Plugin API (Calendar, UI, Integration, Storage)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

/**
 * Plugin activation function
 *
 * @param api Plugin API instance
 * @param config User configuration (owner, repo)
 * @returns Plugin instance with dispose method
 */
async function _activate(
	api: any, // PluginAPI - types not available in worker context
	config?: Record<string, unknown>,
): Promise<{
	methods?: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
	dispose?: () => void | Promise<void>;
}> {
	const owner = (config?.owner as string) || "";
	const repo = (config?.repo as string) || "";

	if (!owner || !repo) {
		api.notifications.error(
			"GitHubコミット統計プラグイン: ownerとrepoの設定が必要です",
		);
		return {};
	}

	// Get or refresh GitHub token
	// Note: In a real implementation, this would use the github-auth helper
	// For now, we'll use the storage API directly
	const tokenData = await api.storage.get("github_oauth_token");

	if (!tokenData) {
		api.notifications.warning(
			"GitHubコミット統計プラグイン: GitHub認証トークンが設定されていません",
		);
		return {};
	}

	// Register GitHub API with authentication
	// Note: In a real implementation, this would use registerGitHubAPI helper
	// For now, we'll register it directly
	try {
		await api.integration.registerExternalAPI({
			id: "github-api",
			name: "GitHub API",
			description: "GitHub REST API",
			baseUrl: "https://api.github.com",
			defaultHeaders: {
				Accept: "application/vnd.github.v3+json",
			},
			auth: {
				type: "bearer",
				token: tokenData.accessToken || tokenData,
			},
		});
	} catch (_error) {
		// API might already be registered, try to unregister and re-register
		try {
			await api.integration.unregisterExternalAPI("github-api");
			await api.integration.registerExternalAPI({
				id: "github-api",
				name: "GitHub API",
				description: "GitHub REST API",
				baseUrl: "https://api.github.com",
				defaultHeaders: {
					Accept: "application/vnd.github.v3+json",
				},
				auth: {
					type: "bearer",
					token: tokenData.accessToken || tokenData,
				},
			});
		} catch {
			// Ignore errors on re-registration
		}
	}

	// Helper function to get daily commit lines
	async function getDailyCommitLines(date: string): Promise<{
		date: string;
		commits: number;
		additions: number;
		deletions: number;
		netLines: number;
	}> {
		// Parse date and create date range for the day
		const dateObj = new Date(date);
		const startDate = new Date(dateObj);
		startDate.setHours(0, 0, 0, 0);

		const endDate = new Date(dateObj);
		endDate.setHours(23, 59, 59, 999);

		const startDateISO = startDate.toISOString();
		const endDateISO = endDate.toISOString();

		// Fetch commits for the date
		const commitsResponse = await api.integration.callExternalAPI(
			"github-api",
			{
				method: "GET",
				url: `/repos/${owner}/${repo}/commits`,
				query: {
					since: startDateISO,
					until: endDateISO,
					per_page: "100",
				},
			},
		);

		if (commitsResponse.status !== 200) {
			return {
				date,
				commits: 0,
				additions: 0,
				deletions: 0,
				netLines: 0,
			};
		}

		const commits = commitsResponse.data || [];

		// Filter commits that actually occurred on this date
		const commitsOnDate = commits.filter((commit: any) => {
			const commitDate = new Date(commit.commit?.author?.date || "");
			const commitDateStr = commitDate.toISOString().split("T")[0];
			return commitDateStr === date;
		});

		// Fetch stats for each commit
		const statsPromises = commitsOnDate.map(async (commit: any) => {
			try {
				const statsResponse = await api.integration.callExternalAPI(
					"github-api",
					{
						method: "GET",
						url: `/repos/${owner}/${repo}/commits/${commit.sha}`,
					},
				);

				if (statsResponse.status === 200 && statsResponse.data?.stats) {
					return statsResponse.data.stats;
				}
				return { additions: 0, deletions: 0, total: 0 };
			} catch {
				return { additions: 0, deletions: 0, total: 0 };
			}
		});

		const statsResults = await Promise.all(statsPromises);

		// Aggregate statistics
		const additions = statsResults.reduce(
			(sum: number, stats: any) => sum + (stats.additions || 0),
			0,
		);
		const deletions = statsResults.reduce(
			(sum: number, stats: any) => sum + (stats.deletions || 0),
			0,
		);
		const netLines = additions - deletions;

		return {
			date,
			commits: commitsOnDate.length,
			additions,
			deletions,
			netLines,
		};
	}

	// Register calendar extension
	await api.calendar.registerExtension({
		id: "github-commit-stats",
		name: "GitHubコミット統計",
		description: "GitHubコミット行数をカレンダーに表示",
		async getDailyData(date: string) {
			try {
				const stats = await getDailyCommitLines(date);

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
					tooltip: `コミット: ${stats.commits}件, 追加: +${stats.additions}, 削除: -${stats.deletions}`,
					detailSections: [
						{
							title: "GitHubコミット統計",
							content: `コミット数: ${stats.commits}件\n追加行数: +${stats.additions}\n削除行数: -${stats.deletions}\n純増行数: ${stats.netLines > 0 ? "+" : ""}${stats.netLines}`,
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

	// Register widget
	await api.ui.registerWidget({
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

				// Calculate first and last day of month
				const firstDay = new Date(year, month - 1, 1);
				const lastDay = new Date(year, month, 0);

				// Get stats for all days in the month
				const days: string[] = [];
				for (
					let d = new Date(firstDay);
					d <= lastDay;
					d.setDate(d.getDate() + 1)
				) {
					days.push(d.toISOString().split("T")[0]);
				}

				const statsPromises = days.map((date) => getDailyCommitLines(date));
				const allStats = await Promise.all(statsPromises);

				const totalCommits = allStats.reduce(
					(sum, stats) => sum + stats.commits,
					0,
				);
				const totalAdditions = allStats.reduce(
					(sum, stats) => sum + stats.additions,
					0,
				);
				const totalDeletions = allStats.reduce(
					(sum, stats) => sum + stats.deletions,
					0,
				);
				const netLines = totalAdditions - totalDeletions;

				return {
					type: "stat-card",
					props: {
						title: "今月のコミット統計",
						value: netLines > 0 ? `+${netLines}` : `${netLines}`,
						description: `コミット: ${totalCommits}件 (追加: +${totalAdditions}, 削除: -${totalDeletions})`,
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

	// Note: Editor extension registration is complex in Worker context
	// For now, we'll use a command-based approach to insert commit stats
	// A full editor extension would require creating a Tiptap Extension object,
	// which is difficult to serialize from Worker context.
	// The command approach is simpler and more practical for this use case.

	// Register command to insert commit stats counter
	await api.ui.registerCommand({
		id: "github-commit-stats-insert-counter",
		name: "GitHubコミット行数カウンターを挿入",
		description: "今日のGitHubコミット行数をエディタに挿入",
		icon: "📊",
		async execute() {
			try {
				const today = new Date().toISOString().split("T")[0];
				const stats = await getDailyCommitLines(today);

				// Insert commit stats as text in the editor
				const content = `今日のGitHubコミット統計:
- コミット数: ${stats.commits}件
- 追加行数: +${stats.additions}
- 削除行数: -${stats.deletions}
- 純増行数: ${stats.netLines > 0 ? "+" : ""}${stats.netLines}
`;

				// Insert content at cursor position using insertContent command
				await api.editor.executeCommand("insertContent", content);

				api.notifications.success("コミット統計を挿入しました");
			} catch (error) {
				api.notifications.error(
					"コミット統計の取得に失敗しました: " +
						(error instanceof Error ? error.message : String(error)),
				);
			}
		},
	});

	return {
		dispose: async () => {
			await api.calendar.unregisterExtension("github-commit-stats");
			await api.ui.unregisterWidget("github-commit-stats-widget");
			await api.ui.unregisterCommand("github-commit-stats-insert-counter");
			try {
				await api.integration.unregisterExternalAPI("github-api");
			} catch {
				// Ignore errors on cleanup
			}
		},
	};
}
