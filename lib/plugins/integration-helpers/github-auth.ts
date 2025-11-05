/**
 * GitHub Authentication Helper
 *
 * Helper functions for managing GitHub OAuth authentication.
 * Handles token storage, retrieval, and refresh via Storage API.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ plugins/examples/github-commit-stats/src/index.ts (future)
 *
 * Dependencies:
 *   └─ lib/plugins/plugin-api.ts (StorageAPI, IntegrationAPI)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import type { IntegrationAPI, StorageAPI } from "../plugin-api";

// ============================================================================
// Types
// ============================================================================

/**
 * GitHub OAuth token data
 */
export interface GitHubTokenData {
	/** Access token */
	accessToken: string;
	/** Token type (usually "token") */
	tokenType: string;
	/** Scope (e.g., "repo", "public_repo") */
	scope?: string;
	/** Expiration timestamp (if available) */
	expiresAt?: number;
}

/**
 * GitHub OAuth token storage key
 */
const GITHUB_TOKEN_KEY = "github_oauth_token";

// ============================================================================
// GitHub Authentication Helpers
// ============================================================================

/**
 * Get stored GitHub access token
 *
 * @param storage Storage API instance
 * @returns Token data or null if not found
 */
export async function getGitHubToken(
	storage: StorageAPI,
): Promise<GitHubTokenData | null> {
	try {
		const tokenData = await storage.get<GitHubTokenData>(GITHUB_TOKEN_KEY);
		return tokenData || null;
	} catch (_error) {
		// If token retrieval fails, return null
		return null;
	}
}

/**
 * Save GitHub access token
 *
 * @param storage Storage API instance
 * @param tokenData Token data to save
 */
export async function saveGitHubToken(
	storage: StorageAPI,
	tokenData: GitHubTokenData,
): Promise<void> {
	await storage.set(GITHUB_TOKEN_KEY, tokenData);
}

/**
 * Delete stored GitHub access token
 *
 * @param storage Storage API instance
 */
export async function deleteGitHubToken(storage: StorageAPI): Promise<void> {
	await storage.delete(GITHUB_TOKEN_KEY);
}

/**
 * Check if GitHub token is valid (not expired)
 *
 * @param tokenData Token data to check
 * @returns True if token is valid, false otherwise
 */
export function isTokenValid(tokenData: GitHubTokenData | null): boolean {
	if (!tokenData) {
		return false;
	}

	// If no expiration, assume token is valid
	if (!tokenData.expiresAt) {
		return true;
	}

	// Check if token has expired
	const now = Date.now();
	return tokenData.expiresAt > now;
}

/**
 * Verify GitHub token by making a test API call
 *
 * @param api Integration API instance
 * @param tokenData Token data to verify
 * @returns True if token is valid, false otherwise
 */
export async function verifyGitHubToken(
	api: IntegrationAPI,
	tokenData: GitHubTokenData,
): Promise<boolean> {
	try {
		const response = await api.callExternalAPI(undefined, {
			method: "GET",
			url: "https://api.github.com/user",
			headers: {
				Authorization: `${tokenData.tokenType} ${tokenData.accessToken}`,
				Accept: "application/vnd.github.v3+json",
			},
		});

		return response.status === 200;
	} catch (_error) {
		return false;
	}
}

/**
 * Get or refresh GitHub token
 *
 * Checks if token exists and is valid. If expired or invalid, it is deleted.
 * Note: Token refresh logic is not implemented yet and would depend on OAuth flow.
 *
 * @param storage Storage API instance
 * @param api Integration API instance
 * @returns Valid token data or null
 */
export async function getOrRefreshGitHubToken(
	storage: StorageAPI,
	api: IntegrationAPI,
): Promise<GitHubTokenData | null> {
	const tokenData = await getGitHubToken(storage);

	if (!tokenData) {
		return null;
	}

	// Check if token is expired
	if (!isTokenValid(tokenData)) {
		// Token expired - delete it
		await deleteGitHubToken(storage);
		return null;
	}

	// Verify token is still valid by making a test API call
	const isValid = await verifyGitHubToken(api, tokenData);
	if (!isValid) {
		// Token invalid - delete it
		await deleteGitHubToken(storage);
		return null;
	}

	return tokenData;
}

/**
 * Register GitHub API with authentication
 *
 * Registers GitHub API in Integration API with token-based authentication.
 *
 * @param api Integration API instance
 * @param tokenData Token data for authentication
 * @returns API ID
 */
export async function registerGitHubAPI(
	api: IntegrationAPI,
	tokenData: GitHubTokenData,
): Promise<string> {
	const apiId = "github-api";

	try {
		await api.registerExternalAPI({
			id: apiId,
			name: "GitHub API",
			description: "GitHub REST API",
			baseUrl: "https://api.github.com",
			defaultHeaders: {
				Accept: "application/vnd.github.v3+json",
			},
			auth: {
				type: "bearer",
				token: tokenData.accessToken,
			},
		});

		return apiId;
	} catch (error) {
		// If already registered, unregister and re-register
		try {
			await api.unregisterExternalAPI(apiId);
			return await registerGitHubAPI(api, tokenData);
		} catch {
			throw error;
		}
	}
}
