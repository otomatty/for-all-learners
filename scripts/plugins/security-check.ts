/**
 * Security Check Command
 *
 * Checks plugin code for security issues, dangerous API usage, and sandbox violations.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ scripts/plugins/cli.ts
 *
 * Dependencies:
 *   └─ (none - uses static analysis)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import logger from "../../lib/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PLUGINS_DIR = join(__dirname, "../../plugins/examples");

/**
 * Find plugin directory
 */
function findPluginDir(pluginId: string): string | null {
	// Try exact match first
	const exactPath = join(PLUGINS_DIR, pluginId);
	if (existsSync(exactPath)) {
		return exactPath;
	}

	// Try kebab-case version
	const kebabId = pluginId.replace(/\./g, "-");
	const kebabPath = join(PLUGINS_DIR, kebabId);
	if (existsSync(kebabPath)) {
		return kebabPath;
	}

	return null;
}

/**
 * Dangerous patterns that should not be used in plugins
 */
const DANGEROUS_PATTERNS = [
	// Direct DOM access
	{
		pattern: /document\.(getElementById|querySelector|querySelectorAll)/g,
		message: "Direct DOM access is not allowed. Use Plugin API instead.",
	},
	{
		pattern: /window\.(location|localStorage|sessionStorage)/g,
		message: "Direct window access is not allowed. Use Plugin API instead.",
	},

	// Worker escape attempts
	{
		pattern: /self\.importScripts/g,
		message: "importScripts is not allowed in plugin workers.",
	},
	{
		pattern: /new\s+Worker\(/g,
		message: "Creating new Workers is not allowed.",
	},

	// Network access (should use Integration API)
	{
		pattern: /fetch\(/g,
		message: "Direct fetch() calls should use Integration API.",
	},
	{
		pattern: /XMLHttpRequest/g,
		message: "XMLHttpRequest is not allowed. Use Integration API instead.",
	},

	// File system access
	{
		pattern: /require\(['"]fs['"]\)/g,
		message: "File system access is not allowed.",
	},
	{
		pattern: /require\(['"]path['"]\)/g,
		message: "Path module access is restricted. Use Plugin API instead.",
	},

	// eval-like functions
	{
		pattern: /eval\(/g,
		message: "eval() is not allowed for security reasons.",
	},
	{
		pattern: /Function\(/g,
		message: "Function() constructor is not allowed for security reasons.",
	},
	{
		pattern: /new\s+Function\(/g,
		message: "Creating functions dynamically is not allowed.",
	},

	// Database access
	{
		pattern: /require\(['"]sqlite3['"]\)/g,
		message: "Direct database access is not allowed. Use Plugin API instead.",
	},
];

/**
 * Check for dangerous API usage
 */
function checkDangerousAPIs(pluginDir: string): {
	valid: boolean;
	issues: Array<{ file: string; line: number; message: string }>;
} {
	const issues: Array<{ file: string; line: number; message: string }> = [];
	const srcDir = join(pluginDir, "src");

	if (!existsSync(srcDir)) {
		return { valid: true, issues: [] };
	}

	// Read all TypeScript/JavaScript files
	const files = readdirSync(srcDir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.filter((entry) => entry.name.endsWith(".ts") || entry.name.endsWith(".js"))
		.map((entry) => join(srcDir, entry.name));

	for (const file of files) {
		try {
			const content = readFileSync(file, "utf-8");
			const _lines = content.split("\n");

			for (const { pattern, message } of DANGEROUS_PATTERNS) {
				let match: RegExpExecArray | null = null;
				while (true) {
					match = pattern.exec(content);
					if (match === null) {
						break;
					}
					const lineNumber = content
						.substring(0, match.index)
						.split("\n").length;
					const relativePath = file.replace(`${pluginDir}/`, "");
					issues.push({
						file: relativePath,
						line: lineNumber,
						message,
					});
				}
			}
		} catch (error) {
			logger.warn({ file, error }, "Failed to read file for security check");
		}
	}

	return {
		valid: issues.length === 0,
		issues,
	};
}

/**
 * Type guard for package.json structure
 */
function isPackageJson(value: unknown): value is {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
} {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Check dependencies for known vulnerabilities
 */
async function checkDependencyVulnerabilities(pluginDir: string): Promise<{
	valid: boolean;
	vulnerabilities: string[];
}> {
	const packageJsonPath = join(pluginDir, "package.json");
	if (!existsSync(packageJsonPath)) {
		return { valid: true, vulnerabilities: [] };
	}

	try {
		const packageJsonContent = readFileSync(packageJsonPath, "utf-8");
		const parsed: unknown = JSON.parse(packageJsonContent);

		// Type guard for package.json structure
		if (!isPackageJson(parsed)) {
			logger.warn("Invalid package.json structure");
			return { valid: true, vulnerabilities: [] };
		}

		const packageJson = parsed;

		// In a real implementation, this would call npm audit or similar
		// For now, we just check for known problematic packages
		const knownVulnerablePackages: string[] = [];

		const allDeps = {
			...packageJson.dependencies,
			...packageJson.devDependencies,
		};

		// Check for packages with known vulnerabilities
		// This is a simplified check - in production, use npm audit
		for (const [pkg, version] of Object.entries(allDeps)) {
			// Example: check for very old versions that might have vulnerabilities
			if (pkg.includes("lodash") && version.startsWith("3.")) {
				knownVulnerablePackages.push(
					`${pkg}@${version} (known vulnerabilities)`,
				);
			}
		}

		return {
			valid: knownVulnerablePackages.length === 0,
			vulnerabilities: knownVulnerablePackages,
		};
	} catch (error) {
		logger.warn({ error }, "Failed to check dependencies");
		return { valid: true, vulnerabilities: [] };
	}
}

/**
 * Run security check
 */
export async function securityCheck(pluginId: string): Promise<void> {
	logger.info({ pluginId }, "Running security check");

	// Find plugin directory
	const pluginDir = findPluginDir(pluginId);
	if (!pluginDir) {
		logger.error({ pluginId, searchDir: PLUGINS_DIR }, "Plugin not found");
		process.exit(1);
	}

	logger.info({ pluginDir }, "Plugin directory");

	// Check for dangerous API usage
	logger.info("Checking for dangerous API usage...");
	const apiCheck = checkDangerousAPIs(pluginDir);
	if (!apiCheck.valid) {
		logger.error({ issues: apiCheck.issues }, "Security issues found");
		for (const issue of apiCheck.issues) {
			logger.error(
				{
					file: issue.file,
					line: issue.line,
					message: issue.message,
				},
				"Security issue",
			);
		}
		process.exit(1);
	}
	logger.info("No dangerous API usage detected");

	// Check dependencies
	logger.info("Checking dependencies for vulnerabilities...");
	const depCheck = await checkDependencyVulnerabilities(pluginDir);
	if (!depCheck.valid) {
		logger.warn(
			{ vulnerabilities: depCheck.vulnerabilities },
			"Potential vulnerabilities found",
		);
		// Don't exit - warnings only
	} else {
		logger.info("No known vulnerabilities in dependencies");
	}

	logger.info("Security check completed");
}
