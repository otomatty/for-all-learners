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
 * Get daily commit lines for a specific date
 *
 * Fetches all commits for the date and calculates total additions, deletions, and net lines.
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
