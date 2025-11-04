/**
 * Editor Extension Registry Tests
 *
 * Unit tests for the EditorExtensionRegistry class.
 */

import type { Extension } from "@tiptap/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EditorExtensionRegistry } from "../editor-registry";
import type { EditorExtensionOptions } from "../types";

// Mock Extension
const createMockExtension = (
	name: string,
	type: "node" | "mark" | "plugin" = "plugin",
): Extension => {
	const extension = {
		name,
		type,
	} as unknown as Extension;
	return extension;
};

describe("EditorExtensionRegistry", () => {
	let registry: EditorExtensionRegistry;

	const createMockExtensionOptions = (
		id: string,
		type: "node" | "mark" | "plugin" = "plugin",
	): EditorExtensionOptions => ({
		id,
		extension: createMockExtension(`extension-${id}`, type),
		type,
	});

	beforeEach(() => {
		registry = EditorExtensionRegistry.getInstance();
	});

	afterEach(() => {
		registry.clear();
		EditorExtensionRegistry.reset();
	});

	describe("Singleton Pattern", () => {
		it("should return the same instance", () => {
			const instance1 = EditorExtensionRegistry.getInstance();
			const instance2 = EditorExtensionRegistry.getInstance();

			expect(instance1).toBe(instance2);
		});
	});

	describe("register", () => {
		it("should register an extension", () => {
			const options = createMockExtensionOptions("test-extension-1", "plugin");

			registry.register("test-plugin", options);

			expect(registry.hasExtensions("test-plugin")).toBe(true);
			const extension = registry.getExtension(
				"test-plugin",
				"test-extension-1",
			);
			expect(extension).toBeDefined();
			expect(extension?.extensionId).toBe("test-extension-1");
			expect(extension?.pluginId).toBe("test-plugin");
		});

		it("should throw error when registering duplicate extension ID", () => {
			const options = createMockExtensionOptions("test-extension-1", "plugin");

			registry.register("test-plugin", options);

			expect(() => registry.register("test-plugin", options)).toThrow(
				"Extension test-extension-1 already registered for plugin test-plugin",
			);
		});

		it("should allow same extension ID for different plugins", () => {
			const options = createMockExtensionOptions("test-extension-1", "plugin");

			registry.register("test-plugin-1", options);
			registry.register("test-plugin-2", options);

			expect(registry.hasExtensions("test-plugin-1")).toBe(true);
			expect(registry.hasExtensions("test-plugin-2")).toBe(true);
		});

		it("should validate extension type", () => {
			const invalidOptions = {
				id: "test-extension",
				extension: createMockExtension("test"),
				type: "invalid-type",
			} as unknown as EditorExtensionOptions;

			expect(() => registry.register("test-plugin", invalidOptions)).toThrow(
				"Invalid extension type",
			);
		});
	});

	describe("unregister", () => {
		it("should unregister a specific extension", () => {
			const options1 = createMockExtensionOptions("extension-1", "plugin");
			const options2 = createMockExtensionOptions("extension-2", "mark");

			registry.register("test-plugin", options1);
			registry.register("test-plugin", options2);

			const result = registry.unregister("test-plugin", "extension-1");

			expect(result).toBe(true);
			expect(registry.hasExtensions("test-plugin")).toBe(true);
			expect(
				registry.getExtension("test-plugin", "extension-1"),
			).toBeUndefined();
			expect(registry.getExtension("test-plugin", "extension-2")).toBeDefined();
		});

		it("should unregister all extensions for a plugin", () => {
			const options1 = createMockExtensionOptions("extension-1", "plugin");
			const options2 = createMockExtensionOptions("extension-2", "mark");

			registry.register("test-plugin", options1);
			registry.register("test-plugin", options2);

			const result = registry.unregister("test-plugin");

			expect(result).toBe(true);
			expect(registry.hasExtensions("test-plugin")).toBe(false);
		});

		it("should return false when unregistering non-existent extension", () => {
			const result = registry.unregister("test-plugin", "non-existent");

			expect(result).toBe(false);
		});
	});

	describe("getExtensions", () => {
		it("should get all extensions for a plugin", () => {
			const options1 = createMockExtensionOptions("extension-1", "plugin");
			const options2 = createMockExtensionOptions("extension-2", "mark");

			registry.register("test-plugin", options1);
			registry.register("test-plugin", options2);

			const extensions = registry.getExtensions("test-plugin");

			expect(extensions).toHaveLength(2);
			expect(extensions.map((e) => e.extensionId)).toContain("extension-1");
			expect(extensions.map((e) => e.extensionId)).toContain("extension-2");
		});

		it("should get all extensions when no plugin ID specified", () => {
			const options1 = createMockExtensionOptions("extension-1", "plugin");
			const options2 = createMockExtensionOptions("extension-2", "mark");

			registry.register("test-plugin-1", options1);
			registry.register("test-plugin-2", options2);

			const extensions = registry.getExtensions();

			expect(extensions).toHaveLength(2);
		});

		it("should return empty array for non-existent plugin", () => {
			expect(registry.getExtensions("non-existent")).toEqual([]);
		});
	});

	describe("getTiptapExtensions", () => {
		it("should get Tiptap Extension instances", () => {
			const options = createMockExtensionOptions("extension-1", "plugin");

			registry.register("test-plugin", options);

			const extensions = registry.getTiptapExtensions("test-plugin");

			expect(extensions).toHaveLength(1);
			expect(extensions[0]).toBeDefined();
		});

		it("should flatten array extensions", () => {
			const extension1 = createMockExtension("ext-1", "plugin");
			const extension2 = createMockExtension("ext-2", "mark");
			const options: EditorExtensionOptions = {
				id: "extension-array",
				extension: [extension1, extension2],
				type: "plugin",
			};

			registry.register("test-plugin", options);

			const extensions = registry.getTiptapExtensions("test-plugin");

			expect(extensions).toHaveLength(2);
		});
	});

	describe("getExtension", () => {
		it("should get extension by ID", () => {
			const options = createMockExtensionOptions("extension-1", "plugin");

			registry.register("test-plugin", options);

			const extension = registry.getExtension("test-plugin", "extension-1");

			expect(extension).toBeDefined();
			expect(extension?.extensionId).toBe("extension-1");
			expect(extension?.pluginId).toBe("test-plugin");
		});

		it("should return undefined for non-existent extension", () => {
			expect(
				registry.getExtension("test-plugin", "non-existent"),
			).toBeUndefined();
		});
	});

	describe("hasExtensions", () => {
		it("should return true when plugin has extensions", () => {
			const options = createMockExtensionOptions("extension-1", "plugin");

			registry.register("test-plugin", options);

			expect(registry.hasExtensions("test-plugin")).toBe(true);
		});

		it("should return false when plugin has no extensions", () => {
			expect(registry.hasExtensions("test-plugin")).toBe(false);
		});
	});

	describe("clearPlugin", () => {
		it("should clear all extensions for a plugin", () => {
			const options1 = createMockExtensionOptions("extension-1", "plugin");
			const options2 = createMockExtensionOptions("extension-2", "mark");

			registry.register("test-plugin", options1);
			registry.register("test-plugin", options2);

			registry.clearPlugin("test-plugin");

			expect(registry.hasExtensions("test-plugin")).toBe(false);
		});
	});

	describe("clear", () => {
		it("should clear all extensions", () => {
			const options1 = createMockExtensionOptions("extension-1", "plugin");
			const options2 = createMockExtensionOptions("extension-2", "mark");

			registry.register("test-plugin-1", options1);
			registry.register("test-plugin-2", options2);

			registry.clear();

			expect(registry.hasExtensions("test-plugin-1")).toBe(false);
			expect(registry.hasExtensions("test-plugin-2")).toBe(false);
		});
	});

	describe("getStats", () => {
		it("should return registry statistics", () => {
			const nodeOptions = createMockExtensionOptions("node-ext", "node");
			const markOptions = createMockExtensionOptions("mark-ext", "mark");
			const pluginOptions = createMockExtensionOptions("plugin-ext", "plugin");

			registry.register("test-plugin-1", nodeOptions);
			registry.register("test-plugin-1", markOptions);
			registry.register("test-plugin-2", pluginOptions);

			const stats = registry.getStats();

			expect(stats.totalPlugins).toBe(2);
			expect(stats.totalExtensions).toBe(3);
			expect(stats.extensionsByType.node).toBe(1);
			expect(stats.extensionsByType.mark).toBe(1);
			expect(stats.extensionsByType.plugin).toBe(1);
		});
	});
});
