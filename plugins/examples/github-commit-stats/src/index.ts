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
 * @param config User configuration (githubUser, selectedRepos, github_oauth_token)
 * @returns Plugin instance with dispose method
 */
async function _activate(
	api: any, // PluginAPI - types not available in worker context
	config?: Record<string, unknown>,
): Promise<{
	methods?: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
	dispose?: () => void | Promise<void>;
}> {
	// Get GitHub user and selected repositories from config
	const githubUser = (config?.githubUser as string) || "";
	const selectedReposStr = (config?.selectedRepos as string) || "[]";

	// Parse selected repositories
	let selectedRepos: string[] = [];
	try {
		selectedRepos =
			typeof selectedReposStr === "string"
				? (JSON.parse(selectedReposStr) as string[])
				: Array.isArray(selectedReposStr)
					? (selectedReposStr as string[])
					: [];
	} catch {
		selectedRepos = [];
	}

	if (!githubUser || selectedRepos.length === 0) {
		api.notifications.error(
			"GitHubコミット統計プラグイン: GitHubユーザー名と監視するリポジトリの選択が必要です",
		);
		return {};
	}

	// Get GitHub token from config or storage (backward compatibility)
	let tokenData: string | undefined;
	if (config?.github_oauth_token) {
		tokenData = config.github_oauth_token as string;
	} else {
		const storedToken = await api.storage.get("github_oauth_token");
		tokenData =
			typeof storedToken === "string"
				? storedToken
				: (storedToken as { accessToken?: string })?.accessToken;
	}

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
				token: tokenData,
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
					token: tokenData,
				},
			});
		} catch {
			// Ignore errors on re-registration
		}
	}

	// Helper function to get daily commit lines for a single repository
	async function getDailyCommitLinesForRepo(
		owner: string,
		repo: string,
		date: string,
	): Promise<{
		date: string;
		commits: number;
		additions: number;
		deletions: number;
		netLines: number;
		repo: string;
	}> {
		// Parse date and create date range for the day
		const dateObj = new Date(date);
		const startDate = new Date(dateObj);
		startDate.setHours(0, 0, 0, 0);

		const endDate = new Date(dateObj);
		endDate.setHours(23, 59, 59, 999);

		const startDateISO = startDate.toISOString();
		const endDateISO = endDate.toISOString();

		try {
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
					repo: `${owner}/${repo}`,
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
				repo: `${owner}/${repo}`,
			};
		} catch (_error) {
			// Return zero stats on error
			return {
				date,
				commits: 0,
				additions: 0,
				deletions: 0,
				netLines: 0,
				repo: `${owner}/${repo}`,
			};
		}
	}

	// Helper function to get daily commit lines for multiple repositories
	async function getMultiRepoCommitLines(
		repos: string[], // ["owner/repo", ...]
		date: string,
	): Promise<{
		date: string;
		commits: number;
		additions: number;
		deletions: number;
		netLines: number;
		repoStats: Array<{
			repo: string;
			commits: number;
			additions: number;
			deletions: number;
			netLines: number;
		}>;
	}> {
		// Fetch stats for all repositories in parallel
		const statsPromises = repos.map(async (repoFullName: string) => {
			const [owner, repo] = repoFullName.split("/");
			if (!owner || !repo) {
				return {
					date,
					commits: 0,
					additions: 0,
					deletions: 0,
					netLines: 0,
					repo: repoFullName,
				};
			}
			return getDailyCommitLinesForRepo(owner, repo, date);
		});

		const allStats = await Promise.all(statsPromises);

		// Aggregate statistics across all repositories
		const totalCommits = allStats.reduce((sum, s) => sum + s.commits, 0);
		const totalAdditions = allStats.reduce((sum, s) => sum + s.additions, 0);
		const totalDeletions = allStats.reduce((sum, s) => sum + s.deletions, 0);
		const totalNetLines = totalAdditions - totalDeletions;

		return {
			date,
			commits: totalCommits,
			additions: totalAdditions,
			deletions: totalDeletions,
			netLines: totalNetLines,
			repoStats: allStats.map((s) => ({
				repo: s.repo,
				commits: s.commits,
				additions: s.additions,
				deletions: s.deletions,
				netLines: s.netLines,
			})),
		};
	}

	// Register calendar extension
	await api.calendar.registerExtension({
		id: "github-commit-stats",
		name: "GitHubコミット統計",
		description: "GitHubコミット行数をカレンダーに表示",
		async getDailyData(date: string) {
			try {
				const stats = await getMultiRepoCommitLines(selectedRepos, date);

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

				const _startDateISO = firstDay.toISOString().split("T")[0];
				const _endDateISO = lastDay.toISOString().split("T")[0];

				// Get stats for each day in the month and aggregate
				const daysInMonth = lastDay.getDate();
				const dailyStatsPromises: Promise<{
					date: string;
					commits: number;
					additions: number;
					deletions: number;
					netLines: number;
				}>[] = [];

				for (let day = 1; day <= daysInMonth; day++) {
					const date = new Date(year, month - 1, day);
					const dateStr = date.toISOString().split("T")[0];
					dailyStatsPromises.push(
						getMultiRepoCommitLines(selectedRepos, dateStr).then((stats) => ({
							date: dateStr,
							commits: stats.commits,
							additions: stats.additions,
							deletions: stats.deletions,
							netLines: stats.netLines,
						})),
					);
				}

				const allDailyStats = await Promise.all(dailyStatsPromises);

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
				const stats = await getMultiRepoCommitLines(selectedRepos, today);

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

// Export activate function (required by plugin loader)
// This will be available in the global scope when the plugin code is loaded
// For IIFE format, we need to assign it to a global variable
if (typeof self !== "undefined") {
	(self as any).activate = _activate;
} else if (typeof globalThis !== "undefined") {
	(globalThis as any).activate = _activate;
} else if (typeof window !== "undefined") {
	(window as any).activate = _activate;
}
