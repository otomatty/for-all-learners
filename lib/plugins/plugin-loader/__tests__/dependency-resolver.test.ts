/**
 * Dependency Resolver Tests
 *
 * Unit tests for the dependency resolver.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PluginManifest } from "@/types/plugin";
import { getPluginRegistry } from "../../plugin-registry";
import { resolveDependencies } from "../dependency-resolver";

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

describe("resolveDependencies", () => {
	beforeEach(() => {
		getPluginRegistry().clear();
	});

	afterEach(() => {
		getPluginRegistry().clear();
	});

	describe("Plugins without dependencies", () => {
		it("should return empty missing dependencies for plugin without dependencies", () => {
			const manifest = createMockManifest();
			const result = resolveDependencies(manifest);

			expect(result.missingDependencies).toHaveLength(0);
			expect(result.loadOrder).toEqual([manifest.id]);
			expect(result.circularDependencies).toHaveLength(0);
		});

		it("should return empty missing dependencies when dependencies is undefined", () => {
			const manifest = createMockManifest({ dependencies: undefined });
			const result = resolveDependencies(manifest);

			expect(result.missingDependencies).toHaveLength(0);
		});
	});

	describe("Plugins with dependencies", () => {
		it("should detect missing dependency", () => {
			const manifest = createMockManifest({
				dependencies: {
					"required-plugin": "^1.0.0",
				},
			});
			const result = resolveDependencies(manifest);

			expect(result.missingDependencies).toHaveLength(1);
			expect(result.missingDependencies[0]).toEqual({
				pluginId: manifest.id,
				requiredPlugin: "required-plugin",
				requiredVersion: "^1.0.0",
			});
		});

		it("should detect multiple missing dependencies", () => {
			const manifest = createMockManifest({
				dependencies: {
					"plugin-a": "^1.0.0",
					"plugin-b": "^2.0.0",
					"plugin-c": "^3.0.0",
				},
			});
			const result = resolveDependencies(manifest);

			expect(result.missingDependencies).toHaveLength(3);
			expect(result.missingDependencies.map((d) => d.requiredPlugin)).toEqual([
				"plugin-a",
				"plugin-b",
				"plugin-c",
			]);
		});

		it("should not detect missing dependency when dependency is loaded", () => {
			const registry = getPluginRegistry();
			const depManifest = createMockManifest({ id: "required-plugin" });

			// Register dependency plugin
			registry.register({
				manifest: depManifest,
				enabled: true,
				loadedAt: new Date(),
			} as any);

			const manifest = createMockManifest({
				dependencies: {
					"required-plugin": "^1.0.0",
				},
			});
			const result = resolveDependencies(manifest);

			expect(result.missingDependencies).toHaveLength(0);
		});

		it("should handle mixed present and missing dependencies", () => {
			const registry = getPluginRegistry();
			const depManifest = createMockManifest({ id: "plugin-a" });

			// Register only one dependency
			registry.register({
				manifest: depManifest,
				enabled: true,
				loadedAt: new Date(),
			} as any);

			const manifest = createMockManifest({
				dependencies: {
					"plugin-a": "^1.0.0",
					"plugin-b": "^2.0.0",
				},
			});
			const result = resolveDependencies(manifest);

			expect(result.missingDependencies).toHaveLength(1);
			expect(result.missingDependencies[0].requiredPlugin).toBe("plugin-b");
		});
	});

	describe("Load order", () => {
		it("should return plugin ID in loadOrder", () => {
			const manifest = createMockManifest();
			const result = resolveDependencies(manifest);

			expect(result.loadOrder).toEqual([manifest.id]);
		});

		it("should return plugin ID in loadOrder even with dependencies", () => {
			const manifest = createMockManifest({
				dependencies: {
					"required-plugin": "^1.0.0",
				},
			});
			const result = resolveDependencies(manifest);

			expect(result.loadOrder).toEqual([manifest.id]);
		});
	});

	describe("Circular dependencies", () => {
		it("should return empty circular dependencies (not implemented yet)", () => {
			const manifest = createMockManifest();
			const result = resolveDependencies(manifest);

			expect(result.circularDependencies).toHaveLength(0);
		});
	});
});
