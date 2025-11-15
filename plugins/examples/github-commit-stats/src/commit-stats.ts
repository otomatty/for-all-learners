/**
 * Commit Statistics Module for GitHub Commit Stats Plugin
 *
 * Provides functions to fetch and aggregate commit statistics from GitHub.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ plugins/examples/github-commit-stats/src/calendar-extension.ts
 *   ├─ plugins/examples/github-commit-stats/src/widget.ts
 *   ├─ plugins/examples/github-commit-stats/src/command.ts
 *   └─ plugins/examples/github-commit-stats/src/index.ts
 *
 * Dependencies:
 *   └─ ./github-api.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import type { GitHubAPIResponse } from "./github-api";
import { isPlainObject } from "./github-api";

/**
 * Call GitHub API function type
 */
export type CallGitHubAPI = (options: {
	method?: string;
	url: string;
	query?: Record<string, string>;
	headers?: Record<string, string>;
	body?: unknown;
	timeout?: number;
	useProxy?: boolean;
}) => Promise<GitHubAPIResponse | null>;

/**
 * Daily commit statistics for a single repository
 */
export interface DailyRepoCommitStats {
	date: string;
	commits: number;
	additions: number;
	deletions: number;
	netLines: number;
	repo: string;
}

/**
 * Daily commit statistics for multiple repositories
 */
export interface MultiRepoCommitStats {
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
}

/**
 * Get daily commit lines for a single repository
 *
 * @param owner Repository owner
 * @param repo Repository name
 * @param date Date string (YYYY-MM-DD)
 * @param callGitHubAPI Function to call GitHub API
 * @returns Daily commit statistics
 */
export async function getDailyCommitLinesForRepo(
	owner: string,
	repo: string,
	date: string,
	callGitHubAPI: CallGitHubAPI,
): Promise<DailyRepoCommitStats> {
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
		const commitsResponse = await callGitHubAPI({
			method: "GET",
			url: `/repos/${owner}/${repo}/commits`,
			query: {
				since: startDateISO,
				until: endDateISO,
				per_page: "100",
			},
		});

		if (!commitsResponse || commitsResponse.status !== 200) {
			return {
				date,
				commits: 0,
				additions: 0,
				deletions: 0,
				netLines: 0,
				repo: `${owner}/${repo}`,
			};
		}

		const commits = Array.isArray(commitsResponse.data)
			? (commitsResponse.data as Array<Record<string, unknown>>)
			: [];

		// Filter commits that actually occurred on this date
		const commitsOnDate = commits.filter((commit) => {
			if (!isPlainObject(commit)) {
				return false;
			}
			const commitData = commit.commit;
			if (!isPlainObject(commitData)) {
				return false;
			}
			const author = commitData.author;
			if (!isPlainObject(author)) {
				return false;
			}
			const commitDateStr = author.date;
			if (typeof commitDateStr !== "string") {
				return false;
			}
			const commitDate = new Date(commitDateStr);
			const commitDateStrFormatted = commitDate.toISOString().split("T")[0];
			return commitDateStrFormatted === date;
		});

		// Fetch stats for each commit sequentially (one at a time)
		const statsResults: Array<{
			additions: number;
			deletions: number;
			total: number;
		}> = [];

		for (const commit of commitsOnDate) {
			try {
				if (!isPlainObject(commit) || typeof commit.sha !== "string") {
					statsResults.push({ additions: 0, deletions: 0, total: 0 });
					continue;
				}

				const statsResponse = await callGitHubAPI({
					method: "GET",
					url: `/repos/${owner}/${repo}/commits/${commit.sha}`,
				});

				if (
					statsResponse &&
					statsResponse.status === 200 &&
					isPlainObject(statsResponse.data) &&
					isPlainObject(statsResponse.data.stats)
				) {
					const stats = statsResponse.data.stats;
					statsResults.push({
						additions:
							typeof stats.additions === "number" ? stats.additions : 0,
						deletions:
							typeof stats.deletions === "number" ? stats.deletions : 0,
						total: typeof stats.total === "number" ? stats.total : 0,
					});
				} else {
					statsResults.push({ additions: 0, deletions: 0, total: 0 });
				}
			} catch {
				statsResults.push({ additions: 0, deletions: 0, total: 0 });
			}
		}

		// Aggregate statistics
		const additions = statsResults.reduce(
			(sum: number, stats) => sum + (stats.additions || 0),
			0,
		);
		const deletions = statsResults.reduce(
			(sum: number, stats) => sum + (stats.deletions || 0),
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

/**
 * Get daily commit lines for multiple repositories
 *
 * @param repos Array of repository names in format "owner/repo"
 * @param date Date string (YYYY-MM-DD)
 * @param callGitHubAPI Function to call GitHub API
 * @returns Aggregated commit statistics across all repositories
 */
export async function getMultiRepoCommitLines(
	repos: string[],
	date: string,
	callGitHubAPI: CallGitHubAPI,
): Promise<MultiRepoCommitStats> {
	// Fetch stats for all repositories sequentially (one at a time)
	const allStats: DailyRepoCommitStats[] = [];

	for (const repoFullName of repos) {
		const [owner, repo] = repoFullName.split("/");
		if (!owner || !repo) {
			allStats.push({
				date,
				commits: 0,
				additions: 0,
				deletions: 0,
				netLines: 0,
				repo: repoFullName,
			});
			continue;
		}
		const repoStats = await getDailyCommitLinesForRepo(
			owner,
			repo,
			date,
			callGitHubAPI,
		);
		allStats.push(repoStats);
	}

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
