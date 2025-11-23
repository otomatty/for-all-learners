/**
 * Version comparison utilities for plugins
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ hooks/plugins/useUpdatePlugin.ts
 *   └─ hooks/plugins/useInstalledPluginsWithUpdates.ts
 *
 * Dependencies (External files that this imports):
 *   └─ (none)
 *
 * Related Documentation:
 *   └─ PR #179: Plugin CRUD Migration
 */

/**
 * Compare two semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if v1 === v2
 */
export function compareVersions(v1: string, v2: string): number {
	const parts1 = v1.split(".").map(Number);
	const parts2 = v2.split(".").map(Number);

	// Ensure both arrays have same length
	const maxLength = Math.max(parts1.length, parts2.length);
	while (parts1.length < maxLength) parts1.push(0);
	while (parts2.length < maxLength) parts2.push(0);

	for (let i = 0; i < maxLength; i++) {
		if (parts1[i] > parts2[i]) return 1;
		if (parts1[i] < parts2[i]) return -1;
	}

	return 0;
}

/**
 * Check if an update is available for a plugin
 */
export function isUpdateAvailable(
	installedVersion: string,
	latestVersion: string,
): boolean {
	return compareVersions(latestVersion, installedVersion) > 0;
}
