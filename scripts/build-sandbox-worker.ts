/**
 * Build script for sandbox worker
 *
 * Converts sandbox-worker.ts to JavaScript and outputs it to public/workers/
 * This script should be run during the build process.
 *
 * Usage: bun run scripts/build-sandbox-worker.ts
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

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

async function buildSandboxWorker(): Promise<void> {
	console.log("Building sandbox worker...");

	try {
		// Use esbuild to properly transpile TypeScript to JavaScript
		const result = await build({
			entryPoints: [workerSourcePath],
			bundle: false, // Don't bundle, just transpile
			format: "iife", // Wrap in IIFE
			platform: "browser",
			target: "es2020",
			outfile: outputPath,
			write: false, // Get result in memory first
			minify: false, // Don't minify for debugging
			sourcemap: false,
			legalComments: "inline",
		});

		// Ensure output directory exists
		mkdirSync(outputDir, { recursive: true });

		// Write the transpiled code
		const output = result.outputFiles?.[0];
		if (!output) {
			throw new Error("No output file generated");
		}

		writeFileSync(outputPath, output.text, "utf-8");

		console.log(`✓ Sandbox worker built: ${outputPath}`);
	} catch (error) {
		console.error("Failed to build sandbox worker:", error);
		process.exit(1);
	}
}

buildSandboxWorker();
