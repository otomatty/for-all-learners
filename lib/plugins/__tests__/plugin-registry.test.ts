/**
 * Plugin Registry Tests
 *
 * Unit tests for the PluginRegistry class.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LoadedPlugin, PluginManifest } from "@/types/plugin";
import { PluginRegistry } from "../plugin-registry";

describe("PluginRegistry", () => {
	let registry: PluginRegistry;

	// Sample plugin manifest
	const createMockManifest = (id: string): PluginManifest => ({
		id,
		name: `Test Plugin ${id}`,
		version: "1.0.0",
		description: "A test plugin",
		author: "Test Author",
		main: "dist/index.js",
		extensionPoints: {
			editor: true,
		},
	});

	// Sample loaded plugin
	const createMockPlugin = (id: string, enabled = true): LoadedPlugin => ({
		manifest: createMockManifest(id),
		enabled,
		loadedAt: new Date(),
	});

	beforeEach(() => {
		registry = PluginRegistry.getInstance();
	});

	afterEach(() => {
		registry.clear();
		PluginRegistry.reset();
	});

	describe("Singleton Pattern", () => {
		it("should return the same instance", () => {
			const instance1 = PluginRegistry.getInstance();
			const instance2 = PluginRegistry.getInstance();

			expect(instance1).toBe(instance2);
		});
	});

	describe("register", () => {
		it("should register a plugin", () => {
			const plugin = createMockPlugin("test-plugin-1");

			registry.register(plugin);

			expect(registry.has("test-plugin-1")).toBe(true);
			expect(registry.get("test-plugin-1")).toEqual(plugin);
		});

		it("should throw error when registering duplicate plugin", () => {
			const plugin = createMockPlugin("test-plugin-1");

			registry.register(plugin);

			expect(() => registry.register(plugin)).toThrow(
				"Plugin test-plugin-1 is already registered",
			);
		});
	});

	describe("unregister", () => {
		it("should unregister a plugin", () => {
			const plugin = createMockPlugin("test-plugin-1");

			registry.register(plugin);
			const result = registry.unregister("test-plugin-1");

			expect(result).toBe(true);
			expect(registry.has("test-plugin-1")).toBe(false);
		});

		it("should return false when unregistering non-existent plugin", () => {
			const result = registry.unregister("non-existent");

			expect(result).toBe(false);
		});
	});

	describe("get", () => {
		it("should get a plugin by ID", () => {
			const plugin = createMockPlugin("test-plugin-1");

			registry.register(plugin);

			expect(registry.get("test-plugin-1")).toEqual(plugin);
		});

		it("should return undefined for non-existent plugin", () => {
			expect(registry.get("non-existent")).toBeUndefined();
		});
	});

	describe("getAll", () => {
		it("should return all plugins", () => {
			const plugin1 = createMockPlugin("test-plugin-1");
			const plugin2 = createMockPlugin("test-plugin-2");

			registry.register(plugin1);
			registry.register(plugin2);

			const all = registry.getAll();

			expect(all).toHaveLength(2);
			expect(all).toContainEqual(plugin1);
			expect(all).toContainEqual(plugin2);
		});

		it("should return empty array when no plugins", () => {
			expect(registry.getAll()).toEqual([]);
		});
	});

	describe("getByExtensionPoint", () => {
		it("should filter plugins by extension point", () => {
			const editorPlugin = createMockPlugin("editor-plugin");
			const aiPlugin: LoadedPlugin = {
				manifest: {
					...createMockManifest("ai-plugin"),
					extensionPoints: { ai: true },
				},
				enabled: true,
				loadedAt: new Date(),
			};

			registry.register(editorPlugin);
			registry.register(aiPlugin);

			const editorPlugins = registry.getByExtensionPoint("editor");
			const aiPlugins = registry.getByExtensionPoint("ai");

			expect(editorPlugins).toHaveLength(1);
			expect(editorPlugins[0].manifest.id).toBe("editor-plugin");

			expect(aiPlugins).toHaveLength(1);
			expect(aiPlugins[0].manifest.id).toBe("ai-plugin");
		});
	});

	describe("getEnabled / getDisabled", () => {
		it("should filter by enabled state", () => {
			const enabled1 = createMockPlugin("enabled-1", true);
			const enabled2 = createMockPlugin("enabled-2", true);
			const disabled1 = createMockPlugin("disabled-1", false);

			registry.register(enabled1);
			registry.register(enabled2);
			registry.register(disabled1);

			expect(registry.getEnabled()).toHaveLength(2);
			expect(registry.getDisabled()).toHaveLength(1);
		});
	});

	describe("enable / disable / toggle", () => {
		it("should enable a plugin", () => {
			const plugin = createMockPlugin("test-plugin", false);

			registry.register(plugin);
			registry.enable("test-plugin");

			expect(registry.get("test-plugin")?.enabled).toBe(true);
		});

		it("should disable a plugin", () => {
			const plugin = createMockPlugin("test-plugin", true);

			registry.register(plugin);
			registry.disable("test-plugin");

			expect(registry.get("test-plugin")?.enabled).toBe(false);
		});

		it("should toggle plugin state", () => {
			const plugin = createMockPlugin("test-plugin", true);

			registry.register(plugin);

			expect(registry.toggle("test-plugin")).toBe(false);
			expect(registry.get("test-plugin")?.enabled).toBe(false);

			expect(registry.toggle("test-plugin")).toBe(true);
			expect(registry.get("test-plugin")?.enabled).toBe(true);
		});
	});

	describe("getStats", () => {
		it("should return registry statistics", () => {
			const plugin1 = createMockPlugin("plugin-1", true);
			const plugin2 = createMockPlugin("plugin-2", false);

			registry.register(plugin1);
			registry.register(plugin2);

			const stats = registry.getStats();

			expect(stats.totalPlugins).toBe(2);
			expect(stats.enabledPlugins).toBe(1);
			expect(stats.disabledPlugins).toBe(1);
			expect(stats.pluginsByExtensionPoint.editor).toBe(2);
		});
	});

	describe("Error Management", () => {
		it("should set and clear error", () => {
			const plugin = createMockPlugin("test-plugin");

			registry.register(plugin);
			registry.setError("test-plugin", "Test error");

			expect(registry.get("test-plugin")?.error).toBe("Test error");

			registry.clearError("test-plugin");

			expect(registry.get("test-plugin")?.error).toBeUndefined();
		});

		it("should get plugins with errors", () => {
			const plugin1 = createMockPlugin("plugin-1");
			const plugin2 = createMockPlugin("plugin-2");

			registry.register(plugin1);
			registry.register(plugin2);

			registry.setError("plugin-1", "Error 1");

			const withErrors = registry.getWithErrors();

			expect(withErrors).toHaveLength(1);
			expect(withErrors[0].manifest.id).toBe("plugin-1");
		});
	});
});
