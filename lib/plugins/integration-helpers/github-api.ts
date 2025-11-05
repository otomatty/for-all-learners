/**
 * GitHub API Helper
 *
 * Helper functions for calling GitHub API via Integration Extension.
 * Provides convenient functions for fetching commit statistics and data.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ plugins/examples/github-commit-stats/src/index.ts (future)
 *
 * Dependencies:
 *   └─ lib/plugins/plugin-api.ts (IntegrationAPI)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import type { IntegrationAPI } from "../plugin-api";

// ============================================================================
// Types
// ============================================================================

/**
 * GitHub commit statistics for a specific date
 */
export interface GitHubCommitStats {
	/** Date string (YYYY-MM-DD) */
	date: string;
	/** Number of commits */
	commits: number;
	/** Total lines added */
	additions: number;
	/** Total lines deleted */
	deletions: number;
	/** Net lines (additions - deletions) */
	netLines: number;
}

/**
 * GitHub commit response from API
 */
interface GitHubCommitResponse {
	sha: string;
	commit: {
		author: {
			date: string;
		};
		message: string;
	};
	stats?: {
		additions: number;
		deletions: number;
		total: number;
	};
}

/**
 * GitHub API error response
 */
interface GitHubErrorResponse {
	message: string;
	documentation_url?: string;
}

// ============================================================================
// GitHub API Helpers
// ============================================================================

/**
 * Get commits for a specific date range
 *
 * @param owner Repository owner
 * @param repo Repository name
 * @param startDate Start date (ISO string)
 * @param endDate End date (ISO string)
 * @param api Integration API instance
 * @returns Array of commits
 */
export async function getCommitsByDate(
	owner: string,
	repo: string,
	startDate: string,
	endDate: string,
	api: IntegrationAPI,
): Promise<GitHubCommitResponse[]> {
	try {
		const response = await api.callExternalAPI(undefined, {
			method: "GET",
			url: `https://api.github.com/repos/${owner}/${repo}/commits`,
			headers: {
				Accept: "application/vnd.github.v3+json",
			},
			query: {
				since: startDate,
				until: endDate,
				per_page: "100",
			},
		});

		if (response.status !== 200) {
			const error = response.data as GitHubErrorResponse;
			throw new Error(
				`GitHub API error: ${error.message || `Status ${response.status}`}`,
			);
		}

		return (response.data as GitHubCommitResponse[]) || [];
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(`Failed to fetch commits: ${String(error)}`);
	}
}

/**
 * Get commit statistics (additions, deletions) for a specific commit
 *
 * @param owner Repository owner
 * @param repo Repository name
 * @param sha Commit SHA
 * @param api Integration API instance
 * @returns Commit statistics
 */
export async function getCommitStats(
	owner: string,
	repo: string,
	sha: string,
	api: IntegrationAPI,
): Promise<{ additions: number; deletions: number; total: number }> {
	try {
		const response = await api.callExternalAPI(undefined, {
			method: "GET",
			url: `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`,
			headers: {
				Accept: "application/vnd.github.v3+json",
			},
		});

		if (response.status !== 200) {
			const error = response.data as GitHubErrorResponse;
			throw new Error(
				`GitHub API error: ${error.message || `Status ${response.status}`}`,
			);
		}

		const commit = response.data as GitHubCommitResponse;
		if (commit.stats) {
			return commit.stats;
		}

		// If stats not available, return zeros
		return { additions: 0, deletions: 0, total: 0 };
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(`Failed to fetch commit stats: ${String(error)}`);
	}
}

/**
 * Get monthly commits with statistics for a date range
 *
 * Fetches all commits for the date range and calculates statistics per day.
 * This is optimized to avoid N+1 queries by fetching all commits in one call,
 * then fetching stats for each commit in parallel.
 *
 * @param owner Repository owner
 * @param repo Repository name
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @param api Integration API instance
 * @returns Map of date string to commit statistics
 */
