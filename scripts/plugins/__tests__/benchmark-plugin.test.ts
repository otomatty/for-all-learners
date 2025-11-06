/**
 * Benchmark Plugin Tests
 *
 * Unit tests for the benchmark-plugin command.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ scripts/plugins/benchmark-plugin.ts
 *   └─ vitest (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as loggerModule from "@/lib/logger";
import * as pluginLoaderModule from "@/lib/plugins/plugin-loader";
import * as manifestValidatorModule from "@/lib/plugins/plugin-loader/manifest-validator";
import { benchmarkPlugin } from "../benchmark-plugin";

// Mock fs operations
vi.mock("node:fs", () => {
	const mockExistsSync = vi.fn();
	const mockReadFileSync = vi.fn();
	return {
		existsSync: mockExistsSync,
		readFileSync: mockReadFileSync,
		default: {
			existsSync: mockExistsSync,
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
	},
}));

// Mock PluginLoader
vi.mock("@/lib/plugins/plugin-loader", () => ({
	PluginLoader: {
		getInstance: vi.fn(),
	},
}));

// Mock manifest validator
vi.mock("@/lib/plugins/plugin-loader/manifest-validator", () => ({
	validateManifest: vi.fn(),
}));

// Mock process.exit
const mockExit = vi.fn();
vi.stubGlobal("process", {
	...process,
	exit: mockExit,
});

describe("benchmarkPlugin", () => {
	let mockExistsSync: ReturnType<typeof vi.fn>;
	let mockReadFileSync: ReturnType<typeof vi.fn>;
	let infoSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;
	let warnSpy: ReturnType<typeof vi.spyOn>;
	let mockPluginLoader: {
		loadPlugin: ReturnType<typeof vi.fn>;
		unloadPlugin: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		const fsModule = await import("node:fs");
		mockExistsSync = vi.mocked(fsModule.existsSync);
		mockReadFileSync = vi.mocked(fsModule.readFileSync);
		infoSpy = vi.spyOn(loggerModule.default, "info") as unknown as ReturnType<
			typeof vi.spyOn
		>;
		errorSpy = vi.spyOn(loggerModule.default, "error") as unknown as ReturnType<
			typeof vi.spyOn
		>;
		warnSpy = vi.spyOn(loggerModule.default, "warn") as unknown as ReturnType<
			typeof vi.spyOn
		>;

		mockPluginLoader = {
			loadPlugin: vi.fn().mockResolvedValue(undefined),
			unloadPlugin: vi.fn().mockResolvedValue(undefined),
		};

		vi.mocked(pluginLoaderModule.PluginLoader.getInstance).mockReturnValue(
			mockPluginLoader as unknown as pluginLoaderModule.PluginLoader,
		);

		// Reset validateManifest mock to default behavior
		vi.mocked(manifestValidatorModule.validateManifest).mockImplementation(
			() => ({
				valid: true,
				errors: [],
				warnings: [],
			}),
		);

		vi.clearAllMocks();
		mockExit.mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("plugin directory", () => {
		it("should exit if plugin not found", async () => {
			// Mock existsSync to return false for all paths (plugin not found)
			mockExistsSync.mockImplementation(() => false);
			// Mock process.exit to prevent actual exit and stop execution
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(benchmarkPlugin("com.example.test-plugin")).rejects.toThrow(
				"process.exit called",
			);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					pluginId: "com.example.test-plugin",
				}),
				"Plugin not found",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
			// Should not try to read manifest when plugin not found
			expect(mockReadFileSync).not.toHaveBeenCalled();
		});
	});

	describe("benchmark execution", () => {
		beforeEach(() => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("src/index.ts")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify({
						id: "com.example.test-plugin",
						name: "Test Plugin",
						version: "1.0.0",
						description: "Test plugin description",
						author: "Test Author",
						main: "src/index.ts",
						extensionPoints: {
							editor: false,
							ai: false,
							ui: true,
							dataProcessor: false,
							integration: false,
						},
					});
				}
				if (path.includes("src/index.ts")) {
					return "export default async function activate() {}";
				}
				return "";
			});
			// Default successful plugin load for most tests
			mockPluginLoader.loadPlugin = vi.fn().mockResolvedValue({
				success: true,
				plugin: { id: "test-plugin" },
			});
			mockPluginLoader.unloadPlugin = vi.fn().mockResolvedValue(undefined);
		});

		it("should measure startup time", async () => {
			mockPluginLoader.loadPlugin = vi.fn().mockResolvedValue({
				success: true,
				plugin: { id: "test-plugin" },
			});
			mockPluginLoader.unloadPlugin = vi.fn().mockResolvedValue(undefined);

			await benchmarkPlugin("com.example.test-plugin");

			expect(mockPluginLoader.loadPlugin).toHaveBeenCalled();
			expect(mockPluginLoader.unloadPlugin).toHaveBeenCalled();
			expect(infoSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					startupTime: expect.stringContaining("ms"),
				}),
				"Startup time",
			);
		});

		it("should measure API call performance", async () => {
			await benchmarkPlugin("com.example.test-plugin");

			expect(infoSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					storageGet: expect.stringContaining("ms"),
					storageSet: expect.stringContaining("ms"),
					notification: expect.stringContaining("ms"),
				}),
				"API call performance",
			);
		});

		it("should measure memory usage", async () => {
			await benchmarkPlugin("com.example.test-plugin");

			expect(infoSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					heapUsed: expect.stringContaining("MB"),
					heapTotal: expect.stringContaining("MB"),
					rss: expect.stringContaining("MB"),
				}),
				"Memory usage",
			);
		});

		it("should log benchmark summary", async () => {
			await benchmarkPlugin("com.example.test-plugin");

			expect(infoSpy).toHaveBeenCalledWith("=== Benchmark Summary ===");
			expect(infoSpy).toHaveBeenCalledWith(
				expect.stringContaining("Startup Time:"),
			);
			expect(infoSpy).toHaveBeenCalledWith(
				expect.stringContaining("Memory Delta:"),
			);
		});

		it("should warn if startup time exceeds threshold", async () => {
			// Mock slow startup by returning a resolved promise after delay
			mockPluginLoader.loadPlugin = vi.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 1100));
				return {
					success: true,
					plugin: { id: "test-plugin" },
				};
			});

			await benchmarkPlugin("com.example.test-plugin");

			expect(warnSpy).toHaveBeenCalledWith(
				"Startup time exceeds 1 second - consider optimization",
			);
		});

		it("should handle errors during measurement", async () => {
			mockPluginLoader.loadPlugin = vi
				.fn()
				.mockRejectedValue(new Error("Load failed"));
			// Mock exit to prevent actual exit
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(benchmarkPlugin("com.example.test-plugin")).rejects.toThrow(
				"process.exit called",
			);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({ error: expect.any(Error) }),
				"Failed to measure startup time",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should handle failed plugin load (result.success = false)", async () => {
			mockPluginLoader.loadPlugin = vi.fn().mockResolvedValue({
				success: false,
				error: "Load failed",
			});
			// Mock exit to prevent actual exit
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(benchmarkPlugin("com.example.test-plugin")).rejects.toThrow(
				"process.exit called",
			);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({ result: expect.any(Object) }),
				"Failed to load plugin",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should handle failed plugin load (result.plugin = null)", async () => {
			mockPluginLoader.loadPlugin = vi.fn().mockResolvedValue({
				success: true,
				plugin: null,
			});
			// Mock exit to prevent actual exit
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(benchmarkPlugin("com.example.test-plugin")).rejects.toThrow(
				"process.exit called",
			);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({ result: expect.any(Object) }),
				"Failed to load plugin",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should handle invalid manifest file", async () => {
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return "invalid json {";
				}
				if (path.includes("src/index.ts")) {
					return "export default async function activate() {}";
				}
				return "";
			});

			await expect(
				benchmarkPlugin("com.example.test-plugin"),
			).rejects.toThrow();
		});

		it("should handle manifest validation failure", async () => {
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify({
						// Missing required fields (description, extensionPoints)
						id: "com.example.test-plugin",
						name: "Test Plugin",
						version: "1.0.0",
						author: "Test Author",
						main: "src/index.ts",
					});
				}
				if (path.includes("src/index.ts")) {
					return "export default async function activate() {}";
				}
				return "";
			});

			// Mock validateManifest to return invalid result
			const validateManifestSpy = vi.mocked(
				manifestValidatorModule.validateManifest,
			);
			validateManifestSpy.mockImplementation(() => ({
				valid: false,
				errors: ["Invalid manifest"],
				warnings: [],
			}));

			// Mock exit to prevent actual exit
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(benchmarkPlugin("com.example.test-plugin")).rejects.toThrow(
				"Invalid manifest",
			);
		});

		it("should handle missing plugin code file", async () => {
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify({
						id: "com.example.test-plugin",
						name: "Test Plugin",
						version: "1.0.0",
						description: "Test plugin description",
						author: "Test Author",
						main: "src/index.ts",
						extensionPoints: {
							editor: false,
							ai: false,
							ui: true,
							dataProcessor: false,
							integration: false,
						},
					});
				}
				throw new Error("File not found");
			});

			await expect(benchmarkPlugin("com.example.test-plugin")).rejects.toThrow(
				"File not found",
			);
		});

		it("should handle API call performance measurement errors", async () => {
			mockPluginLoader.loadPlugin = vi
				.fn()
				.mockResolvedValueOnce({
					success: true,
					plugin: { id: "test-plugin" },
				})
				.mockRejectedValueOnce(new Error("API measurement failed"));

			await benchmarkPlugin("com.example.test-plugin");

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({ error: expect.any(Error) }),
				"Failed to measure API call performance",
			);
		});

		it("should handle unloadPlugin errors", async () => {
			// Mock exit to prevent actual exit
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});
			mockPluginLoader.loadPlugin = vi.fn().mockResolvedValue({
				success: true,
				plugin: { id: "test-plugin" },
			});
			// unloadPlugin error in measureStartupTime causes it to return -1, triggering process.exit
			mockPluginLoader.unloadPlugin = vi
				.fn()
				.mockRejectedValue(new Error("Unload failed"));

			// unloadPlugin error causes measureStartupTime to return -1, which triggers process.exit
			await expect(benchmarkPlugin("com.example.test-plugin")).rejects.toThrow(
				"process.exit called",
			);

			expect(mockPluginLoader.unloadPlugin).toHaveBeenCalled();
			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({ error: expect.any(Error) }),
				"Failed to measure startup time",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should warn if memory usage exceeds threshold", async () => {
			// Mock multiple loadPlugin calls (for measureStartupTime and measureAPICallPerformance)
			mockPluginLoader.loadPlugin = vi.fn().mockResolvedValue({
				success: true,
				plugin: { id: "test-plugin" },
			});
			mockPluginLoader.unloadPlugin = vi.fn().mockResolvedValue(undefined);

			// Mock high memory delta
			const memoryUsageSpy = vi.spyOn(process, "memoryUsage");
			memoryUsageSpy
				.mockReturnValueOnce({
					heapUsed: 0,
					heapTotal: 0,
					rss: 0,
					external: 0,
					arrayBuffers: 0,
				} as NodeJS.MemoryUsage)
				.mockReturnValueOnce({
					heapUsed: 15 * 1024 * 1024, // 15MB
					heapTotal: 20 * 1024 * 1024,
					rss: 25 * 1024 * 1024,
					external: 0,
					arrayBuffers: 0,
				} as NodeJS.MemoryUsage);

			await benchmarkPlugin("com.example.test-plugin");

			expect(warnSpy).toHaveBeenCalledWith(
				"Memory usage exceeds 10MB - consider optimization",
			);

			memoryUsageSpy.mockRestore();
		});
	});

	describe("plugin directory finding", () => {
		it("should find plugin using kebab-case ID", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("com-example-test-plugin")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("src/index.ts")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify({
						id: "com.example.test-plugin",
						name: "Test Plugin",
						version: "1.0.0",
						description: "Test plugin description",
						author: "Test Author",
						main: "src/index.ts",
						extensionPoints: {
							editor: false,
							ai: false,
							ui: true,
							dataProcessor: false,
							integration: false,
						},
					});
				}
				if (path.includes("src/index.ts")) {
					return "export default async function activate() {}";
				}
				return "";
			});

			mockPluginLoader.loadPlugin = vi.fn().mockResolvedValue({
				success: true,
				plugin: { id: "com.example.test-plugin" },
			});

			await benchmarkPlugin("com.example.test-plugin");

			expect(mockPluginLoader.loadPlugin).toHaveBeenCalled();
		});

		it("should handle validateManifest throwing an error in isPluginManifest", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("src/index.ts")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					// Return invalid manifest structure to trigger isPluginManifest check
					return JSON.stringify({ invalid: true });
				}
				if (path.includes("src/index.ts")) {
					return "export default async function activate() {}";
				}
				return "";
			});

			// Mock validateManifest to throw an error on first call (in isPluginManifest)
			// and return invalid result on second call (in readManifest)
			const validateManifestSpy = vi.mocked(
				manifestValidatorModule.validateManifest,
			);
			let callCount = 0;
			validateManifestSpy.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// First call in isPluginManifest - throw error to cover catch block
					throw new Error("Validation error");
				}
				// Second call in readManifest - return invalid result
				return {
					valid: false,
					errors: ["Invalid manifest"],
					warnings: [],
				};
			});

			mockPluginLoader.loadPlugin = vi.fn().mockResolvedValue({
				success: true,
				plugin: { id: "com.example.test-plugin" },
			});

			// Should throw error from readManifest due to invalid manifest
			await expect(benchmarkPlugin("com.example.test-plugin")).rejects.toThrow(
				"Invalid manifest",
			);
		});
	});
});
