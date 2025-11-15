/**
 * GitHub API Client for Commit Stats Plugin
 *
 * Provides type-safe GitHub API request handling with concurrency limiting.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ plugins/examples/github-commit-stats/src/commit-stats.ts
 *   └─ plugins/examples/github-commit-stats/src/index.ts
 *
 * Dependencies:
 *   ├─ ./concurrency.ts
 *   └─ Plugin API Integration (via parameter)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import type { ConcurrencyLimiter } from "./concurrency";

/**
 * Options for GitHub API requests
 */
export interface GitHubAPIRequestOptions {
	method?: string;
	url: string;
	query?: Record<string, string>;
	headers?: Record<string, string>;
	body?: unknown;
	timeout?: number;
	useProxy?: boolean;
}

/**
 * Normalized GitHub API response
 */
export interface GitHubAPIResponse {
	status: number;
	data?: unknown;
	headers?: Record<string, string>;
}

/**
 * Type guard to check if a value is a plain object
 */
export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/**
 * Type guard to check if a value is a record of strings
 */
export function isStringRecord(
	value: unknown,
): value is Record<string, string> {
	return (
		isPlainObject(value) &&
		Object.values(value).every((entry) => typeof entry === "string")
	);
}

/**
 * Normalize GitHub API response to a consistent format
 *
 * @param value Raw response from API
 * @returns Normalized response or null if invalid
 */
export function normalizeGitHubResponse(
	value: unknown,
): GitHubAPIResponse | null {
	if (!isPlainObject(value)) {
		return null;
	}

	const statusRaw = value.status;
	if (typeof statusRaw !== "number") {
		return null;
	}

	const headers = isStringRecord(value.headers) ? value.headers : undefined;

	let data: unknown;
	if ("data" in value) {
		data = value.data;
	} else if ("body" in value) {
		data = value.body;
	}

	return {
		status: statusRaw,
		data,
		headers,
	};
}

/**
 * Integration API interface (simplified for plugin context)
 */
interface IntegrationAPI {
	callExternalAPI: (
		apiId: string,
		options: GitHubAPIRequestOptions,
	) => Promise<unknown>;
}

/**
 * Create a GitHub API client with concurrency limiting
 *
 * @param limiter Concurrency limiter to control API call rate
 * @param integration Integration API instance
 * @returns Function to call GitHub API
 */
export function createGitHubAPIClient(
	limiter: ConcurrencyLimiter,
	integration: IntegrationAPI,
) {
	/**
	 * Call GitHub API with concurrency limiting
	 *
	 * @param options Request options
	 * @returns Normalized response or null on error
	 */
	return async function callGitHubAPI(
		options: GitHubAPIRequestOptions,
	): Promise<GitHubAPIResponse | null> {
		const rawResponse = await limiter.run(() =>
			integration.callExternalAPI("github-api", options),
		);
		return normalizeGitHubResponse(rawResponse);
	};
}
