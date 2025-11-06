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

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as loggerModule from "@/lib/logger";
import * as pluginLoaderModule from "@/lib/plugins/plugin-loader";
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
			mockPluginLoader as unknown as typeof mockPluginLoader,
		);

		vi.clearAllMocks();
		mockExit.mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("plugin directory", () => {
		it("should exit if plugin not found", async () => {
			mockExistsSync.mockReturnValue(false);

			await benchmarkPlugin("com.example.test-plugin");

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					pluginId: "com.example.test-plugin",
				}),
				"Plugin not found",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
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
						author: "Test Author",
						main: "src/index.ts",
					});
				}
				if (path.includes("src/index.ts")) {
					return "export default async function activate() {}";
				}
				return "";
			});
		});

		it("should measure startup time", async () => {
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
			// Mock slow startup
			mockPluginLoader.loadPlugin = vi.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 1100));
			});

			await benchmarkPlugin("com.example.test-plugin");

			expect(warnSpy).toHaveBeenCalledWith(
				"Startup time exceeds 1 second - consider optimization",
			);
		});

		it("should handle errors during measurement", async () => {
			mockPluginLoader.loadPlugin = vi.fn().mockRejectedValue(
				new Error("Load failed"),
			);

			await benchmarkPlugin("com.example.test-plugin");

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({ error: expect.any(Error) }),
				"Failed to measure startup time",
			);
		});
	});
});