export async function getMonthlyCommitsWithStats(
	owner: string,
	repo: string,
	startDate: string,
	endDate: string,
	api: IntegrationAPI,
): Promise<Map<string, GitHubCommitStats>> {
	const startDateObj = new Date(startDate);
	startDateObj.setHours(0, 0, 0, 0);
	const startDateISO = startDateObj.toISOString();

	const endDateObj = new Date(endDate);
	endDateObj.setHours(23, 59, 59, 999);
	const endDateISO = endDateObj.toISOString();

	// Fetch all commits for the date range in one call
	const commits = await getCommitsByDate(
		owner,
		repo,
		startDateISO,
		endDateISO,
		api,
	);

	// Group commits by date and fetch stats in parallel
	const dateStatsMap = new Map<string, GitHubCommitStats>();

	// Initialize stats for all dates in range
	const currentDate = new Date(startDateObj);
	while (currentDate <= endDateObj) {
		const dateStr = currentDate.toISOString().split("T")[0];
		dateStatsMap.set(dateStr, {
			date: dateStr,
			commits: 0,
			additions: 0,
			deletions: 0,
			netLines: 0,
		});
		currentDate.setDate(currentDate.getDate() + 1);
	}

	// Fetch stats for all commits in parallel
	const statsPromises = commits.map((commit) =>
		getCommitStats(owner, repo, commit.sha, api)
			.then((stats) => ({
				commit,
				stats,
			}))
			.catch(() => ({
				commit,
				stats: { additions: 0, deletions: 0, total: 0 },
			})),
	);

	const statsResults = await Promise.all(statsPromises);

	// Aggregate statistics by date
	for (const { commit, stats } of statsResults) {
		const commitDate = new Date(commit.commit.author.date);
		const commitDateStr = commitDate.toISOString().split("T")[0];

		// Only include commits within the date range
		if (commitDateStr >= startDate && commitDateStr <= endDate) {
			const dailyStats = dateStatsMap.get(commitDateStr);
			if (dailyStats) {
				dailyStats.commits += 1;
				dailyStats.additions += stats.additions;
				dailyStats.deletions += stats.deletions;
				dailyStats.netLines = dailyStats.additions - dailyStats.deletions;
			}
		}
	}

	return dateStatsMap;
}

/**
 * Get daily commit lines for a specific date
 *
 * Fetches all commits for the date and calculates total additions, deletions, and net lines.
 * Note: This function has N+1 query issues. For batch operations (e.g., monthly stats),
 * use `getMonthlyCommitsWithStats` instead.
 *
 * @param owner Repository owner
 * @param repo Repository name
 * @param date Date string (YYYY-MM-DD)
 * @param api Integration API instance
 * @returns Daily commit statistics
 */
export async function getDailyCommitLines(
	owner: string,
	repo: string,
	date: string,
	api: IntegrationAPI,
): Promise<GitHubCommitStats> {
	// Parse date and create date range for the day
	const dateObj = new Date(date);
	const startDate = new Date(dateObj);
	startDate.setHours(0, 0, 0, 0);

	const endDate = new Date(dateObj);
	endDate.setHours(23, 59, 59, 999);

	const startDateISO = startDate.toISOString();
	const endDateISO = endDate.toISOString();

	// Fetch commits for the date
	const commits = await getCommitsByDate(
		owner,
		repo,
		startDateISO,
		endDateISO,
		api,
	);

	// Filter commits that actually occurred on this date (not just in range)
	const commitsOnDate = commits.filter((commit) => {
		const commitDate = new Date(commit.commit.author.date);
		const commitDateStr = commitDate.toISOString().split("T")[0];
		return commitDateStr === date;
	});

	// Fetch stats for each commit (in parallel, but with rate limiting in mind)
	const statsPromises = commitsOnDate.map((commit) =>
		getCommitStats(owner, repo, commit.sha, api).catch(() => ({
			additions: 0,
			deletions: 0,
			total: 0,
		})),
	);

	const statsResults = await Promise.all(statsPromises);

	// Aggregate statistics
	const additions = statsResults.reduce(
		(sum, stats) => sum + stats.additions,
		0,
	);
	const deletions = statsResults.reduce(
		(sum, stats) => sum + stats.deletions,
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
