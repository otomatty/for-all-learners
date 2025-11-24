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

function findDynamicPages(dir: string, fileList: string[] = []): string[] {
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
			// Check if directory name contains dynamic route pattern [param]
			if (file.includes("[") && file.includes("]")) {
				// This is a dynamic route directory
				findDynamicPages(filePath, fileList);
			} else {
				findDynamicPages(filePath, fileList);
			}
		} else if (file === "page.tsx" || file === "page.js") {
			// Check if parent directory is a dynamic route
			const parentDir = dir;
			if (parentDir.includes("[") && parentDir.includes("]")) {
				fileList.push(filePath);
			}
		}
	}

	return fileList;
}

function findServerActionFiles(dir: string, fileList: string[] = []): string[] {
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
			findServerActionFiles(filePath, fileList);
		} else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js") || file.endsWith(".jsx")) {
			// Check if file contains "use server"
			try {
				const content = readFileSync(filePath, "utf-8");
				if (content.includes('"use server"') || content.includes("'use server'")) {
					fileList.push(filePath);
				}
			} catch (error) {
				// Skip files that can't be read
			}
		}
	}

	return fileList;
}

function prepare() {
	console.log("🔧 Preparing static export: Disabling Route Handlers, API Routes, Server Actions, and dynamic pages...");

	// Disable Route Handlers and API Routes
	const allRouteFiles = findRouteFiles("app");
	const routeFilesToDisable = allRouteFiles.filter((file) => {
		// Disable all API routes and route handlers
		// Tauri environment uses Loopback Server for OAuth, so auth/callback route handler is not needed
		const isAPIRoute = file.includes("/api/");
		const isRouteHandler = file.includes("/route.ts") || file.includes("/route.js");
		
		return isAPIRoute || isRouteHandler;
	});

	let disabledCount = 0;
	for (const file of routeFilesToDisable) {
		if (existsSync(file) && !file.endsWith(".disabled")) {
			const disabledFile = `${file}.disabled`;
			try {
				renameSync(file, disabledFile);
				console.log(`  ✓ Disabled route: ${file}`);
				disabledCount++;
			} catch (error) {
				console.error(`  ✗ Failed to disable ${file}:`, error);
			}
		}
	}

	// Disable Server Actions (not supported in static export)
	console.log("🔧 Disabling Server Actions...");
	const serverActionFiles = findServerActionFiles("app/_actions");
	for (const file of serverActionFiles) {
		if (existsSync(file) && !file.endsWith(".disabled")) {
			const disabledFile = `${file}.disabled`;
			try {
				renameSync(file, disabledFile);
				console.log(`  ✓ Disabled Server Action: ${file}`);
				disabledCount++;
			} catch (error) {
				console.error(`  ✗ Failed to disable ${file}:`, error);
			}
		}
	}

	// Disable dynamic pages that cause errors in static export
	// Even with generateStaticParams() returning empty array, Next.js static export
	// requires these pages to be excluded if they use dynamic features
	const dynamicPagesToDisable = [
		"app/(protected)/decks/[deckId]/page.tsx",
		"app/(protected)/decks/[deckId]/audio/page.tsx",
		"app/(protected)/decks/[deckId]/ocr/page.tsx",
		"app/(protected)/decks/[deckId]/pdf/page.tsx",
		"app/(protected)/notes/[slug]/page.tsx",
		"app/(protected)/notes/[slug]/[id]/page.tsx",
		"app/(protected)/notes/[slug]/[id]/generate-cards/page.tsx",
		// Admin pages: Web app only, excluded from Tauri static export
		"app/admin/inquiries/[id]/page.tsx",
		"app/admin/users/[id]/page.tsx",
		// Note: These pages have generateStaticParams() but still cause errors
		// in static export because they use dynamic features (auth, user-specific data)
		// Admin pages are web-only and not needed in Tauri builds
	];

	for (const file of dynamicPagesToDisable) {
		if (existsSync(file) && !file.endsWith(".disabled")) {
			const disabledFile = `${file}.disabled`;
			try {
				renameSync(file, disabledFile);
				console.log(`  ✓ Disabled dynamic page: ${file}`);
				disabledCount++;
			} catch (error) {
				console.error(`  ✗ Failed to disable ${file}:`, error);
			}
		}
	}

	console.log(`✅ Disabled ${disabledCount} files`);
}

function restore() {
	console.log("🔧 Restoring Route Handlers, API Routes, and dynamic pages...");

	// Find all disabled files (both route files and page files)
	const allFiles: string[] = [];
	
	function findDisabledFiles(dir: string) {
		if (!existsSync(dir)) {
			return;
		}

		const files = readdirSync(dir);

		for (const file of files) {
			const filePath = join(dir, file);
			
			if (file === "node_modules" || file === ".next" || file.startsWith(".")) {
				continue;
			}

			const stat = statSync(filePath);

			if (stat.isDirectory()) {
				findDisabledFiles(filePath);
			} else if (file.endsWith(".disabled")) {
				allFiles.push(filePath);
			}
		}
	}

	findDisabledFiles("app");

	for (const file of allFiles) {
		const originalFile = file.replace(".disabled", "");
		try {
			renameSync(file, originalFile);
			console.log(`  ✓ Restored: ${originalFile}`);
		} catch (error) {
			console.error(`  ✗ Failed to restore ${file}:`, error);
		}
	}

	console.log(`✅ Restored ${allFiles.length} files`);
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

