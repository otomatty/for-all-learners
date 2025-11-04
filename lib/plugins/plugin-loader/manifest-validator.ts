/**
 * Manifest Validator
 *
 * Validates plugin manifests to ensure they meet requirements.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ lib/plugins/plugin-loader/plugin-loader.ts
 *
 * Dependencies:
 *   └─ types/plugin.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 */

import type { PluginManifest } from "@/types/plugin";
import type { PluginValidationResult } from "../types";

/**
 * Validate plugin manifest
 *
 * @param manifest Plugin manifest to validate
 * @returns Validation result
 */
export function validateManifest(
	manifest: PluginManifest,
): PluginValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Required fields
	if (!manifest.id || typeof manifest.id !== "string") {
		errors.push("manifest.id is required and must be a string");
	}

	if (!manifest.name || typeof manifest.name !== "string") {
		errors.push("manifest.name is required and must be a string");
	}

	if (!manifest.version || typeof manifest.version !== "string") {
		errors.push("manifest.version is required and must be a string");
	}

	if (!manifest.description || typeof manifest.description !== "string") {
		errors.push("manifest.description is required and must be a string");
	}

	if (!manifest.author || typeof manifest.author !== "string") {
		errors.push("manifest.author is required and must be a string");
	}

	if (!manifest.main || typeof manifest.main !== "string") {
		errors.push("manifest.main is required and must be a string");
	}

	// Extension points
	if (
		!manifest.extensionPoints ||
		typeof manifest.extensionPoints !== "object"
	) {
		errors.push("manifest.extensionPoints is required and must be an object");
	} else {
		const hasExtension = Object.values(manifest.extensionPoints).some(
			(v) => v === true,
		);
		if (!hasExtension) {
			warnings.push(
				"No extension points are enabled - plugin will not provide any functionality",
			);
		}
	}

	// Version format (basic semver check)
	if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
		warnings.push(
			"manifest.version should follow semantic versioning (e.g., 1.0.0)",
		);
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}
