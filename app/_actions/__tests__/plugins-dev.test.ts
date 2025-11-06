/**
 * Plugin Development Server Actions Tests
 *
 * Unit tests for the plugin development server actions.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ app/_actions/plugins-dev.ts
 *   ├─ lib/plugins/plugin-loader/plugin-loader.ts
 *   └─ lib/plugins/plugin-registry.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PluginLoader } from "@/lib/plugins/plugin-loader/plugin-loader";
import type { LoadedPlugin, PluginManifest } from "@/types/plugin";
import {
	getLocalPlugins,
	loadLocalPlugin,
	reloadLocalPlugin,
	unloadLocalPlugin,
} from "../plugins-dev";

// Mock fs operations
vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	const mockExistsSync = vi.fn();
	const mockReaddirSync = vi.fn();
	const mockReadFileSync = vi.fn();
	return {
		...actual,
		existsSync: mockExistsSync,
		readdirSync: mockReaddirSync,
		readFileSync: mockReadFileSync,
		default: {
			existsSync: mockExistsSync,
			readdirSync: mockReaddirSync,
			readFileSync: mockReadFileSync,
		},
	};
});

// Mock logger
vi.mock("@/lib/logger", () => ({
	default: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

// Mock plugin loader
vi.mock("@/lib/plugins/plugin-loader/plugin-loader", () => ({
	PluginLoader: {
		getInstance: vi.fn(),
	},
}));

// Mock plugin registry
vi.mock("@/lib/plugins/plugin-registry", () => ({
	getPluginRegistry: vi.fn(),
	PluginRegistry: {
		getInstance: vi.fn(),
		reset: vi.fn(),
	},
}));

// Mock manifest validator
vi.mock("@/lib/plugins/plugin-loader/manifest-validator", () => ({
	validateManifest: vi.fn(() => ({ valid: true, errors: [] })),
}));

describe("Plugin Development Server Actions", () => {
	let mockExistsSync: ReturnType<typeof vi.fn>;
	let mockReaddirSync: ReturnType<typeof vi.fn>;
	let mockReadFileSync: ReturnType<typeof vi.fn>;
	let mockPluginLoader: {
		loadPlugin: ReturnType<typeof vi.fn>;
		unloadPlugin: ReturnType<typeof vi.fn>;
	};
	let mockRegistry: {
		has: ReturnType<typeof vi.fn>;
		get: ReturnType<typeof vi.fn>;
		register: ReturnType<typeof vi.fn>;
		unregister: ReturnType<typeof vi.fn>;
	};

	const mockManifest: PluginManifest = {
		id: "com.example.test-plugin",
		name: "Test Plugin",
		version: "1.0.0",
		description: "A test plugin",
		author: "Test Author",
		main: "dist/index.js",
		extensionPoints: {
			editor: true,
		},
	};

	const mockPluginCode = `
		async function activate(api, config) {
			return {
				methods: {},
				dispose: async () => {},
			};
		}
		export default activate;
	`;

	beforeEach(async () => {
		const fsModule = await import("node:fs");
		mockExistsSync = vi.mocked(fsModule.existsSync) as ReturnType<typeof vi.fn>;
		mockReaddirSync = vi.mocked(fsModule.readdirSync) as ReturnType<
			typeof vi.fn
		>;
		mockReadFileSync = vi.mocked(fsModule.readFileSync) as ReturnType<
			typeof vi.fn
		>;

		mockRegistry = {
			has: vi.fn().mockReturnValue(false),
			get: vi.fn(),
			register: vi.fn(),
			unregister: vi.fn(),
		};

		mockPluginLoader = {
			loadPlugin: vi.fn().mockResolvedValue({
				success: true,
				plugin: {
					manifest: mockManifest,
					enabled: true,
					loadedAt: new Date(),
				} as LoadedPlugin,
			}),
			unloadPlugin: vi.fn().mockResolvedValue(undefined),
		};

		vi.mocked(PluginLoader.getInstance).mockReturnValue(
			mockPluginLoader as unknown as PluginLoader,
		);

		const { getPluginRegistry } = await import("@/lib/plugins/plugin-registry");
		vi.mocked(getPluginRegistry).mockReturnValue(
			mockRegistry as unknown as ReturnType<typeof getPluginRegistry>,
		);

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("getLocalPlugins", () => {
		it("should return empty array when plugins directory does not exist", async () => {
			mockExistsSync.mockReturnValue(false);

			const plugins = await getLocalPlugins();

			expect(plugins).toEqual([]);
		});

		it("should return local plugins from directory", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				return false;
			});

			mockReaddirSync.mockReturnValue([
				{ name: "com-example-test-plugin", isDirectory: () => true },
			] as Parameters<typeof mockReaddirSync.mockReturnValue>[0]);

			mockReadFileSync.mockReturnValue(JSON.stringify(mockManifest));

			mockRegistry.has.mockReturnValue(false);

			const plugins = await getLocalPlugins();

			expect(plugins).toHaveLength(1);
			expect(plugins[0]).toMatchObject({
				id: mockManifest.id,
				name: mockManifest.name,
				version: mockManifest.version,
			});
		});

		it("should mark plugin as loaded if registered", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				return false;
			});

			mockReaddirSync.mockReturnValue([
				{ name: "com-example-test-plugin", isDirectory: () => true },
			] as Parameters<typeof mockReaddirSync.mockReturnValue>[0]);

			mockReadFileSync.mockReturnValue(JSON.stringify(mockManifest));

			mockRegistry.has.mockReturnValue(true);
			mockRegistry.get.mockReturnValue({
				manifest: mockManifest,
				enabled: true,
			});

			const plugins = await getLocalPlugins();

			expect(plugins[0].isLoaded).toBe(true);
			expect(plugins[0].isEnabled).toBe(true);
		});

		it("should skip invalid plugin manifests", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				return false;
			});

			mockReaddirSync.mockReturnValue([
				{ name: "invalid-plugin", isDirectory: () => true },
			] as Parameters<typeof mockReaddirSync.mockReturnValue>[0]);

			// Invalid JSON
			mockReadFileSync.mockImplementation(() => {
				throw new Error("Invalid JSON");
			});

			const plugins = await getLocalPlugins();

			expect(plugins).toEqual([]);
		});

		it("should skip non-directory entries", async () => {
			mockExistsSync.mockReturnValue(true);

			mockReaddirSync.mockReturnValue([
				{ name: "file.txt", isDirectory: () => false },
			] as Parameters<typeof mockReaddirSync.mockReturnValue>[0]);

			const plugins = await getLocalPlugins();

			expect(plugins).toEqual([]);
		});
	});

	describe("loadLocalPlugin", () => {
		it("should load plugin from dist/index.js", async () => {
			// Mock findPluginDir to find the plugin
			mockExistsSync.mockImplementation((path: string) => {
				const normalizedPath = path.replace(/\\/g, "/");
				// Plugin directory (kebab-case)
				if (
					normalizedPath.includes("plugins/examples/com-example-test-plugin") &&
					normalizedPath.endsWith("com-example-test-plugin")
				) {
					return true;
				}
				// plugins/examples directory exists
				if (
					normalizedPath.includes("plugins/examples") &&
					!normalizedPath.includes("com-example")
				) {
					return true;
				}
				// Manifest file exists
				if (normalizedPath.includes("plugin.json")) {
					return true;
				}
				// dist/index.js exists
				if (normalizedPath.includes("dist/index.js")) {
					return true;
				}
				return false;
			});

			mockReaddirSync.mockReturnValue([
				{ name: "com-example-test-plugin", isDirectory: () => true },
			] as Parameters<typeof mockReaddirSync.mockReturnValue>[0]);

			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify(mockManifest);
				}
				if (path.includes("dist/index.js")) {
					return mockPluginCode;
				}
				return "";
			});

			mockRegistry.has.mockReturnValue(false);

			const result = await loadLocalPlugin("com.example.test-plugin");

			expect(result.success).toBe(true);
			expect(mockPluginLoader.loadPlugin).toHaveBeenCalledWith(
				mockManifest,
				mockPluginCode,
				expect.objectContaining({
					enableImmediately: true,
					requireSignature: false,
				}),
			);
		});

		it("should return error if plugin not found", async () => {
			mockExistsSync.mockReturnValue(false);

			const result = await loadLocalPlugin("non-existent-plugin");

			expect(result.success).toBe(false);
			expect(result.error).toContain("not found");
		});

		it("should return error if manifest not found", async () => {
			// Mock findPluginDir to find directory via kebab-case, but manifest doesn't exist
			mockExistsSync.mockImplementation((path: string) => {
				const normalizedPath = path.replace(/\\/g, "/");
				// Plugin directory (kebab-case) exists
				if (
					normalizedPath.includes("plugins/examples/com-example-test-plugin") &&
					normalizedPath.endsWith("com-example-test-plugin") &&
					!normalizedPath.includes("plugin.json")
				) {
					return true;
				}
				// plugins/examples directory exists
				if (
					normalizedPath.includes("plugins/examples") &&
					!normalizedPath.includes("com-example") &&
					!normalizedPath.includes("plugin.json")
				) {
					return true;
				}
				// manifest.json does NOT exist
				if (normalizedPath.includes("plugin.json")) {
					return false;
				}
				return false;
			});

			mockReaddirSync.mockReturnValue([
				{ name: "com-example-test-plugin", isDirectory: () => true },
			] as Parameters<typeof mockReaddirSync.mockReturnValue>[0]);

			const result = await loadLocalPlugin("com.example.test-plugin");

			expect(result.success).toBe(false);
			expect(result.error).toContain("Manifest not found");
		});

		it("should return error if plugin code not found", async () => {
			// Mock findPluginDir to find plugin directory, manifest exists, but code doesn't
			mockExistsSync.mockImplementation((path: string) => {
				const normalizedPath = path.replace(/\\/g, "/");
				// Plugin directory (kebab-case) exists
				if (
					normalizedPath.includes("plugins/examples/com-example-test-plugin") &&
					normalizedPath.endsWith("com-example-test-plugin") &&
					!normalizedPath.includes("plugin.json")
				) {
					return true;
				}
				// plugins/examples directory exists
				if (
					normalizedPath.includes("plugins/examples") &&
					!normalizedPath.includes("com-example") &&
					!normalizedPath.includes("plugin.json")
				) {
					return true;
				}
				// manifest.json exists
				if (normalizedPath.includes("plugin.json")) {
					return true;
				}
				// dist/index.js does NOT exist
				if (normalizedPath.includes("dist/index.js")) {
					return false;
				}
				// src/index.ts does NOT exist (manifest.main points to it)
				if (normalizedPath.includes("src/index.ts")) {
					return false;
				}
				return false;
			});

			mockReaddirSync.mockReturnValue([
				{ name: "com-example-test-plugin", isDirectory: () => true },
			] as Parameters<typeof mockReaddirSync.mockReturnValue>[0]);

			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify(mockManifest);
				}
				// Should not be called since code doesn't exist
				throw new Error("ENOENT: no such file");
			});

			const result = await loadLocalPlugin("com.example.test-plugin");

			expect(result.success).toBe(false);
			expect(result.error).toContain("Plugin code not found");
		});

		it("should unload existing plugin before loading", async () => {
			// Mock findPluginDir to find the plugin
			mockExistsSync.mockImplementation((path: string) => {
				const normalizedPath = path.replace(/\\/g, "/");
				if (
					normalizedPath.includes("plugins/examples/com-example-test-plugin") &&
					normalizedPath.endsWith("com-example-test-plugin") &&
					!normalizedPath.includes("plugin.json")
				) {
					return true;
				}
				if (
					normalizedPath.includes("plugins/examples") &&
					!normalizedPath.includes("com-example") &&
					!normalizedPath.includes("plugin.json")
				) {
					return true;
				}
				if (normalizedPath.includes("plugin.json")) {
					return true;
				}
				if (normalizedPath.includes("dist/index.js")) {
					return true;
				}
				return false;
			});

			mockReaddirSync.mockReturnValue([
				{ name: "com-example-test-plugin", isDirectory: () => true },
			] as Parameters<typeof mockReaddirSync.mockReturnValue>[0]);

			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify(mockManifest);
				}
				if (path.includes("dist/index.js")) {
					return mockPluginCode;
				}
				return "";
			});

			mockRegistry.has.mockReturnValue(true);

			await loadLocalPlugin("com.example.test-plugin");

			expect(mockPluginLoader.unloadPlugin).toHaveBeenCalledWith(
				"com.example.test-plugin",
			);
		});

		it("should handle loadPlugin errors", async () => {
			// Mock findPluginDir to find the plugin
			mockExistsSync.mockImplementation((path: string) => {
				const normalizedPath = path.replace(/\\/g, "/");
				if (
					normalizedPath.includes("plugins/examples/com-example-test-plugin") &&
					normalizedPath.endsWith("com-example-test-plugin") &&
					!normalizedPath.includes("plugin.json")
				) {
					return true;
				}
				if (
					normalizedPath.includes("plugins/examples") &&
					!normalizedPath.includes("com-example") &&
					!normalizedPath.includes("plugin.json")
				) {
					return true;
				}
				if (normalizedPath.includes("plugin.json")) {
					return true;
				}
				if (normalizedPath.includes("dist/index.js")) {
					return true;
				}
				return false;
			});

			mockReaddirSync.mockReturnValue([
				{ name: "com-example-test-plugin", isDirectory: () => true },
			] as Parameters<typeof mockReaddirSync.mockReturnValue>[0]);

			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify(mockManifest);
				}
				if (path.includes("dist/index.js")) {
					return mockPluginCode;
				}
				return "";
			});

			mockPluginLoader.loadPlugin.mockResolvedValue({
				success: false,
				error: "Load failed",
			});

			const result = await loadLocalPlugin("com.example.test-plugin");

			expect(result.success).toBe(false);
			expect(result.error).toBe("Load failed");
		});
	});

	describe("reloadLocalPlugin", () => {
		it("should unload and reload plugin", async () => {
			// Mock findPluginDir to find the plugin
			mockExistsSync.mockImplementation((path: string) => {
				const normalizedPath = path.replace(/\\/g, "/");
				if (
					normalizedPath.includes("plugins/examples/com-example-test-plugin") &&
					normalizedPath.endsWith("com-example-test-plugin") &&
					!normalizedPath.includes("plugin.json")
				) {
					return true;
				}
				if (
					normalizedPath.includes("plugins/examples") &&
					!normalizedPath.includes("com-example") &&
					!normalizedPath.includes("plugin.json")
				) {
					return true;
				}
				if (normalizedPath.includes("plugin.json")) {
					return true;
				}
				if (normalizedPath.includes("dist/index.js")) {
					return true;
				}
				return false;
			});

			mockReaddirSync.mockReturnValue([
				{ name: "com-example-test-plugin", isDirectory: () => true },
			] as Parameters<typeof mockReaddirSync.mockReturnValue>[0]);

			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify(mockManifest);
				}
				if (path.includes("dist/index.js")) {
					return mockPluginCode;
				}
				return "";
			});

			mockRegistry.has.mockReturnValue(true);
			// Mock unloadPlugin to succeed
			mockPluginLoader.unloadPlugin.mockResolvedValue(undefined);

			const result = await reloadLocalPlugin("com.example.test-plugin");

			expect(result.success).toBe(true);
			expect(mockPluginLoader.unloadPlugin).toHaveBeenCalledWith(
				"com.example.test-plugin",
			);
			expect(mockPluginLoader.loadPlugin).toHaveBeenCalled();
		});

		it("should handle unload errors gracefully", async () => {
			// Mock findPluginDir to find the plugin
			mockExistsSync.mockImplementation((path: string) => {
				const normalizedPath = path.replace(/\\/g, "/");
				if (
					normalizedPath.includes("plugins/examples/com-example-test-plugin") &&
					normalizedPath.endsWith("com-example-test-plugin") &&
					!normalizedPath.includes("plugin.json")
				) {
					return true;
				}
				if (
					normalizedPath.includes("plugins/examples") &&
					!normalizedPath.includes("com-example") &&
					!normalizedPath.includes("plugin.json")
				) {
					return true;
				}
				if (normalizedPath.includes("plugin.json")) {
					return true;
				}
				if (normalizedPath.includes("dist/index.js")) {
					return true;
				}
				return false;
			});

			mockReaddirSync.mockReturnValue([
				{ name: "com-example-test-plugin", isDirectory: () => true },
			] as Parameters<typeof mockReaddirSync.mockReturnValue>[0]);

			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify(mockManifest);
				}
				if (path.includes("dist/index.js")) {
					return mockPluginCode;
				}
				return "";
			});

			mockRegistry.has.mockReturnValue(true);
			mockPluginLoader.unloadPlugin.mockRejectedValue(
				new Error("Unload failed"),
			);

			const result = await reloadLocalPlugin("com.example.test-plugin");

			expect(result.success).toBe(false);
			expect(result.error).toContain("Unload failed");
		});
	});

	describe("unloadLocalPlugin", () => {
		it("should unload plugin", async () => {
			await unloadLocalPlugin("com.example.test-plugin");

			expect(mockPluginLoader.unloadPlugin).toHaveBeenCalledWith(
				"com.example.test-plugin",
			);
		});

		it("should return error on unload failure", async () => {
			mockPluginLoader.unloadPlugin.mockRejectedValue(
				new Error("Unload failed"),
			);

			const result = await unloadLocalPlugin("com.example.test-plugin");

			expect(result.success).toBe(false);
			expect(result.error).toBe("Unload failed");
		});
	});
});
