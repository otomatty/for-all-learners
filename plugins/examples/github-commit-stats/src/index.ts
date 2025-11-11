/**
 * GitHub Commit Stats Plugin
 *
 * This plugin displays GitHub commit statistics in the calendar and dashboard.
 *
 * Features:
 * - Calendar extension: Shows commit line counts in calendar cells
 * - Widget: Displays monthly commit statistics on dashboard
 * - Command: Inserts commit statistics into editor
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ Plugin loader system
 *
 * Dependencies:
 *   ├─ ./concurrency.ts
 *   ├─ ./github-api.ts
 *   ├─ ./commit-stats.ts
 *   ├─ ./calendar-extension.ts
 *   ├─ ./widget.ts
 *   ├─ ./command.ts
 *   └─ Plugin API (Calendar, UI, Integration, Storage, Editor, Notifications)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import { registerCalendarExtension } from "./calendar-extension";
import { registerCommand } from "./command";
import { createConcurrencyLimiter } from "./concurrency";
import { createGitHubAPIClient } from "./github-api";
import { registerWidget } from "./widget";

/**
 * Maximum concurrent GitHub API calls
 * Set to 1 to ensure sequential execution and avoid rate limiting
 */
const MAX_CONCURRENT_GITHUB_API_CALLS = 1;

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

	// Create concurrency limiter for GitHub API calls
	/**
	 * API requests are executed sequentially (one at a time) to avoid
	 * GitHub API rate limiting. Each request completes before the next one starts.
	 */
	const githubApiLimiter = createConcurrencyLimiter(
		MAX_CONCURRENT_GITHUB_API_CALLS,
	);

	// Create GitHub API client
	const callGitHubAPI = createGitHubAPIClient(
		githubApiLimiter,
		api.integration,
	);

	// Register calendar extension
	await registerCalendarExtension(api.calendar, selectedRepos, callGitHubAPI);

	// Register widget
	await registerWidget(api.ui, selectedRepos, callGitHubAPI);

	// Register command
	await registerCommand(
		api.ui,
		api.editor,
		api.notifications,
		selectedRepos,
		callGitHubAPI,
	);

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
