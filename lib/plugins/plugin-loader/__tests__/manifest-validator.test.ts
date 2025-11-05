/**
 * Manifest Validator Tests
 *
 * Unit tests for the manifest validator.
 */

import { describe, expect, it } from "vitest";
import type { PluginManifest } from "@/types/plugin";
import { validateManifest } from "../manifest-validator";

const createMockManifest = (
	overrides?: Partial<PluginManifest>,
): PluginManifest => ({
	id: "test-plugin",
	name: "Test Plugin",
	version: "1.0.0",
	description: "A test plugin",
	author: "Test Author",
	main: "dist/index.js",
	extensionPoints: {
		editor: true,
	},
	...overrides,
});

describe("validateManifest", () => {
	describe("Valid manifests", () => {
		it("should validate correct manifest", () => {
			const manifest = createMockManifest();
			const result = validateManifest(manifest);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should validate manifest with valid semver version", () => {
			const manifest = createMockManifest({ version: "2.3.4" });
			const result = validateManifest(manifest);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should validate manifest with multiple extension points", () => {
			const manifest = createMockManifest({
				extensionPoints: {
					editor: true,
					ai: true,
					ui: false,
				},
			});
			const result = validateManifest(manifest);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe("Invalid manifests - missing required fields", () => {
		it("should detect missing id", () => {
			const manifest = createMockManifest({ id: "" });
			const result = validateManifest(manifest);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				"manifest.id is required and must be a string",
			);
		});

		it("should detect missing name", () => {
			const manifest = createMockManifest({ name: "" });
			const result = validateManifest(manifest);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				"manifest.name is required and must be a string",
			);
		});

		it("should detect missing version", () => {
			const manifest = createMockManifest({ version: "" });
			const result = validateManifest(manifest);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				"manifest.version is required and must be a string",
			);
		});

		it("should detect missing description", () => {
			const manifest = createMockManifest({ description: "" });
			const result = validateManifest(manifest);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				"manifest.description is required and must be a string",
			);
		});

		it("should detect missing author", () => {
			const manifest = createMockManifest({ author: "" });
			const result = validateManifest(manifest);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				"manifest.author is required and must be a string",
			);
		});

		it("should detect missing main", () => {
			const manifest = createMockManifest({ main: "" });
			const result = validateManifest(manifest);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				"manifest.main is required and must be a string",
			);
		});

		it("should detect missing extensionPoints", () => {
			const manifest = createMockManifest({ extensionPoints: undefined });
			const result = validateManifest(manifest);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				"manifest.extensionPoints is required and must be an object",
			);
		});

		it("should detect multiple missing fields", () => {
			const manifest = createMockManifest({ id: "", name: "", version: "" });
			const result = validateManifest(manifest);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(1);
		});
	});

	describe("Warnings", () => {
		it("should warn about no extension points enabled", () => {
			const manifest = createMockManifest({
				extensionPoints: {
					editor: false,
					ai: false,
					ui: false,
				},
			});
			const result = validateManifest(manifest);

			expect(result.valid).toBe(true);
			expect(result.warnings).toContain(
				"No extension points are enabled - plugin will not provide any functionality",
			);
		});

		it("should warn about invalid version format", () => {
			const manifest = createMockManifest({ version: "invalid" });
			const result = validateManifest(manifest);

			expect(result.valid).toBe(true);
			expect(result.warnings).toContain(
				"manifest.version should follow semantic versioning (e.g., 1.0.0)",
			);
		});

		it("should warn about version without patch number", () => {
			const manifest = createMockManifest({ version: "1.0" });
			const result = validateManifest(manifest);

			expect(result.valid).toBe(true);
			expect(result.warnings).toContain(
				"manifest.version should follow semantic versioning (e.g., 1.0.0)",
			);
		});

		it("should not warn about valid semver version", () => {
			const manifest = createMockManifest({ version: "1.2.3" });
			const result = validateManifest(manifest);

			expect(result.valid).toBe(true);
			expect(result.warnings).not.toContain(
				"manifest.version should follow semantic versioning (e.g., 1.0.0)",
			);
		});
	});
});
