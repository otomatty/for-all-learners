#!/usr/bin/env bun

/**
 * Prepare static export by temporarily disabling Route Handlers and API Routes
 * 
 * This script renames Route Handler and API Route files to .disabled extension
 * before static export build, then restores them after build.
 * 
 * Usage:
 *   bun run scripts/prepare-static-export.ts prepare   # Before build
 *   bun run scripts/prepare-static-export.ts restore   # After build
 */

import { existsSync, renameSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROUTE_HANDLERS_TO_DISABLE = [
	"app/(protected)/notes/[slug]/new/route.ts",
	"app/(protected)/notes/default/new/route.ts",
	"app/api/ai/api-key/route.ts",
];

function findRouteFiles(dir: string, fileList: string[] = []): string[] {
	if (!existsSync(dir)) {
		return fileList;
	}

	const files = readdirSync(dir);

	for (const file of files) {
		const filePath = join(dir, file);
		
		// Skip node_modules and .next directories
		if (file === "node_modules" || file === ".next" || file.startsWith(".")) {
			continue;
		}

		const stat = statSync(filePath);

		if (stat.isDirectory()) {
			findRouteFiles(filePath, fileList);
		} else if (file === "route.ts" || file === "route.js") {
			fileList.push(filePath);
		}
	}

	return fileList;
}

function prepare() {
	console.log("🔧 Preparing static export: Disabling Route Handlers and API Routes...");

	const allRouteFiles = findRouteFiles("app");
	const filesToDisable = allRouteFiles.filter((file) => {
		// Disable all API routes and route handlers except auth/callback
		// Auth callback is needed for Tauri OAuth flow
		const isAPIRoute = file.includes("/api/");
		const isRouteHandler = file.includes("/route.ts") || file.includes("/route.js");
		const isAuthCallback = file.includes("/auth/callback/route");
		
		return (isAPIRoute || isRouteHandler) && !isAuthCallback;
	});

	let disabledCount = 0;
	for (const file of filesToDisable) {
		if (existsSync(file) && !file.endsWith(".disabled")) {
			const disabledFile = `${file}.disabled`;
			try {
				renameSync(file, disabledFile);
				console.log(`  ✓ Disabled: ${file}`);
				disabledCount++;
			} catch (error) {
				console.error(`  ✗ Failed to disable ${file}:`, error);
			}
		}
	}

	console.log(`✅ Disabled ${disabledCount} route files`);
}

function restore() {
	console.log("🔧 Restoring Route Handlers and API Routes...");

	const allRouteFiles = findRouteFiles("app");
	const filesToRestore = allRouteFiles.filter((file) => file.endsWith(".disabled"));

	for (const file of filesToRestore) {
		const originalFile = file.replace(".disabled", "");
		renameSync(file, originalFile);
		console.log(`  ✓ Restored: ${originalFile}`);
	}

	console.log(`✅ Restored ${filesToRestore.length} route files`);
}

const command = process.argv[2];

if (command === "prepare") {
	prepare();
} else if (command === "restore") {
	restore();
} else {
	console.error("Usage: bun run scripts/prepare-static-export.ts [prepare|restore]");
	process.exit(1);
}

