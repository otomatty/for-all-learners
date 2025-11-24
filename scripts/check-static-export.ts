#!/usr/bin/env bun
/**
 * Static Export Compatibility Checker
 *
 * Checks for cookies() usage in pages/layouts that would break static export
 *
 * Usage:
 *   bun run scripts/check-static-export.ts
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

interface Issue {
	file: string;
	line: number;
	code: string;
	message: string;
}

const ISSUES: Issue[] = [];

/**
 * Check if a file uses cookies() without static export guard
 */
async function checkFile(filePath: string): Promise<void> {
	const content = await readFile(filePath, "utf-8");
	const lines = content.split("\n");

	// Check for cookies() usage
	const hasCookies = content.includes("cookies()");
	const hasCreateClient = content.includes("createClient()");
	const hasStaticExportCheck = content.includes("ENABLE_STATIC_EXPORT");

	// Skip if no cookies() or createClient() usage
	if (!hasCookies && !hasCreateClient) {
		return;
	}

	// Skip if static export check is present
	if (hasStaticExportCheck) {
		return;
	}

	// Find lines with cookies() or createClient()
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineNum = i + 1;

		// Check for direct cookies() usage
		if (line.includes("cookies()") && !line.includes("ENABLE_STATIC_EXPORT")) {
			ISSUES.push({
				file: filePath,
				line: lineNum,
				code: line.trim(),
				message:
					"cookies() usage detected without static export guard. Add: const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);",
			});
		}

		// Check for createClient() usage in pages/layouts (which uses cookies internally)
		// Note: API routes (/api/**/route.ts) are excluded as they don't run during static export
		if (
			line.includes("createClient()") &&
			!line.includes("ENABLE_STATIC_EXPORT") &&
			(filePath.includes("/page.tsx") ||
				filePath.includes("/layout.tsx") ||
				(filePath.includes("/route.ts") && !filePath.includes("/api/")))
		) {
			ISSUES.push({
				file: filePath,
				line: lineNum,
				code: line.trim(),
				message:
					"createClient() usage detected without static export guard. Add: const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);",
			});
		}
	}
}

/**
 * Recursively check directory
 */
async function checkDirectory(dirPath: string): Promise<void> {
	const entries = await readdir(dirPath, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = join(dirPath, entry.name);

		// Skip node_modules, .next, out, etc.
		if (
			entry.name.startsWith(".") ||
			entry.name === "node_modules" ||
			entry.name === ".next" ||
			entry.name === "out" ||
			entry.name === "dist"
		) {
			continue;
		}

		if (entry.isDirectory()) {
			await checkDirectory(fullPath);
		} else if (
			entry.isFile() &&
			(fullPath.endsWith(".tsx") || fullPath.endsWith(".ts"))
		) {
			// Only check app directory files
			if (fullPath.includes("/app/")) {
				await checkFile(fullPath);
			}
		}
	}
}

/**
 * Main function
 */
async function main() {
	console.log("🔍 Checking for static export compatibility issues...\n");

	const appDir = join(process.cwd(), "app");
	await checkDirectory(appDir);

	if (ISSUES.length === 0) {
		console.log("✅ No static export compatibility issues found!\n");
		process.exit(0);
	}

	console.log(`❌ Found ${ISSUES.length} potential issue(s):\n`);

	for (const issue of ISSUES) {
		console.log(`📄 ${issue.file}:${issue.line}`);
		console.log(`   ${issue.code}`);
		console.log(`   ⚠️  ${issue.message}\n`);
	}

	console.log(
		"💡 Tip: Add static export guard:\n   const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);\n   if (!isStaticExport) { /* use cookies() */ }\n",
	);

	process.exit(1);
}

main().catch((error) => {
	console.error("Error:", error);
	process.exit(1);
});
