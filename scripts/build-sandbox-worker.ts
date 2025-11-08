/**
 * Build script for sandbox worker
 *
 * Converts sandbox-worker.ts to JavaScript and outputs it to public/workers/
 * This script should be run during the build process.
 *
 * Usage: bun run scripts/build-sandbox-worker.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..", "..");

const workerSourcePath = join(
	__dirname,
	"lib",
	"plugins",
	"plugin-loader",
	"sandbox-worker.ts",
);
const outputDir = join(__dirname, "public", "workers");
const outputPath = join(outputDir, "sandbox-worker.js");

function buildSandboxWorker(): void {
	console.log("Building sandbox worker...");

	// Read TypeScript source
	const source = readFileSync(workerSourcePath, "utf-8");

	// Simple TypeScript to JavaScript conversion
	// Remove TypeScript type annotations and interfaces
	const jsCode = source
		// Remove type annotations from function parameters
		.replace(/:\s*\{[^}]*\}/g, "")
		.replace(/:\s*string/g, "")
		.replace(/:\s*number/g, "")
		.replace(/:\s*boolean/g, "")
		.replace(/:\s*unknown\[\]/g, "")
		.replace(/:\s*unknown/g, "")
		.replace(/:\s*Promise<[^>]*>/g, "")
		.replace(/:\s*void/g, "")
		.replace(/:\s*Record<[^>]*>/g, "")
		.replace(/:\s*Map<[^>]*>/g, "")
		// Remove type annotations from variables
		.replace(/let\s+(\w+)\s*:\s*\{[^}]*\}\s*=/g, "let $1 =")
		.replace(/const\s+(\w+)\s*:\s*\{[^}]*\}\s*=/g, "const $1 =")
		// Remove as const
		.replace(/\s+as\s+const/g, "")
		// Remove @ts-expect-error comments (keep the comment content if needed)
		.replace(/\/\/\s*@ts-expect-error[^\n]*\n/g, "")
		// Remove TypeScript-specific syntax
		.replace(/as\s+unknown\s+as/g, "")
		.replace(/as\s+unknown/g, "")
		// Remove interface definitions
		.replace(/interface\s+\w+\s*\{[^}]*\}/g, "")
		// Remove type definitions
		.replace(/type\s+\w+\s*=\s*[^;]+;/g, "")
		// Clean up extra whitespace
		.replace(/\n\s*\n\s*\n/g, "\n\n");

	// Wrap in IIFE to match original format
	const wrappedCode = `(function() {
  'use strict';
  
${jsCode}
})();
`;

	// Ensure output directory exists
	mkdirSync(outputDir, { recursive: true });

	// Write JavaScript output
	writeFileSync(outputPath, wrappedCode, "utf-8");

	console.log(`✓ Sandbox worker built: ${outputPath}`);
}

buildSandboxWorker();
